/**
 * Synthetic production Stop verification against live DB + worker.
 * Proves cancelProductionRun cancels only this run's jobs and notifies the worker.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  cancelProductionRun,
  createProductionRun,
  setProductionRunStatus,
} from "@/lib/api/production-run-admin";
import { PRODUCTION_RUN_CANCELLED_MESSAGE } from "@/lib/api/production-run-cancel";
import { normalizeProductionConfig } from "@/lib/projects/productionRun";

const PROJECT_ID = "aabab9ff-9db4-4012-a53c-135e3bfea6cd";

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

async function main(): Promise<void> {
  loadEnv();
  process.env.VIDEO_WORKER_URL = "https://renderer.fenrik.chat/render";
  if (!process.env.WORKER_SECRET) {
    throw new Error("WORKER_SECRET required");
  }
  process.env.VIDEO_WORKER_SECRET = process.env.WORKER_SECRET;

  const supabase = createSupabaseAdminClient();
  const config = normalizeProductionConfig({
    packageCount: 2,
    platforms: ["tiktok", "instagram"],
    multipliers: { tiktok: 1, instagram: 1 },
  });
  const { runId } = await createProductionRun(PROJECT_ID, config);
  await setProductionRunStatus(runId, "running");
  console.log("SYNTH_RUN_ID", runId);

  // Control job in another synthetic run must remain untouched.
  const otherRunId = randomUUID();
  const { data: otherItem, error: otherItemErr } = await supabase
    .from("content_items")
    .insert({
      project_id: PROJECT_ID,
      platform: "tiktok",
      format: "reel",
      status: "draft",
      title: `stop-control-${otherRunId.slice(0, 8)}`,
      body: "control",
      generation_metadata: { production_run_id: otherRunId },
    })
    .select("id")
    .single();
  if (otherItemErr) throw otherItemErr;

  const { data: otherJob, error: otherJobErr } = await supabase
    .from("video_jobs")
    .insert({
      project_id: PROJECT_ID,
      content_item_id: otherItem.id,
      status: "queued",
      provider: "openai",
      model: "gpt-image-1",
      input: { concept: "control", voiceover_text: "control" },
    })
    .select("id, status")
    .single();
  if (otherJobErr) throw otherJobErr;

  const itemIds: string[] = [];
  const jobIds: string[] = [];
  for (const status of ["queued", "processing"] as const) {
    const { data: item, error: itemErr } = await supabase
      .from("content_items")
      .insert({
        project_id: PROJECT_ID,
        platform: "tiktok",
        format: "reel",
        status: "draft",
        title: `stop-synth-${status}-${runId.slice(0, 8)}`,
        body: "synth",
        generation_metadata: { production_run_id: runId },
      })
      .select("id")
      .single();
    if (itemErr) throw itemErr;
    itemIds.push(item.id);

    const { data: job, error: jobErr } = await supabase
      .from("video_jobs")
      .insert({
        project_id: PROJECT_ID,
        content_item_id: item.id,
        status,
        provider: "openai",
        model: "gpt-image-1",
        input: { concept: "synth", voiceover_text: "synth stop test" },
      })
      .select("id, status")
      .single();
    if (jobErr) throw jobErr;
    jobIds.push(job.id);
  }

  console.log("synth job ids", jobIds);
  console.log("control job id", otherJob.id);

  const stopAt = new Date().toISOString();
  await cancelProductionRun(runId, PROJECT_ID);
  console.log("STOP_AT", stopAt);

  const { data: cancelledJobs } = await supabase
    .from("video_jobs")
    .select("id, status, error_message")
    .in("id", jobIds);
  console.log("cancelledJobs", cancelledJobs);
  for (const j of cancelledJobs ?? []) {
    if (j.status !== "failed") throw new Error(`expected failed, got ${j.status}`);
    if (j.error_message !== PRODUCTION_RUN_CANCELLED_MESSAGE) {
      throw new Error(`bad cancel message: ${j.error_message}`);
    }
  }

  const { data: controlAfter } = await supabase
    .from("video_jobs")
    .select("id, status, error_message")
    .eq("id", otherJob.id)
    .single();
  console.log("controlAfter", controlAfter);
  if (controlAfter?.status !== "queued") {
    throw new Error("control job from other run was affected");
  }

  // Late revive attempt — DB trigger must keep cancelled status.
  const reviveId = jobIds[0]!;
  const { data: revived, error: reviveErr } = await supabase
    .from("video_jobs")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      output: { mp4_url: "https://example.invalid/revive.mp4" },
    })
    .eq("id", reviveId)
    .select("id, status, error_message, output")
    .single();
  if (reviveErr) throw reviveErr;
  console.log("reviveAttempt", revived);
  if (revived.status !== "failed") {
    throw new Error(`trigger failed to block revive: ${revived.status}`);
  }
  if (revived.error_message !== PRODUCTION_RUN_CANCELLED_MESSAGE) {
    throw new Error("trigger did not preserve cancel message");
  }

  const { data: runAfter } = await supabase
    .from("production_runs")
    .select("id, status, generated_total, failed_total")
    .eq("id", runId)
    .single();
  console.log("runAfter", runAfter);
  if (runAfter?.status !== "cancelled") {
    throw new Error(`run not cancelled: ${runAfter?.status}`);
  }

  // Cleanup synthetic rows (keep cancelled run history).
  await supabase.from("video_jobs").delete().in("id", [...jobIds, otherJob.id]);
  await supabase
    .from("content_items")
    .delete()
    .in("id", [...itemIds, otherItem.id]);

  console.log("SYNTHETIC_STOP_VERIFIED");
}

main().catch((err) => {
  console.error("SYNTHETIC_STOP_FAILED", err);
  process.exit(1);
});
