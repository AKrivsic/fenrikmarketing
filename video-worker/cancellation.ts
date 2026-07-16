import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PRODUCTION_RUN_CANCELLED_MESSAGE } from "@/lib/api/production-run-cancel";

/** Thrown when a render should stop because Stop cancelled the job. */
export class JobCancelledError extends Error {
  readonly videoJobId: string;

  constructor(videoJobId: string) {
    super(PRODUCTION_RUN_CANCELLED_MESSAGE);
    this.name = "JobCancelledError";
    this.videoJobId = videoJobId;
  }
}

const cancelledJobIds = new Set<string>();
const abortByJobId = new Map<string, AbortController>();

export function requestJobCancel(videoJobId: string): void {
  if (!videoJobId) return;
  cancelledJobIds.add(videoJobId);
  const existing = abortByJobId.get(videoJobId);
  if (existing && !existing.signal.aborted) {
    existing.abort();
  }
}

export function isJobCancelRequested(videoJobId: string): boolean {
  return cancelledJobIds.has(videoJobId);
}

export function registerJobAbort(videoJobId: string): AbortController {
  const controller = new AbortController();
  abortByJobId.set(videoJobId, controller);
  if (cancelledJobIds.has(videoJobId)) {
    controller.abort();
  }
  return controller;
}

export function clearJobAbort(videoJobId: string): void {
  abortByJobId.delete(videoJobId);
  cancelledJobIds.delete(videoJobId);
}

export function assertJobNotCancelled(videoJobId: string): void {
  if (isJobCancelRequested(videoJobId)) {
    throw new JobCancelledError(videoJobId);
  }
}

/** Cooperative cancel: in-memory flag + authoritative video_jobs.status. */
export async function assertVideoJobStillActive(
  videoJobId: string,
  projectId: string,
): Promise<void> {
  assertJobNotCancelled(videoJobId);

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("video_jobs")
    .select("status")
    .eq("id", videoJobId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.status !== "processing") {
    throw new JobCancelledError(videoJobId);
  }
}
