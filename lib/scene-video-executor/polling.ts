import {
  RUNWAY_VIDEO_DEFAULT_POLL_INTERVAL_MS,
  RUNWAY_VIDEO_DEFAULT_POLL_TIMEOUT_MS,
} from "@/lib/ai/runway";

/** Production-safe poll spacing (same default as Runway `waitForImageToVideo`). */
export function normalizeSceneVideoPollIntervalMs(
  pollIntervalMs: number | undefined,
): number {
  if (
    typeof pollIntervalMs === "number" &&
    Number.isFinite(pollIntervalMs) &&
    pollIntervalMs > 0
  ) {
    return pollIntervalMs;
  }
  return RUNWAY_VIDEO_DEFAULT_POLL_INTERVAL_MS;
}

export function resolveSceneVideoPollTimeoutMs(
  pollTimeoutMs: number | undefined,
): number {
  if (
    typeof pollTimeoutMs === "number" &&
    Number.isFinite(pollTimeoutMs) &&
    pollTimeoutMs > 0
  ) {
    return pollTimeoutMs;
  }
  return RUNWAY_VIDEO_DEFAULT_POLL_TIMEOUT_MS;
}

/** Hard cap on poll loop iterations (in addition to wall-clock timeout). */
export function maxSceneVideoPollIterations(
  timeoutMs: number,
  intervalMs: number,
): number {
  const interval = Math.max(1, intervalMs);
  return Math.max(1, Math.ceil(timeoutMs / interval));
}
