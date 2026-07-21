/**
 * Controlled production Stop E2E (operator verification).
 * Uses admin clients + real n8n/worker. Not part of CI.
 *
 *   VIDEO_WORKER_URL=https://renderer.fenrik.chat/render \
 *   node --experimental-strip-types --import ./scripts/register-alias.mjs \
 *   scripts/controlled-stop-e2e.ts
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  cancelProductionRun,
  createProductionRun,
  getActiveProductionRun,
  reconcileProductionRun,
  setProductionRunStatus,
} from "@/lib/api/production-run-admin";
import {
  AUTOMATION_WORKFLOWS,
  sendN8nWebhook,
} from "@/lib/n8n/client";
import {
  computeProductionPlan,
  isPersistableProductionPlatform,
  normalizeProductionConfig,
  primaryPlatformForPlan,
  type ProductionPlan,
} from "@/lib/projects/productionRun";
import { getProjectForAdmin } from "@/lib/api/projects-admin";
import { planContentStrategy } from "@/lib/ai/workflows/planContentStrategy";
import { parseContentControls } from "@/lib/projects/contentControls";

const PROJECT_ID = "aabab9ff-9db4-4012-a53c-135e3bfea6cd";
const OBSERVE_MS = 3 * 60 * 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function jobCounts(runId: string): Promise<Record<string, number>> {
  const supabase = createSupabaseAdminClient();
  const { data: items } = await supabase
    .from("content_items")
    .select("id")
    .eq("project_id", PROJECT_ID)
    .eq("generation_metadata->>production_run_id", runId);
  const ids = (items ?? []).map((r) => r.id as string);
  if (ids.length === 0) return {};
  const { data: jobs } = await supabase
    .from("video_jobs")
    .select("status")
    .in("content_item_id", ids);
  const out: Record<string, number> = {};
  for (const j of jobs ?? []) {
    const s = String(j.status);
    out[s] = (out[s] ?? 0) + 1;
  }
  return out;
}

async function itemCounts(runId: string): Promise<Record<string, number>> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("production_run_items")
    .select("status")
    .eq("production_run_id", runId);
  const out: Record<string, number> = {};
  for (const row of data ?? []) {
    const s = String(row.status);
    out[s] = (out[s] ?? 0) + 1;
  }
  return out;
}

async function snapshot(label: string, runId: string): Promise<void> {
  const view = await reconcileProductionRun(runId);
  const jobs = await jobCounts(runId);
  const items = await itemCounts(runId);
  console.log(
    JSON.stringify(
      {
        label,
        at: new Date().toISOString(),
        run: view
          ? {
              id: view.id,
              status: view.status,
              generated: view.generatedTotal,
              failed: view.failedTotal,
              packageCount: view.packageCount,
              packagesRunning: view.packagesRunning,
            }
          : null,
        items,
        jobs,
      },
      null,
      2,
    ),
  );
}

async function clearActiveIfAny(): Promise<void> {
  const active = await getActiveProductionRun(PROJECT_ID);
  if (!active) {
    console.log("no active run to clear");
    return;
  }
  console.log("clearing active run", active.id, active.status);
  await cancelProductionRun(active.id, PROJECT_ID);
  await snapshot("after_clear_active", active.id);
}

async function startSmallRun(packageCount: number): Promise<string> {
  const project = await getProjectForAdmin(PROJECT_ID);
  if (!project) throw new Error("project missing");

  const controls = parseContentControls(project.publishing_rules);
  let config = normalizeProductionConfig({
    packageCount,
    platforms: ["tiktok", "instagram", "facebook", "youtube", "linkedin", "x"],
    multipliers: {
      tiktok: 1,
      instagram: 1,
      facebook: 1,
      youtube: 1,
      linkedin: 1.5,
      x: 5,
    },
    platformContentTypes: { ...controls.platformContentTypes },
  });
  const plan = computeProductionPlan(config);
  const { runId } = await createProductionRun(PROJECT_ID, config);

  const primary = primaryPlatformForPlan(plan);
  const persistable =
    (primary && isPersistableProductionPlatform(primary) ? primary : null) ??
    config.platforms.find(isPersistableProductionPlatform);
  if (!persistable) throw new Error("no persistable platform");
  const isVideo = plan.activeVideoPlatforms.includes(
    persistable as ProductionPlan["activeVideoPlatforms"][number],
  );

  const planned = await planContentStrategy({
    mode: "production_run",
    projectId: PROJECT_ID,
    productionRunId: runId,
    packageCount: plan.packageCount,
    platform: persistable,
    format: isVideo ? "reel" : "post",
    goalType: project.goal_type,
  });
  if (!planned.ok) {
    throw new Error(
      `planContentStrategy failed: ${planned.error ?? "unknown"} ${JSON.stringify(planned.validationErrors ?? [])}`,
    );
  }

  await sendN8nWebhook({
    workflow: AUTOMATION_WORKFLOWS.generateContentPackage,
    projectId: PROJECT_ID,
    payload: {
      production_run_id: runId,
      package_count: plan.packageCount,
    },
  });
  await setProductionRunStatus(runId, "running");
  return runId;
}

async function waitForFirstVideoActivity(
  runId: string,
  timeoutMs: number,
): Promise<{ generated: number; jobs: Record<string, number> }> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const view = await reconcileProductionRun(runId);
    const jobs = await jobCounts(runId);
    const generated = view?.generatedTotal ?? 0;
    const activeJobs = (jobs.queued ?? 0) + (jobs.processing ?? 0);
    console.log(
      `poll ${new Date().toISOString()} status=${view?.status} generated=${generated} failed=${view?.failedTotal} jobs=${JSON.stringify(jobs)}`,
    );
    if (generated >= 1 || activeJobs >= 1 || (jobs.completed ?? 0) >= 1) {
      return { generated, jobs };
    }
    if (
      view?.status === "completed" ||
      view?.status === "failed" ||
      view?.status === "cancelled"
    ) {
      throw new Error(
        `run ended before video activity: status=${view.status} generated=${generated} failed=${view.failedTotal}`,
      );
    }
    await sleep(20_000);
  }
  throw new Error("timeout waiting for first video activity");
}

async function main(): Promise<void> {
  if (!process.env.VIDEO_WORKER_URL?.includes("renderer.fenrik.chat")) {
    throw new Error(
      "Set VIDEO_WORKER_URL=https://renderer.fenrik.chat/render for production worker notify",
    );
  }

  console.log("=== controlled stop e2e ===");
  console.log("worker", process.env.VIDEO_WORKER_URL);
  console.log("commit expectation: origin/main 915b1a4 + stop fix 98cf5d0");

  await clearActiveIfAny();

  const runId = await startSmallRun(2);
  console.log("TEST_RUN_ID", runId);
  await snapshot("started", runId);

  const atStopReady = await waitForFirstVideoActivity(runId, 25 * 60 * 1000);
  const stopAt = new Date().toISOString();
  console.log("STOP_AT", stopAt);
  console.log("COUNT_AT_STOP", atStopReady);
  await snapshot("before_stop", runId);

  await cancelProductionRun(runId, PROJECT_ID);
  await snapshot("immediately_after_stop", runId);

  console.log(`observing ${OBSERVE_MS / 1000}s for late work…`);
  const observeStart = Date.now();
  let lastGenerated = (await reconcileProductionRun(runId))?.generatedTotal ?? 0;
  while (Date.now() - observeStart < OBSERVE_MS) {
    await sleep(30_000);
    const view = await reconcileProductionRun(runId);
    const jobs = await jobCounts(runId);
    const generated = view?.generatedTotal ?? 0;
    console.log(
      `observe ${new Date().toISOString()} status=${view?.status} generated=${generated} jobs=${JSON.stringify(jobs)}`,
    );
    if (generated > lastGenerated) {
      throw new Error(
        `generated_total rose after Stop: ${lastGenerated} -> ${generated}`,
      );
    }
    if ((jobs.queued ?? 0) > 0 || (jobs.processing ?? 0) > 0) {
      console.warn("open jobs still present during observe window", jobs);
    }
    lastGenerated = generated;
  }

  await snapshot("after_observe", runId);
  const finalView = await reconcileProductionRun(runId);
  if (finalView?.status !== "cancelled") {
    throw new Error(`expected cancelled, got ${finalView?.status}`);
  }
  const finalJobs = await jobCounts(runId);
  if ((finalJobs.queued ?? 0) > 0 || (finalJobs.processing ?? 0) > 0) {
    throw new Error(`open jobs remain after observe: ${JSON.stringify(finalJobs)}`);
  }

  console.log("=== second fresh run (1 package) ===");
  const run2 = await startSmallRun(1);
  console.log("SECOND_RUN_ID", run2);
  await snapshot("second_started", run2);
  const progress = await waitForFirstVideoActivity(run2, 25 * 60 * 1000);
  await snapshot("second_progress", run2);
  console.log("SECOND_RUN_PROGRESS", progress);
  console.log("CONTROLLED_STOP_E2E_OK");
}

main().catch((err) => {
  console.error("CONTROLLED_STOP_E2E_FAILED", err);
  process.exit(1);
});
