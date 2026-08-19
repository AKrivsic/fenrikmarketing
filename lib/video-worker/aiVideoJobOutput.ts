import type { RenderSpecOutput } from "@/lib/video-engine/schemas/renderSchema";
import { renderSpecOutputSchema } from "@/lib/video-engine/schemas/renderSchema";
import { VIDEO_RENDER_MODE_AI_VIDEO_CLIPS } from "@/lib/video-engine/schemas/videoJobRenderMode";
import { readVideoOutput } from "@/lib/api/content-shared";
import { outputHasDurableMp4 } from "@/lib/production-runtime";
import type { ClipReadyRenderManifest } from "@/lib/video-reel-assembly/clipReadyManifestSchema";
import { parseClipReadyRenderManifest } from "@/lib/video-reel-assembly/clipReadyManifestSchema";
import type { AiVideoPersistedArtifacts } from "@/lib/video-worker/aiVideoStaging";
import {
  inspectFinalAiVideoArtifacts,
  readStagingRefsFromAiMeta,
} from "@/lib/video-worker/aiVideoStaging";
import { AI_VIDEO_INPUT_FINGERPRINT_VERSION } from "@/lib/video-worker/aiVideoCheckpointFingerprint";
import type { DurableStorageRef } from "@/lib/video-worker/aiVideoStaging";

export const AI_VIDEO_OUTPUT_NAMESPACE = "ai_video" as const;

export type AiVideoCheckpointPhase =
  | "checkpoint_stills"
  | "scene_clips_complete"
  | "assembly_complete"
  | "final";

export interface AiVideoJobOutputMeta {
  render_mode: typeof VIDEO_RENDER_MODE_AI_VIDEO_CLIPS;
  phase: AiVideoCheckpointPhase;
  checkpoint_at?: string;
  final_at?: string;
  input_fingerprint_version?: number;
  input_fingerprint?: string;
  clip_ready_manifest?: ClipReadyRenderManifest;
  staging?: {
    mp4: { bucket: string; path: string };
    thumbnail: { bucket: string; path: string };
    subtitles?: { bucket: string; path: string };
  };
  generation?: {
    status: string;
    blockedReason?: string;
    reusedCount?: number;
    newlyCompletedCount?: number;
    theoreticalTotalCostUsd?: number;
    newlyInitiatedProviderCostUsd?: number;
    provider_create_count?: number;
    executor_invoked?: boolean;
  };
  assembly?: Record<string, unknown>;
  staging_cleanup?: { cleaned: boolean; error?: string };
  final_artifacts?: {
    mp4: DurableStorageRef;
    thumbnail: DurableStorageRef;
    subtitles?: DurableStorageRef;
  };
}

export function readAiVideoMeta(
  output: unknown,
): AiVideoJobOutputMeta | null {
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    return null;
  }
  const record = output as Record<string, unknown>;
  const raw = record[AI_VIDEO_OUTPUT_NAMESPACE];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const meta = raw as Record<string, unknown>;
  if (meta.render_mode !== VIDEO_RENDER_MODE_AI_VIDEO_CLIPS) return null;
  return meta as unknown as AiVideoJobOutputMeta;
}

export function readPersistedRenderSpecFromOutput(
  output: unknown,
): RenderSpecOutput | null {
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    return null;
  }
  const record = output as Record<string, unknown>;
  const parsed = renderSpecOutputSchema.safeParse(record.render_spec);
  return parsed.success ? parsed.data : null;
}

export function readClipReadyManifestFromOutput(
  output: unknown,
): ClipReadyRenderManifest | null {
  const meta = readAiVideoMeta(output);
  if (meta?.clip_ready_manifest) {
    const parsed = parseClipReadyRenderManifest(meta.clip_ready_manifest);
    if (parsed) return parsed;
  }
  return null;
}

export function storedAiVideoFingerprint(
  meta: AiVideoJobOutputMeta | null,
): string | null {
  if (!meta?.input_fingerprint) return null;
  if (
    meta.input_fingerprint_version !== undefined &&
    meta.input_fingerprint_version !== AI_VIDEO_INPUT_FINGERPRINT_VERSION
  ) {
    return null;
  }
  return meta.input_fingerprint;
}

