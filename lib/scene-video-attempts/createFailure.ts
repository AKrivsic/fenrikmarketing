import {
  SCENE_VIDEO_SEED_MAX,
  SCENE_VIDEO_SEED_MIN,
} from "@/lib/scene-video-attempts/constants";
import { VideoGenerationError } from "@/lib/ai/videoGenerationError";

/**
 * Validates optional seed before DB write.
 * Accepts 0..4294967295 inclusive; rejects negatives and values above max.
 */
export function validateSceneVideoSeed(seed: unknown): number | null {
  if (seed === undefined || seed === null) return null;
  if (typeof seed !== "number" || !Number.isFinite(seed) || !Number.isInteger(seed)) {
    throw new Error("seed_invalid");
  }
  if (seed < SCENE_VIDEO_SEED_MIN || seed > SCENE_VIDEO_SEED_MAX) {
    throw new Error("seed_out_of_range");
  }
  return seed;
}

/**
 * Classifies create-time provider failures.
 *
 * - Definitive HTTP responses (4xx including 429) → `failed`
 * - Timeout / network / ambiguous 5xx → `submission_unknown`
 *
 * HTTP 429: Runway returned a definitive rate-limit rejection with no task id,
 * so the create did not succeed — treat as `failed` (safe to consciously retry
 * later with a new client_request_id). Not `submission_unknown`.
 */
export function classifyCreateFailure(
  err: unknown,
): "failed" | "submission_unknown" {
  if (err instanceof VideoGenerationError) {
    if (err.code === "timeout") return "submission_unknown";
    if (
      err.code === "invalid_input" ||
      err.code === "missing_api_key" ||
      err.code === "task_failed" ||
      err.code === "task_cancelled"
    ) {
      return "failed";
    }
    if (err.code === "http_error") {
      const status = err.httpStatus;
      if (typeof status === "number" && Number.isFinite(status)) {
        if (status === 429) return "failed";
        if (status >= 500) return "submission_unknown";
        if (status >= 400 && status < 500) return "failed";
      }
      // HTTP error without a reliable status → unknown.
      return "submission_unknown";
    }
    if (err.code === "unexpected_response") return "failed";
  }

  if (err instanceof Error) {
    if (
      /timeout|ECONNRESET|ECONNREFUSED|ENOTFOUND|fetch failed|network|socket hang up|aborted/i.test(
        err.message,
      )
    ) {
      return "submission_unknown";
    }
  }

  return "submission_unknown";
}
