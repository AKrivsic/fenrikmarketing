import {
  sceneVideoClipSchema,
  type SceneVideoClip,
} from "@/lib/video-engine/schemas/sceneVideoClipSchema";
import type {
  SceneVideoAttemptRow,
  SceneVideoAttemptView,
} from "@/lib/scene-video-attempts/types";

/**
 * Pure converter: succeeded attempt with durable output → SceneVideoClip.
 * Does not write video_jobs.output — caller decides when to attach.
 */
export function sceneVideoClipFromAttempt(
  attempt: Pick<
    SceneVideoAttemptRow,
    | "id"
    | "status"
    | "provider"
    | "model"
    | "output_bucket"
    | "output_path"
    | "output_duration_seconds"
    | "output_has_audio"
  >,
): SceneVideoClip {
  if (attempt.status !== "succeeded") {
    throw new Error("attempt_not_succeeded");
  }
  if (!attempt.output_bucket?.trim() || !attempt.output_path?.trim()) {
    throw new Error("attempt_missing_output");
  }

  const duration =
    typeof attempt.output_duration_seconds === "number" &&
    Number.isFinite(attempt.output_duration_seconds) &&
    attempt.output_duration_seconds > 0
      ? attempt.output_duration_seconds
      : undefined;

  const clip = sceneVideoClipSchema.parse({
    bucket: attempt.output_bucket.trim(),
    path: attempt.output_path.trim(),
    provider: attempt.provider,
    model: attempt.model,
    ...(duration !== undefined ? { duration_seconds: duration } : {}),
    ...(typeof attempt.output_has_audio === "boolean"
      ? { has_audio: attempt.output_has_audio }
      : {}),
    generation_attempt_id: attempt.id,
  });
  return clip;
}

export function sceneVideoClipFromAttemptView(
  view: SceneVideoAttemptView,
): SceneVideoClip {
  return sceneVideoClipFromAttempt({
    id: view.id,
    status: view.status,
    provider: view.provider,
    model: view.model,
    output_bucket: view.outputBucket,
    output_path: view.outputPath,
    output_duration_seconds: view.outputDurationSeconds,
    output_has_audio: view.outputHasAudio,
  });
}
