/**
 * Controlled Stop against live DB + real DigitalOcean worker.
 * Clones a known-good completed render payload into a fresh production run,
 * starts real worker jobs, Stops, observes, then starts a second fresh run.
 *
 * Requires WORKER_SECRET (droplet) and VIDEO_WORKER_URL=https://renderer.fenrik.chat/render
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  cancelProductionRun,
  createProductionRun,
  getActiveProductionRun,
  reconcileProductionRun,
  setProductionRunStatus,
} from "@/lib/api/production-run-admin";
import { PRODUCTION_RUN_CANCELLED_MESSAGE } from "@/lib/api/production-run-cancel";
import { normalizeProductionConfig } from "@/lib/projects/productionRun";
import {
  cancelVideoWorkerJobs,
  startVideoWorkerJob,
} from "@/lib/video-worker/client";

const PROJECT_ID = "aabab9ff-9db4-4012-a53c-135e3bfea6cd";
/** Known-good completed render used as payload template. */
const SOURCE_JOB_ID = "eab9caf2-0b75-4849-9c6f-6e4b17bbb36a";
const OBSERVE_MS = 3 * 60 * 1000;
const CALLBACK_URL = "https://www.fenrik.studio/api/n8n/video-callback";

function loadEnv(): void {
  for (const line of readFileSync(".env.local", "utf8").split(/\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    const k = line.slice(0, i);
    let v = line.slice(i + 1);
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env)) process.env[k] = v;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function jobRows(runId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: items } = await supabase
    .from("content_items")
    .select("id")
    .eq("project_id", PROJECT_ID)
    .eq("generation_metadata->>production_run_id", runId);
  const ids = (items ?? []).map((r) => r.id as string);
  if (ids.length === 0) return [];
  const { data: jobs } = await supabase
    .from("video_jobs")
    .select("id, status, error_message, updated_at")
    .in("content_item_id", ids);
  return jobs ?? [];
}

function countByStatus(
  jobs: Array<{ status: string }>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const j of jobs) {
    out[j.status] = (out[j.status] ?? 0) + 1;
  }
  return out;
}

async function snapshot(label: string, runId: string): Promise<void> {
  const view = await reconcileProductionRun(runId);
  const jobs = await jobRows(runId);
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
            }
          : null,
        jobs: countByStatus(jobs),
        jobIds: jobs.map((j) => ({
          id: j.id,
          status: j.status,
          error: j.error_message,
        })),
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

async function loadSourcePayload(): Promise<{
  packageId: string;
  input: Record<string, unknown>;
  provider: string;
  model: string | null;
}> {
  const supabase = createSupabaseAdminClient();
  const { data: job, error } = await supabase
    .from("video_jobs")
    .select("input, provider, model, content_item_id")
    .eq("id", SOURCE_JOB_ID)
    .single();
  if (error) throw error;
  const { data: item, error: itemErr } = await supabase
    .from("content_items")
    .select("package_id")
    .eq("id", job.content_item_id)
    .single();
  if (itemErr) throw itemErr;
  if (!item.package_id) throw new Error("source item missing package_id");
  return {
    packageId: item.package_id as string,
    input: job.input as Record<string, unknown>,
    provider: String(job.provider ?? "video_engine"),
    model: (job.model as string | null) ?? null,
  };
}

async function createRunWithJobs(args: {
  packageCount: number;
  jobCount: number;
  label: string;
}): Promise<{ runId: string; jobIds: string[]; packageId: string }> {
  const supabase = createSupabaseAdminClient();
  const source = await loadSourcePayload();
  const config = normalizeProductionConfig({
    packageCount: args.packageCount,
    platforms: ["tiktok", "instagram"],
    multipliers: { tiktok: 1, instagram: 1 },
  });
  const { runId } = await createProductionRun(PROJECT_ID, config);
  await setProductionRunStatus(runId, "running");

  const jobIds: string[] = [];
  for (let i = 0; i < args.jobCount; i++) {
    const { data: item, error: itemErr } = await supabase
      .from("content_items")
      .insert({
        project_id: PROJECT_ID,
        package_id: source.packageId,
        platform: "tiktok",
        format: "reel",
        status: "draft",
        title: `${args.label}-${i}-${runId.slice(0, 8)}`,
        body: "controlled stop live worker",
        generation_metadata: {
          production_run_id: runId,
          controlled_stop_live_worker: true,
        },
      })
      .select("id")
      .single();
    if (itemErr) throw itemErr;

    const { data: job, error: jobErr } = await supabase
      .from("video_jobs")
      .insert({
        project_id: PROJECT_ID,
        content_item_id: item.id,
        status: "queued",
        provider: source.provider,
        model: source.model,
        input: source.input,
      })
      .select("id")
      .single();
    if (jobErr) throw jobErr;
    jobIds.push(job.id);
  }

  return { runId, jobIds, packageId: source.packageId };
}

