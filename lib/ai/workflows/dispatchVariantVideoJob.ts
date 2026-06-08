import type { SupabaseClient } from "@supabase/supabase-js";
import {
  startVideoWorkerJob,
  type VideoWorkerJobPayload,
} from "@/lib/video-worker/client";

// Task 5 — atomic claim + dispatch for language-variant video jobs.
//
// Both the generate- and regenerate-language-variant flows insert a `queued`
// video job and then hand it to the worker. The previous code dispatched FIRST
// and only afterwards set the row to `processing` with an unguarded UPDATE. The
// worker's completed/failed callback can land at ANY time after dispatch, so
// that trailing UPDATE could clobber an already-`completed` job back to
// `processing`.
//
// This helper applies the same principle as /api/n8n/start-video-job: it claims
// the job atomically (queued -> processing) BEFORE dispatch. Because the row is
// already `processing` before the worker can call back, the callback's terminal
// status is never overwritten. If the claim does not match (the row is no
// longer `queued`), the dispatch is skipped. If dispatch fails, the job is
// released back to `queued` (guarded by the `processing` status) so a later
// retry can re-claim it.

export interface DispatchVariantVideoJobArgs {
  videoJobId: string;
  projectId: string;
  contentPackageId: string;
  contentItemId: string | null;
  callbackUrl: string;
  input: Record<string, unknown>;
  // Injectable for tests; defaults to the real Video Worker client.
  startVideoJob?: (payload: VideoWorkerJobPayload) => Promise<void>;
}

export interface DispatchVariantVideoJobResult {
  dispatched: boolean;
  // Human-readable note for the caller's summary.warnings when not dispatched.
  warning?: string;
}

export async function claimAndDispatchVariantVideoJob(
  supabase: SupabaseClient,
  args: DispatchVariantVideoJobArgs,
): Promise<DispatchVariantVideoJobResult> {
  const start = args.startVideoJob ?? startVideoWorkerJob;

  // Atomic claim: only a still-`queued` row transitions to processing.
  const { data: claimed, error: claimErr } = await supabase
    .from("video_jobs")
    .update({ status: "processing" })
    .eq("id", args.videoJobId)
    .eq("project_id", args.projectId)
    .eq("status", "queued")
    .select("id");
  if (claimErr) throw claimErr;

  if (!claimed || claimed.length === 0) {
    // Not `queued` anymore (already processing/completed/failed). Never force it
    // back to processing — a completed callback must survive.
    return {
      dispatched: false,
      warning: `video job ${args.videoJobId} was not in 'queued' state; inline start skipped (idempotent)`,
    };
  }

  try {
    await start({
      video_job_id: args.videoJobId,
      project_id: args.projectId,
      content_package_id: args.contentPackageId,
      content_item_id: args.contentItemId,
      callback_url: args.callbackUrl,
      input: args.input,
    });
    return { dispatched: true };
  } catch (err) {
    // Release the claim so a later retry can re-claim and re-dispatch. Guarded
    // by `processing` so a callback that already moved the job to a terminal
    // status is not overwritten.
    await supabase
      .from("video_jobs")
      .update({ status: "queued" })
      .eq("id", args.videoJobId)
      .eq("project_id", args.projectId)
      .eq("status", "processing");
    const detail = err instanceof Error ? err.message : "unknown error";
    return {
      dispatched: false,
      warning: `inline worker start failed (${detail}); job ${args.videoJobId} released back to queued`,
    };
  }
}
