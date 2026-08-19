import { z } from "zod";
import { buildVideoRenderPath } from "@/lib/api/storage";
import { VIDEO_RENDER_MODE_AI_VIDEO_CLIPS } from "@/lib/video-engine/schemas/videoJobRenderMode";
import type { RenderSpecOutput } from "@/lib/video-engine/schemas/renderSchema";
import type { ClipReadyRenderManifest } from "@/lib/video-reel-assembly/clipReadyManifestSchema";
import { parseClipReadyRenderManifest } from "@/lib/video-reel-assembly/clipReadyManifestSchema";
import {
  AI_VIDEO_RENDER_BUCKET,
  buildAiVideoStagingStoragePath,
  type AiVideoStagingRefs,
  type DurableStorageRef,
} from "@/lib/video-worker/aiVideoStaging";
import {
  readAiVideoMeta,
  readClipReadyManifestFromOutput,
  readPersistedRenderSpecFromOutput,
  storedAiVideoFingerprint,
  type AiVideoCheckpointPhase,
  type AiVideoJobOutputMeta,
} from "@/lib/video-worker/aiVideoJobOutput";

const storageRefSchema = z.object({
  bucket: z.string().min(1),
  path: z.string().min(1),
});

const RESUMABLE_PHASES: AiVideoCheckpointPhase[] = [
  "checkpoint_stills",
  "scene_clips_complete",
  "assembly_complete",
  "final",
];

export class AiVideoCheckpointValidationError extends Error {
  readonly code:
    | "checkpoint_fingerprint_missing"
    | "checkpoint_input_mismatch"
    | "checkpoint_invalid";

  constructor(
    code: AiVideoCheckpointValidationError["code"],
    message: string,
  ) {
    super(message);
    this.name = "AiVideoCheckpointValidationError";
    this.code = code;
  }
}

export function assertJobInputFingerprintForResume(args: {
  meta: AiVideoJobOutputMeta | null;
  computedJobInputFingerprint: string;
}): void {
  if (!args.meta?.phase || !RESUMABLE_PHASES.includes(args.meta.phase)) {
    return;
  }
  const stored = storedAiVideoFingerprint(args.meta);
  if (!stored) {
    throw new AiVideoCheckpointValidationError(
      "checkpoint_fingerprint_missing",
      "checkpoint_missing_input_fingerprint",
    );
  }
  if (stored !== args.computedJobInputFingerprint) {
    throw new AiVideoCheckpointValidationError(
      "checkpoint_input_mismatch",
      `job_input_fingerprint_mismatch:stored=${stored.slice(0, 12)}:computed=${args.computedJobInputFingerprint.slice(0, 12)}`,
    );
  }
}

function stagingPathAllowed(
  projectId: string,
  videoJobId: string,
  path: string,
  filename: string,
): boolean {
  const expected = buildAiVideoStagingStoragePath(projectId, videoJobId, filename);
  return path === expected;
}

function finalPathFor(filename: string, projectId: string, videoJobId: string): string {
  return buildVideoRenderPath(projectId, videoJobId, filename);
}

function assertExpectedStagingBucket(
  ref: DurableStorageRef,
  label: string,
): void {
  if (ref.bucket !== AI_VIDEO_RENDER_BUCKET) {
    throw new AiVideoCheckpointValidationError(
      "checkpoint_invalid",
      `staging_bucket_mismatch:${label}`,
    );
  }
}

function sceneCheckpointIdentity(
  scene: {
    id: string;
    image_bucket?: string;
    image_path?: string;
    duration_seconds: number;
    motion_prompt?: string;
    transition_in?: string;
    video_usage?: string;
    asset_id?: string;
    type?: string;
    renderer_version?: string;
    video_clip?: {
      bucket: string;
      path: string;
      generation_attempt_id?: string;
      provider?: string;
      model?: string;
      duration_seconds?: number;
    };
  },
  index: number,
): string {
  const clip = scene.video_clip;
  return JSON.stringify({
    index,
    id: scene.id,
    image_bucket: scene.image_bucket ?? "",
    image_path: scene.image_path ?? "",
    duration_seconds: scene.duration_seconds,
    motion_prompt: scene.motion_prompt ?? "",
    transition_in: scene.transition_in ?? "",
    video_usage: scene.video_usage ?? "",
    asset_id: scene.asset_id ?? "",
    type: scene.type ?? "",
    renderer_version: scene.renderer_version ?? "",
    clip_bucket: clip?.bucket ?? "",
    clip_path: clip?.path ?? "",
    generation_attempt_id: clip?.generation_attempt_id ?? "",
    clip_provider: clip?.provider ?? "",
    clip_model: clip?.model ?? "",
    clip_duration_seconds: clip?.duration_seconds ?? null,
  });
}