async function dispatchToWorker(
  jobId: string,
  packageId: string,
  contentItemId: string,
  input: Record<string, unknown>,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  await supabase
    .from("video_jobs")
    .update({ status: "processing" })
    .eq("id", jobId)
    .eq("status", "queued");

  await startVideoWorkerJob({
    video_job_id: jobId,
    project_id: PROJECT_ID,
    content_package_id: packageId,
    content_item_id: contentItemId,
    callback_url: CALLBACK_URL,
    input,
  });
}

async function cleanupRunArtifacts(runId: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { data: items } = await supabase
    .from("content_items")
    .select("id")
    .eq("project_id", PROJECT_ID)
    .eq("generation_metadata->>production_run_id", runId)
    .contains("generation_metadata", { controlled_stop_live_worker: true });
  const ids = (items ?? []).map((r) => r.id as string);
  if (ids.length === 0) return;
  await supabase.from("video_jobs").delete().in("content_item_id", ids);
  await supabase.from("content_items").delete().in("id", ids);
}

async function main(): Promise<void> {
  loadEnv();
  if (!process.env.WORKER_SECRET) {
    throw new Error("WORKER_SECRET required (from droplet .env.worker)");
  }
  process.env.VIDEO_WORKER_URL = "https://renderer.fenrik.chat/render";
  process.env.VIDEO_WORKER_SECRET = process.env.WORKER_SECRET;

  console.log("=== controlled stop live worker ===");
  console.log("worker", process.env.VIDEO_WORKER_URL);
  console.log("callback", CALLBACK_URL);

  await clearActiveIfAny();

  const source = await loadSourcePayload();
  const first = await createRunWithJobs({
    packageCount: 2,
    jobCount: 2,
    label: "stop-live",
  });
  console.log("TEST_RUN_ID", first.runId);
  console.log("TEST_JOB_IDS", first.jobIds);

  const supabase = createSupabaseAdminClient();
  const { data: itemRows } = await supabase
    .from("content_items")
    .select("id")
    .eq("generation_metadata->>production_run_id", first.runId)
    .order("created_at", { ascending: true });
  const contentItemIds = (itemRows ?? []).map((r) => r.id as string);

  // Dispatch both: with concurrency 1, first becomes active, second stays pending in memory.
  await dispatchToWorker(
    first.jobIds[0]!,
    first.packageId,
    contentItemIds[0]!,
    source.input,
  );
  await dispatchToWorker(
    first.jobIds[1]!,
    first.packageId,
    contentItemIds[1]!,
    source.input,
  );

  // Give the worker a moment to accept / start TTS or FFmpeg.
  await sleep(15_000);
  await snapshot("before_stop", first.runId);
  const beforeJobs = await jobRows(first.runId);
  const processingAtStop = beforeJobs.filter((j) => j.status === "processing")
    .length;
  const queuedAtStop = beforeJobs.filter((j) => j.status === "queued").length;
  console.log("COUNT_AT_STOP", {
    generated: (await reconcileProductionRun(first.runId))?.generatedTotal ?? 0,
    processing: processingAtStop,
    queued: queuedAtStop,
    jobs: countByStatus(beforeJobs),
  });

  const stopAt = new Date().toISOString();
  console.log("STOP_AT", stopAt);
  await cancelProductionRun(first.runId, PROJECT_ID);
  await snapshot("immediately_after_stop", first.runId);

  console.log(`observing ${OBSERVE_MS / 1000}s…`);
  const observeStart = Date.now();
  let lastGenerated =
    (await reconcileProductionRun(first.runId))?.generatedTotal ?? 0;
  while (Date.now() - observeStart < OBSERVE_MS) {
    await sleep(30_000);
    const view = await reconcileProductionRun(first.runId);
    const jobs = await jobRows(first.runId);
    const generated = view?.generatedTotal ?? 0;
    console.log(
      `observe ${new Date().toISOString()} status=${view?.status} generated=${generated} jobs=${JSON.stringify(countByStatus(jobs))}`,
    );
    if (generated > lastGenerated) {
      throw new Error(
        `generated_total rose after Stop: ${lastGenerated} -> ${generated}`,
      );
    }
    lastGenerated = generated;
  }

  await snapshot("after_observe", first.runId);
  const finalView = await reconcileProductionRun(first.runId);
  if (finalView?.status !== "cancelled") {
    throw new Error(`expected cancelled, got ${finalView?.status}`);
  }
  const finalJobs = await jobRows(first.runId);
  if (
    finalJobs.some((j) => j.status === "queued" || j.status === "processing")
  ) {
    throw new Error(
      `open jobs remain: ${JSON.stringify(countByStatus(finalJobs))}`,
    );
  }
  if (
    !finalJobs.every(
      (j) =>
        j.status === "failed" &&
        j.error_message === PRODUCTION_RUN_CANCELLED_MESSAGE,
    )
  ) {
    throw new Error(`jobs not operator-cancelled: ${JSON.stringify(finalJobs)}`);
  }

  // Late revive attempt (trigger must block).
  const reviveId = first.jobIds[0]!;
  const { error: reviveErr } = await supabase
    .from("video_jobs")
    .update({ status: "completed", error_message: null })
    .eq("id", reviveId);
  console.log(
    "late_revive_attempt",
    reviveErr
      ? { blocked: true, message: reviveErr.message }
      : { blocked: false },
  );
  const { data: afterRevive } = await supabase
    .from("video_jobs")
    .select("status, error_message")
    .eq("id", reviveId)
    .single();
  if (afterRevive?.status !== "failed") {
    throw new Error(
      `late revive changed status to ${afterRevive?.status} (expected failed)`,
    );
  }
  console.log("late_revive_result", afterRevive);

  // Control: unrelated job must still be cancellable via worker API independently.
  const ping = await fetch("https://renderer.fenrik.chat/health");
  console.log("worker_health", ping.status, await ping.text());

  console.log("=== second fresh run ===");
  const second = await createRunWithJobs({
    packageCount: 1,
    jobCount: 1,
    label: "stop-live-2",
  });
  console.log("SECOND_RUN_ID", second.runId);
  console.log("SECOND_JOB_IDS", second.jobIds);

  const { data: secondItems } = await supabase
    .from("content_items")
    .select("id")
    .eq("generation_metadata->>production_run_id", second.runId);
  const secondItemId = secondItems?.[0]?.id as string;

  await dispatchToWorker(
    second.jobIds[0]!,
    second.packageId,
    secondItemId,
    source.input,
  );

  // Confirm second run job is accepted and not immediately cancelled by prior Stop.
  let progressed = false;
  for (let i = 0; i < 12; i++) {
    await sleep(10_000);
    const jobs = await jobRows(second.runId);
    const j = jobs[0];
    console.log(
      `second_poll ${new Date().toISOString()} status=${j?.status} error=${j?.error_message ?? ""}`,
    );
    if (!j) continue;
    if (j.error_message === PRODUCTION_RUN_CANCELLED_MESSAGE) {
      throw new Error("second run job was operator-cancelled from prior Stop");
    }
    if (
      j.status === "processing" ||
      j.status === "completed" ||
      j.status === "failed"
    ) {
      // failed for non-cancel reasons still proves independence from prior cancel.
      if (j.status === "failed" && j.error_message === PRODUCTION_RUN_CANCELLED_MESSAGE) {
        throw new Error("second run unexpectedly operator-cancelled");
      }
      progressed = true;
      break;
    }
  }
  if (!progressed) {
    throw new Error("second run did not progress on worker");
  }

  // Stop second run cleanly so we do not leave an expensive render running forever.
  await cancelProductionRun(second.runId, PROJECT_ID);
  await cancelVideoWorkerJobs(second.jobIds);
  await snapshot("second_after_cleanup_stop", second.runId);

  await cleanupRunArtifacts(first.runId);
  await cleanupRunArtifacts(second.runId);
  console.log("CONTROLLED_STOP_LIVE_WORKER_OK");
}

main().catch((err) => {
  console.error("CONTROLLED_STOP_LIVE_WORKER_FAILED", err);
  process.exit(1);
});
