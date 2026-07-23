import type { SupabaseClient } from "@supabase/supabase-js";
import {
  startVideoWorkerJob,
  type VideoWorkerJobPayload,
} from "@/lib/video-worker/client";
import {
  claimVideoJobForDispatch,
  runtimeLog,
} from "@/lib/production-runtime";

// Task 5 / Phase 6G — atomic lease claim + dispatch for language-variant video jobs.
// Uses the same claim_video_job_for_dispatch RPC as /api/n8n/start-video-job
// (no direct queued→processing update).

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
  const ownerToken = args.videoJobId;

  const claim = await claimVideoJobForDispatch(supabase, {
    jobId: args.videoJobId,
    projectId: args.projectId,
    ownerToken,
  });

  if (claim.status === "busy" || claim.status === "terminal") {
    runtimeLog("info", {
      event: "video_lease_busy",
      project_id: args.projectId,
      package_id: args.contentPackageId,
      content_item_id: args.contentItemId,
      video_job_id: args.videoJobId,
      outcome: claim.status,
    });
    return {
      dispatched: false,
      warning: `video job ${args.videoJobId} claim=${claim.status}; inline start skipped (idempotent)`,
    };
  }

  if (claim.status === "artifacts_ready") {
    return {
      dispatched: false,
      warning: `video job ${args.videoJobId} already has durable artifacts; promote via reconcile/start-video`,
    };
  }

  if (claim.status === "missing") {
    return {
      dispatched: false,
      warning: `video job ${args.videoJobId} missing`,
    };
  }

  runtimeLog("info", {
    event: "video_lease_claimed",
    project_id: args.projectId,
    package_id: args.contentPackageId,
    content_item_id: args.contentItemId,
    video_job_id: args.videoJobId,
    owner_token: ownerToken,
    outcome: "claimed",
  });

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
    // status is not overwritten. Clear lease fields so CHECK still holds if
    // status returns to queued.
    await supabase
      .from("video_jobs")
      .update({
        status: "queued",
        lease_owner: null,
        lease_expires_at: null,
      })
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
