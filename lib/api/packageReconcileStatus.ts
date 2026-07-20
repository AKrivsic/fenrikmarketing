import type { JobStatus } from "@/lib/supabase/types";

export type PackageReconcileStatus = "completed" | "failed" | "running";

/**
 * Resolve a package's production-run status from its video jobs.
 *
 * Video requirement must come from run/package configuration — never from
 * "jobs.length === 0 implies text-only".
 */
export function resolvePackageReconcileStatus(args: {
  requireVideo: boolean;
  jobs: ReadonlyArray<{ status: JobStatus | string }>;
  /** Text-only packages need at least the package/copy to exist (caller gates). */
  hasPackageContent?: boolean;
}): PackageReconcileStatus {
  const { requireVideo, jobs } = args;
  if (jobs.some((j) => j.status === "failed")) return "failed";
  if (requireVideo) {
    if (jobs.length === 0) return "failed";
    if (jobs.every((j) => j.status === "completed")) return "completed";
    return "running";
  }
  // Genuine text-only: no video jobs expected → completed once package exists.
  if (jobs.length === 0) return "completed";
  if (jobs.every((j) => j.status === "completed")) return "completed";
  return "running";
}

/** Detect whether a stored production plan requires video. */
export function planRequiresVideo(plan: {
  activeVideoPlatforms?: readonly string[] | null;
  platformOutputs?: ReadonlyArray<{ kind?: string }> | null;
  videoCount?: number | null;
  videoOutputsTotal?: number | null;
} | null | undefined): boolean {
  if (!plan) return true; // fail closed for production runs missing plan
  if (typeof plan.videoCount === "number") {
    return plan.videoCount > 0;
  }
  if (typeof plan.videoOutputsTotal === "number") {
    return plan.videoOutputsTotal > 0;
  }
  if (
    Array.isArray(plan.activeVideoPlatforms) &&
    plan.activeVideoPlatforms.length > 0
  ) {
    return true;
  }
  if (
    Array.isArray(plan.platformOutputs) &&
    plan.platformOutputs.some((o) => o.kind === "video")
  ) {
    return true;
  }
  if (
    Array.isArray(plan.activeVideoPlatforms) &&
    plan.activeVideoPlatforms.length === 0
  ) {
    return false;
  }
  return true;
}