/** Canonical comparison of clip-ready manifest scenes vs persisted render spec. */
export function assertManifestMatchesPersistedRenderSpec(
  manifest: ClipReadyRenderManifest,
  renderSpec: RenderSpecOutput,
): void {
  if (manifest.scenes.length !== renderSpec.scenes.length) {
    throw new AiVideoCheckpointValidationError(
      "checkpoint_invalid",
      "manifest_render_spec_scene_mismatch",
    );
  }
  for (let i = 0; i < manifest.scenes.length; i++) {
    const manifestScene = manifest.scenes[i];
    const specScene = renderSpec.scenes[i];
    if (!manifestScene || !specScene) {
      throw new AiVideoCheckpointValidationError(
        "checkpoint_invalid",
        "manifest_render_spec_scene_mismatch",
      );
    }
    if (!specScene.video_clip) {
      throw new AiVideoCheckpointValidationError(
        "checkpoint_invalid",
        `manifest_render_spec_mismatch:${manifestScene.id}:missing_video_clip`,
      );
    }
    const left = sceneCheckpointIdentity(manifestScene, i);
    const right = sceneCheckpointIdentity(specScene, i);
    if (left !== right) {
      throw new AiVideoCheckpointValidationError(
        "checkpoint_invalid",
        `manifest_render_spec_mismatch:${manifestScene.id}`,
      );
    }
  }
}

export function validateAssemblyCompleteCheckpoint(args: {
  output: Record<string, unknown>;
  projectId: string;
  videoJobId: string;
}): {
  staging: AiVideoStagingRefs;
  renderSpec: RenderSpecOutput;
  manifest: NonNullable<ReturnType<typeof parseClipReadyRenderManifest>>;
  debug: Record<string, unknown>;
  meta: AiVideoJobOutputMeta;
} {
  const meta = readAiVideoMeta(args.output);
  if (!meta) {
    throw new AiVideoCheckpointValidationError(
      "checkpoint_invalid",
      "missing_ai_video_meta",
    );
  }
  if (meta.render_mode !== VIDEO_RENDER_MODE_AI_VIDEO_CLIPS) {
    throw new AiVideoCheckpointValidationError(
      "checkpoint_invalid",
      "wrong_render_mode",
    );
  }
  if (meta.phase !== "assembly_complete") {
    throw new AiVideoCheckpointValidationError(
      "checkpoint_invalid",
      "wrong_phase",
    );
  }
  if (
    meta.input_fingerprint_version === undefined ||
    !meta.input_fingerprint
  ) {
    throw new AiVideoCheckpointValidationError(
      "checkpoint_fingerprint_missing",
      "assembly_missing_fingerprint",
    );
  }

  const stagingRaw = meta.staging;
  const parsedStaging = z
    .object({
      mp4: storageRefSchema,
      thumbnail: storageRefSchema,
      subtitles: storageRefSchema.optional(),
    })
    .safeParse(stagingRaw);
  if (!parsedStaging.success) {
    throw new AiVideoCheckpointValidationError(
      "checkpoint_invalid",
      "invalid_staging_refs",
    );
  }
  const staging = parsedStaging.data;

  assertExpectedStagingBucket(staging.mp4, "mp4");
  assertExpectedStagingBucket(staging.thumbnail, "thumbnail");
  if (staging.subtitles) {
    assertExpectedStagingBucket(staging.subtitles, "subtitles");
  }
  if (
    staging.mp4.bucket !== staging.thumbnail.bucket ||
    (staging.subtitles && staging.subtitles.bucket !== staging.mp4.bucket)
  ) {
    throw new AiVideoCheckpointValidationError(
      "checkpoint_invalid",
      "staging_bucket_inconsistent",
    );
  }
  if (staging.mp4.bucket !== AI_VIDEO_RENDER_BUCKET) {
    throw new AiVideoCheckpointValidationError(
      "checkpoint_invalid",
      "staging_bucket_not_promotion_bucket",
    );
  }

  for (const [ref, file] of [
    [staging.mp4, "output.mp4"],
    [staging.thumbnail, "thumbnail.png"],
  ] as const) {
    if (
      !stagingPathAllowed(args.projectId, args.videoJobId, ref.path, file)
    ) {
      throw new AiVideoCheckpointValidationError(
        "checkpoint_invalid",
        `staging_path_not_owned:${file}`,
      );
    }
    const finalPath = finalPathFor(file, args.projectId, args.videoJobId);
    if (ref.path === finalPath) {
      throw new AiVideoCheckpointValidationError(
        "checkpoint_invalid",
        "staging_equals_final_path",
      );
    }
  }

  const renderSpec = readPersistedRenderSpecFromOutput(args.output);
  if (!renderSpec) {
    throw new AiVideoCheckpointValidationError(
      "checkpoint_invalid",
      "missing_render_spec",
    );
  }

  const manifest = readClipReadyManifestFromOutput(args.output);
  if (!manifest) {
    throw new AiVideoCheckpointValidationError(
      "checkpoint_invalid",
      "missing_clip_ready_manifest",
    );
  }

  assertManifestMatchesPersistedRenderSpec(manifest, renderSpec);

  if (manifest.assembly.subtitles_burn_in_requested) {
    if (!staging.subtitles) {
      throw new AiVideoCheckpointValidationError(
        "checkpoint_invalid",
        "subtitles_required_missing_staging_srt",
      );
    }
    if (
      !stagingPathAllowed(
        args.projectId,
        args.videoJobId,
        staging.subtitles.path,
        "subtitles.srt",
      )
    ) {
      throw new AiVideoCheckpointValidationError(
        "checkpoint_invalid",
        "staging_subtitles_path_not_owned",
      );
    }
  }

  const debug =
    args.output.debug && typeof args.output.debug === "object"
      ? (args.output.debug as Record<string, unknown>)
      : {};

  return {
    staging,
    renderSpec,
    manifest,
    debug,
    meta,
  };
}
