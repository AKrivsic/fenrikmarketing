import type { SupabaseClient } from "@supabase/supabase-js";
import { cancelVideoWorkerJobs } from "@/lib/video-worker/client";

/** Operator-facing cancel message persisted on runs, items, and video jobs. */
export const PRODUCTION_RUN_CANCELLED_MESSAGE = "Zastaveno operátorem.";

export function isOperatorCancelMessage(message: string | null | undefined): boolean {
  return message === PRODUCTION_RUN_CANCELLED_MESSAGE;
}

/** Manual retry / re-render must not restart operator-cancelled jobs. */
export function isOperatorCancelledVideoJobRetryBlocked(
  errorMessage: string | null | undefined,
): boolean {
  return isOperatorCancelMessage(errorMessage);
}

/**
 * Pure mirror of the app-level late-callback reject rule (handlers.ts).
 * DB trigger 023 is defense-in-depth for the same case.
 */
export function shouldRejectCompletedCallbackForOperatorCancel(args: {
  callbackStatus: string;
  jobStatus: string;
  jobErrorMessage: string | null | undefined;
  productionRunIsCancelled: boolean;
}): boolean {
  if (args.callbackStatus !== "completed") return false;
  if (args.productionRunIsCancelled) return true;
  return (
    args.jobStatus === "failed" &&
    isOperatorCancelMessage(args.jobErrorMessage)
  );
}

/** Only queued/running runs gate GENERATE; cancelled does not block a new run. */
export function productionRunStatusBlocksNewRun(status: string): boolean {
  return status === "queued" || status === "running";
}

export function readProductionRunIdFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const value = (metadata as Record<string, unknown>)["production_run_id"];
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** Pure helper: content items stamped with this production_run_id only. */
export function filterContentItemIdsForProductionRun(
  items: Array<{ id: string; generation_metadata?: unknown }>,
  runId: string,
): string[] {
  return items
    .filter(
      (item) =>
        readProductionRunIdFromMetadata(item.generation_metadata) === runId,
    )
    .map((item) => item.id);
}

/** Looks up production_run_id stamped on a content_item's generation_metadata. */
export async function loadProductionRunIdForContentItem(
  supabase: SupabaseClient,
  projectId: string,
  contentItemId: string | null | undefined,
): Promise<string | null> {
  if (!contentItemId) return null;
  const { data, error } = await supabase
    .from("content_items")
    .select("generation_metadata")
    .eq("id", contentItemId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw error;
  return readProductionRunIdFromMetadata(data?.generation_metadata);
}

export async function isProductionRunCancelled(
  supabase: SupabaseClient,
  projectId: string,
  runId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("production_runs")
    .select("status")
    .eq("id", runId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw error;
  return data?.status === "cancelled";
}

export async function isProductionRunCancelledForContentItem(
  supabase: SupabaseClient,
  projectId: string,
  contentItemId: string | null | undefined,
): Promise<boolean> {
  const runId = await loadProductionRunIdForContentItem(
    supabase,
    projectId,
    contentItemId,
  );
  if (!runId) return false;
  return isProductionRunCancelled(supabase, projectId, runId);
}

/**
 * Fails every queued/processing video_job belonging to the production run.
 * Returns the cancelled job ids (for worker notify). Idempotent.
 */
export async function cancelOpenVideoJobsForProductionRun(
  supabase: SupabaseClient,
  projectId: string,
  runId: string,
): Promise<string[]> {
  const { data: items, error: itemErr } = await supabase
    .from("content_items")
    .select("id")
    .eq("project_id", projectId)
    .eq("generation_metadata->>production_run_id", runId);
  if (itemErr) throw itemErr;

  const itemIds = (items ?? []).map((row) => row.id as string);
  if (itemIds.length === 0) return [];

  const { data: cancelled, error: jobErr } = await supabase
    .from("video_jobs")
    .update({
      status: "failed",
      error_message: PRODUCTION_RUN_CANCELLED_MESSAGE,
    })
    .eq("project_id", projectId)
    .in("content_item_id", itemIds)
    .in("status", ["queued", "processing"])
    .select("id");
  if (jobErr) throw jobErr;

  return (cancelled ?? []).map((row) => row.id as string);
}

/** Best-effort: ask the Video Worker to drop pending / abort in-flight jobs. */
export async function notifyWorkerOfCancelledJobs(
  videoJobIds: string[],
): Promise<void> {
  if (videoJobIds.length === 0) return;
  try {
    await cancelVideoWorkerJobs(videoJobIds);
  } catch (err) {
    console.warn(
      "[production-run] worker cancel notify failed",
      JSON.stringify({
        video_job_ids: videoJobIds,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  }
}
