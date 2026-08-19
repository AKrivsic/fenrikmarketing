import { RUNWAY_GEN4_MOTION_PROMPT_MAX_UTF16 } from "@/lib/ai/runway";

/**
 * Attempt statuses — must match DB CHECK on scene_video_generation_attempts
 * exactly (including order is not required; membership is).
 */
export const SCENE_VIDEO_ATTEMPT_STATUSES = [
  "created",
  "submitting",
  "submitted",
  "pending",
  "running",
  "downloading",
  "succeeded",
  "failed",
  "cancelled",
  "download_failed",
  "submission_unknown",
] as const;

export type SceneVideoAttemptStatus =
  (typeof SCENE_VIDEO_ATTEMPT_STATUSES)[number];

export function isSceneVideoAttemptStatus(
  value: unknown,
): value is SceneVideoAttemptStatus {
  return (
    typeof value === "string" &&
    (SCENE_VIDEO_ATTEMPT_STATUSES as readonly string[]).includes(value)
  );
}

/** Terminal statuses that never auto-retry and never re-poll for progress. */
export const SCENE_VIDEO_ATTEMPT_TERMINAL_STATUSES = [
  "succeeded",
  "failed",
  "cancelled",
  "download_failed",
  "submission_unknown",
] as const satisfies readonly SceneVideoAttemptStatus[];

export const SCENE_VIDEO_MOTION_PROMPT_MAX_UTF16 =
  RUNWAY_GEN4_MOTION_PROMPT_MAX_UTF16;

export const SCENE_VIDEO_ATTEMPT_MAX_OUTPUT_BYTES = 120 * 1024 * 1024;

/** Stale downloading claim reclaim window (multi-worker recovery). */
export const SCENE_VIDEO_DOWNLOAD_CLAIM_STALE_MS = 10 * 60 * 1000;

/** Stale submission claim without provider_task_id → submission_unknown (no auto re-POST). */
export const SCENE_VIDEO_SUBMISSION_CLAIM_STALE_MS = 5 * 60 * 1000;

/** Runway Gen-4 seed range (inclusive). Stored as Postgres bigint. */
export const SCENE_VIDEO_SEED_MIN = 0;
export const SCENE_VIDEO_SEED_MAX = 4_294_967_295;

export const SCENE_VIDEO_ATTEMPT_STATUS_MEANINGS: Record<
  SceneVideoAttemptStatus,
  string
> = {
  created: "Row inserted; provider create not yet confirmed.",
  submitting:
    "Exclusive submission claim — preparing or executing provider create POST.",
  submitted: "Provider accepted create; task id stored.",
  pending: "Provider task queued / waiting.",
  running: "Provider task actively generating.",
  downloading: "Exclusive finalize claim — downloading/uploading output.",
  succeeded: "Durable MP4 stored; attempt complete.",
  failed: "Provider or Fenrik failed the attempt.",
  cancelled: "Provider cancelled the task.",
  download_failed: "Provider succeeded but durable store failed.",
  submission_unknown:
    "Create request ended without a reliable task id — do not auto-retry.",
};
