import type { ExecuteSceneVideoPlanResult } from "@/lib/scene-video-executor/types";
import type { SceneVideoGenerationPlan } from "@/lib/scene-video-plan";
import type { RenderSpecOutput } from "@/lib/video-engine/schemas/renderSchema";
import type { SceneVideoClip } from "@/lib/video-engine/schemas/sceneVideoClipSchema";
import type { DurableStorageRef } from "@/lib/video-engine/schemas/sceneVideoClipSchema";
import type { VideoClipReelDiagnostics } from "@/video-worker/services/reel/orchestrateVideoClipReel";
import type { AudioMixSfxEvent } from "@/video-worker/services/audioMix/types";
import type { ClipReadyRenderManifest } from "@/lib/video-reel-assembly/clipReadyManifestSchema";

export type VideoReelAssemblyBlockReason =
  | "invalid_render_spec"
  | "plan_not_fully_preparable"
  | "voiceover_missing"
  | "clip_assignment_failed"
  | "executor_not_completed"
  | "manifest_invalid"
  | "reel_not_ready"
  | "assembly_failed"
  | "voiceover_provenance_mismatch"
  | "subtitles_policy_mismatch";

export interface SceneVideoClipAssignment {
  sceneId: string;
  generationAttemptId: string;
  clip: SceneVideoClip;
}

export interface PrepareVideoReelAssemblyInput {
  /** Resolved production render_spec (post still render). Not mutated. */
  renderSpec: unknown;
  /** Spoken script — same contract as render job input (`voiceover_text`). */
  voiceoverText: string;
  /** Optional local voiceover file check (preparation only). */
  voiceoverLocalPath?: string;
  /** Optional local SRT for availability flag. */
  subtitlesLocalPath?: string;
  /** Optional durable refs — validated for identity only. */
  music?: DurableStorageRef | null;
  ambient?: DurableStorageRef | null;
}

export interface PrepareVideoReelAssemblyOk {
  ok: true;
  renderSpec: RenderSpecOutput;
  plan: SceneVideoGenerationPlan;
  sceneCount: number;
  voiceoverTextPresent: boolean;
  voiceoverLocalPathPresent: boolean;
  subtitlesAvailable: boolean;
  musicRefPresent: boolean;
  ambientRefPresent: boolean;
}

export interface PrepareVideoReelAssemblyErr {
  ok: false;
  reason: VideoReelAssemblyBlockReason;
  detail?: string;
}

export type PrepareVideoReelAssemblyResult =
  | PrepareVideoReelAssemblyOk
  | PrepareVideoReelAssemblyErr;

export interface ApplyExecutorClipResultsInput {
  /** Original render spec — never mutated. */
  renderSpec: RenderSpecOutput;
  executorResult: ExecuteSceneVideoPlanResult;
}

export interface ApplyClipAssignmentsInput {
  renderSpec: RenderSpecOutput;
  assignments: SceneVideoClipAssignment[];
}

export type ClipAssignmentFailureReason =
  | "executor_not_completed"
  | "missing_clip_for_scene"
  | "extra_clip_for_unknown_scene"
  | "duplicate_scene_id"
  | "missing_generation_attempt_id"
  | "generation_attempt_id_mismatch"
  | "invalid_clip"
  | "invalid_storage_identity"
  | "invalid_generation_attempt_uuid"
  | "manifest_invalid"
  | "scene_count_mismatch";

export interface ApplyClipResultsOk {
  ok: true;
  manifest: ClipReadyRenderManifest;
  assignments: SceneVideoClipAssignment[];
}

export interface ApplyClipResultsErr {
  ok: false;
  reason: ClipAssignmentFailureReason;
  detail?: string;
  sceneId?: string;
}

export type ApplyClipResultsResult = ApplyClipResultsOk | ApplyClipResultsErr;

export interface AssembleVideoReelInput {
  manifest: ClipReadyRenderManifest;
  voiceoverLocalPath: string;
  /** Required when `manifest.assembly.subtitles_burn_in_requested` is true. */
  subtitlesLocalPath?: string;
  sfx?: AudioMixSfxEvent[];
  downloader: import("@/video-worker/services/reel/durableDownload").DurableAssetDownloader;
  voiceoverDurationSeconds?: number;
  tempRoot?: string;
  signal?: AbortSignal;
}

export interface VideoReelAssemblyDiagnostics extends VideoClipReelDiagnostics {
  sceneCount: number;
  subtitlesBurnInUsed: boolean;
  musicRef: { bucket: string; path: string } | null;
  ambientRef: { bucket: string; path: string } | null;
  clips: Array<{
    sceneId: string;
    generationAttemptId: string;
    bucket: string;
    path: string;
  }>;
  transitions: Array<{ sceneId: string; transition: string }>;
}

export type AssembleVideoReelResult =
  | {
      status: "blocked";
      reason: VideoReelAssemblyBlockReason;
      detail?: string;
    }
  | {
      status: "ok";
      mp4Path: string;
      thumbnailPath: string;
      workDir: string;
      manifest: ClipReadyRenderManifest;
      diagnostics: VideoReelAssemblyDiagnostics;
      cleanupIntermediates: () => Promise<void>;
      cleanupAll: () => Promise<void>;
    };

export interface VideoReelArtifactUploadInput {
  projectId: string;
  videoJobId: string;
  mp4LocalPath: string;
  thumbnailLocalPath: string;
  srtLocalPath?: string;
}

export interface VideoReelArtifactUploadResult {
  mp4: { bucket: string; path: string };
  thumbnail: { bucket: string; path: string };
  subtitles?: { bucket: string; path: string };
}

export interface VideoReelArtifactUploader {
  uploadArtifacts(
    input: VideoReelArtifactUploadInput,
  ): Promise<VideoReelArtifactUploadResult>;
}
