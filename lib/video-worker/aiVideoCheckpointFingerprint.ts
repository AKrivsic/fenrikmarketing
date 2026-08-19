import { createHash } from "node:crypto";
import type { RenderSpec } from "@/lib/video-engine/schemas/renderSchema";
import type { RenderSpecOutput } from "@/lib/video-engine/schemas/renderSchema";
import { VIDEO_RENDER_MODE_AI_VIDEO_CLIPS } from "@/lib/video-engine/schemas/videoJobRenderMode";
import type { SceneVideoGenerationPlan } from "@/lib/scene-video-plan";

export const AI_VIDEO_INPUT_FINGERPRINT_VERSION = 1 as const;

export interface AiVideoFingerprintInput {
  videoJobId: string;
  renderMode: typeof VIDEO_RENDER_MODE_AI_VIDEO_CLIPS;
  voiceoverText: string;
  subtitlesBurnInRequested: boolean;
  /** Source render spec scenes in storyboard order. */
  spec: RenderSpec;
  /** Persisted still refs when available (checkpoint), else omitted per scene. */
  persistedScenes?: RenderSpecOutput["scenes"];
  planDefaults: {
    provider: string;
    model: string;
    ratio: string;
  };
}

function stableString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableString).join(",")}]`;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return `{${keys.map((k) => `${k}:${stableString(record[k])}`).join(",")}}`;
  }
  return String(value);
}

function sceneJobInputRow(
  scene: RenderSpec["scenes"][number],
): Record<string, unknown> {
  return {
    id: scene.id,
    image_prompt: scene.image_prompt,
    motion_prompt: scene.motion_prompt ?? "",
    duration_seconds: scene.duration_seconds,
    transition_in: scene.transition_in ?? "",
    asset_id: scene.asset_id ?? "",
    video_usage: scene.video_usage ?? "",
  };
}

function sceneArtifactRow(
  scene: RenderSpec["scenes"][number],
  persisted?: RenderSpecOutput["scenes"][number],
): Record<string, unknown> {
  return {
    ...sceneJobInputRow(scene),
    image_bucket: persisted?.image_bucket ?? scene.image_bucket ?? "",
    image_path: persisted?.image_path ?? scene.image_path ?? "",
  };
}

/** Job input fingerprint — reproducible before TTS / still upload (no persisted still refs). */
export function computeAiVideoJobInputFingerprint(
  input: Omit<AiVideoFingerprintInput, "persistedScenes">,
): string {
  const canonical = {
    kind: "job_input" as const,
    v: AI_VIDEO_INPUT_FINGERPRINT_VERSION,
    video_job_id: input.videoJobId,
    render_mode: input.renderMode,
    voiceover_text: input.voiceoverText.trim(),
    subtitles_burn_in_requested: input.subtitlesBurnInRequested,
    plan: input.planDefaults,
    scenes: input.spec.scenes.map((s) => sceneJobInputRow(s)),
  };
  const json = stableString(canonical);
  return createHash("sha256").update(json, "utf8").digest("hex");
}

/** Artifact fingerprint — includes durable still refs when checkpointed. */
export function computeAiVideoArtifactFingerprint(
  input: AiVideoFingerprintInput,
): string {
  const persistedById = new Map(
    (input.persistedScenes ?? []).map((s) => [s.id, s]),
  );
  const canonical = {
    kind: "artifact" as const,
    v: AI_VIDEO_INPUT_FINGERPRINT_VERSION,
    video_job_id: input.videoJobId,
    render_mode: input.renderMode,
    voiceover_text: input.voiceoverText.trim(),
    subtitles_burn_in_requested: input.subtitlesBurnInRequested,
    plan: input.planDefaults,
    scenes: input.spec.scenes.map((s) =>
      sceneArtifactRow(s, persistedById.get(s.id)),
    ),
  };
  const json = stableString(canonical);
  return createHash("sha256").update(json, "utf8").digest("hex");
}

/** @deprecated Prefer {@link computeAiVideoJobInputFingerprint} for checkpoint identity. */
export function computeAiVideoInputFingerprint(
  input: AiVideoFingerprintInput,
): string {
  if (input.persistedScenes?.length) {
    return computeAiVideoArtifactFingerprint(input);
  }
  return computeAiVideoJobInputFingerprint(input);
}

export function planDefaultsFromPlan(
  plan: SceneVideoGenerationPlan,
): AiVideoFingerprintInput["planDefaults"] {
  return {
    provider: plan.defaults.provider,
    model: plan.defaults.model,
    ratio: plan.defaults.ratio,
  };
}