/** Final AI-video job — requires phase=final, fingerprint, URLs, and owned final_artifacts. */
export function resolveAlreadyCompletedAiVideoJob(args: {
  output: Record<string, unknown>;
  videoJobId: string;
  projectId: string;
  expectedJobInputFingerprint?: string;
}): AiVideoPersistedArtifacts | null {
  if (!outputHasDurableMp4(args.output)) return null;
  const meta = readAiVideoMeta(args.output);
  if (!meta) return null;
  if (meta.render_mode !== VIDEO_RENDER_MODE_AI_VIDEO_CLIPS) return null;
  if (meta.phase !== "final") return null;
  const stored = storedAiVideoFingerprint(meta);
  if (!stored) return null;
  if (
    args.expectedJobInputFingerprint !== undefined &&
    stored !== args.expectedJobInputFingerprint
  ) {
    return null;
  }
  const urls = readVideoOutput(args.output as import("@/lib/supabase/types").Json);
  if (!urls.mp4Url || !urls.thumbnailUrl) return null;
  const renderSpec = readPersistedRenderSpecFromOutput(args.output);
  if (!renderSpec) return null;
  const inspected = inspectFinalAiVideoArtifacts({
    meta,
    projectId: args.projectId,
    videoJobId: args.videoJobId,
    thumbnailUrl: urls.thumbnailUrl,
  });
  if (!inspected.ok) return null;
  const debug =
    args.output.debug && typeof args.output.debug === "object"
      ? (args.output.debug as Record<string, unknown>)
      : {};
  return {
    mp4Url: urls.mp4Url,
    thumbnailUrl: urls.thumbnailUrl,
    subtitleUrl: urls.subtitleUrl ?? undefined,
    renderSpec,
    debug,
  };
}

export function buildAiVideoFinalDurableOutput(args: {
  mp4_url: string;
  thumbnail_url: string;
  subtitle_url?: string;
  render_spec: RenderSpecOutput;
  debug: Record<string, unknown>;
  aiMeta: {
    input_fingerprint: string;
    input_fingerprint_version: number;
    generation?: AiVideoJobOutputMeta["generation"];
    assembly?: AiVideoJobOutputMeta["assembly"];
    final_artifacts?: AiVideoJobOutputMeta["final_artifacts"];
    staging_cleanup?: AiVideoJobOutputMeta["staging_cleanup"];
  };
}): Record<string, unknown> {
  const finalAt = new Date().toISOString();
  const aiVideo: AiVideoJobOutputMeta = {
    render_mode: VIDEO_RENDER_MODE_AI_VIDEO_CLIPS,
    phase: "final",
    final_at: finalAt,
    input_fingerprint: args.aiMeta.input_fingerprint,
    input_fingerprint_version: args.aiMeta.input_fingerprint_version,
    generation: args.aiMeta.generation,
    assembly: args.aiMeta.assembly,
    final_artifacts: args.aiMeta.final_artifacts,
    staging_cleanup: args.aiMeta.staging_cleanup,
  };
  return {
    mp4_url: args.mp4_url,
    thumbnail_url: args.thumbnail_url,
    ...(args.subtitle_url ? { subtitle_url: args.subtitle_url } : {}),
    artifacts_persisted_at: finalAt,
    render_spec: args.render_spec,
    debug: {
      ...args.debug,
      video_render_mode: VIDEO_RENDER_MODE_AI_VIDEO_CLIPS,
    },
    [AI_VIDEO_OUTPUT_NAMESPACE]: aiVideo,
  };
}

/** Checkpoint patch — no mp4_url; job stays processing. */
export function buildAiVideoCheckpointOutput(args: {
  renderSpec: RenderSpecOutput;
  existingOutput?: Record<string, unknown>;
  phase: AiVideoCheckpointPhase;
  meta?: Partial<AiVideoJobOutputMeta>;
}): Record<string, unknown> {
  const base = args.existingOutput ? { ...args.existingOutput } : {};
  delete base.mp4_url;
  delete base.thumbnail_url;
  delete base.subtitle_url;
  delete base.artifacts_persisted_at;
  const prior = readAiVideoMeta(base);
  const mergedMeta: AiVideoJobOutputMeta = {
    ...(prior ?? {}),
    ...(args.meta ?? {}),
    render_mode: VIDEO_RENDER_MODE_AI_VIDEO_CLIPS,
    phase: args.phase,
  };
  return {
    ...base,
    render_spec: args.renderSpec,
    [AI_VIDEO_OUTPUT_NAMESPACE]: {
      ...mergedMeta,
      checkpoint_at: new Date().toISOString(),
    },
  };
}

export function phaseRank(phase: AiVideoCheckpointPhase): number {
  switch (phase) {
    case "checkpoint_stills":
      return 1;
    case "scene_clips_complete":
      return 2;
    case "assembly_complete":
      return 3;
    case "final":
      return 4;
    default:
      return 0;
  }
}

export function readAssemblyStagedFromOutput(
  output: Record<string, unknown>,
): {
  staging: NonNullable<AiVideoJobOutputMeta["staging"]>;
  renderSpec: RenderSpecOutput;
  debug: Record<string, unknown>;
} | null {
  const meta = readAiVideoMeta(output);
  if (!meta || meta.phase !== "assembly_complete") return null;
  const staging = readStagingRefsFromAiMeta(meta as unknown as Record<string, unknown>);
  if (!staging) return null;
  const renderSpec = readPersistedRenderSpecFromOutput(output);
  if (!renderSpec) return null;
  const debug =
    output.debug && typeof output.debug === "object"
      ? (output.debug as Record<string, unknown>)
      : {};
  return { staging, renderSpec, debug };
}
