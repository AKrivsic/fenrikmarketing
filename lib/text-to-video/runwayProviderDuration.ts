import {
  TEXT_TO_VIDEO_RUNWAY_DURATION_MAX,
  TEXT_TO_VIDEO_RUNWAY_DURATION_MIN,
} from "@/lib/text-to-video/runwayProductionConfig";

export class TextToVideoSceneDurationError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

/** Map measured trim length to Runway integer duration (safe ceiling, 2–10). */
export function runwayProviderDurationFromRequiredTrim(
  requiredTrimSeconds: number,
): { providerDurationSeconds: number; requiredTrimSeconds: number } {
  if (!Number.isFinite(requiredTrimSeconds) || requiredTrimSeconds <= 0) {
    throw new TextToVideoSceneDurationError("scene_duration_invalid");
  }
  const required = Math.round(requiredTrimSeconds * 1000) / 1000;
  if (required > TEXT_TO_VIDEO_RUNWAY_DURATION_MAX) {
    throw new TextToVideoSceneDurationError("scene_duration_exceeds_runway_max");
  }
  let provider = Math.ceil(required - 1e-9);
  if (provider < TEXT_TO_VIDEO_RUNWAY_DURATION_MIN) {
    provider = TEXT_TO_VIDEO_RUNWAY_DURATION_MIN;
  }
  if (provider > TEXT_TO_VIDEO_RUNWAY_DURATION_MAX) {
    throw new TextToVideoSceneDurationError("scene_duration_exceeds_runway_max");
  }
  return { providerDurationSeconds: provider, requiredTrimSeconds: required };
}
