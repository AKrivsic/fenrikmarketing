import { access } from "node:fs/promises";
import { resolveClipSceneTransition } from "@/lib/video-engine/clipTransition";
import {
  parseClipReadyRenderManifest,
  type ManifestAudioBed,
} from "@/lib/video-reel-assembly/clipReadyManifestSchema";
import type {
  AssembleVideoReelInput,
  AssembleVideoReelResult,
  VideoReelAssemblyDiagnostics,
} from "@/lib/video-reel-assembly/types";
import { sha256HexFile } from "@/lib/video-reel-assembly/voiceoverProvenance";
import type { DurableAudioBedRef } from "@/video-worker/services/reel/orchestrateVideoClipReel";
import { orchestrateVideoClipReel } from "@/video-worker/services/reel/orchestrateVideoClipReel";

function bedToOrchestratorRef(bed: ManifestAudioBed): DurableAudioBedRef | null {
  if (!bed) return null;
  return {
    bucket: bed.bucket,
    path: bed.path,
    gain: bed.gain,
    loop: bed.loop,
    fadeInSeconds: bed.fadeInSeconds,
    fadeOutSeconds: bed.fadeOutSeconds,
  };
}

/**
 * Phase C — FFmpeg reel via existing orchestrator. No provider calls.
 * Audio beds and subtitle policy come from the manifest only.
 */
export async function assembleVideoReel(
  input: AssembleVideoReelInput,
): Promise<AssembleVideoReelResult> {
  const manifest = parseClipReadyRenderManifest(input.manifest);
  if (!manifest) {
    return {
      status: "blocked",
      reason: "manifest_invalid",
    };
  }

  if (!input.voiceoverLocalPath?.trim()) {
    return { status: "blocked", reason: "voiceover_missing" };
  }

  try {
    await access(input.voiceoverLocalPath);
  } catch {
    return {
      status: "blocked",
      reason: "voiceover_missing",
      detail: "voiceover_local_path_not_found",
    };
  }

  const voiceoverHash = await sha256HexFile(input.voiceoverLocalPath);
  if (voiceoverHash.toLowerCase() !== manifest.assembly.voiceover_sha256.toLowerCase()) {
    return {
      status: "blocked",
      reason: "voiceover_provenance_mismatch",
    };
  }

  const burnInRequested = manifest.assembly.subtitles_burn_in_requested;
  const srtProvided = Boolean(input.subtitlesLocalPath?.trim());

  if (burnInRequested && !srtProvided) {
    return {
      status: "blocked",
      reason: "subtitles_policy_mismatch",
      detail: "subtitles_burn_in_requested_but_no_srt",
    };
  }
  if (!burnInRequested && srtProvided) {
    return {
      status: "blocked",
      reason: "subtitles_policy_mismatch",
      detail: "subtitles_burn_in_not_requested_but_srt_provided",
    };
  }

  if (burnInRequested && input.subtitlesLocalPath) {
    try {
      await access(input.subtitlesLocalPath);
    } catch {
      return {
        status: "blocked",
        reason: "subtitles_policy_mismatch",
        detail: "subtitles_local_path_not_found",
      };
    }
  }

  const musicRef = bedToOrchestratorRef(manifest.assembly.music ?? null);
  const ambientRef = bedToOrchestratorRef(manifest.assembly.ambient ?? null);
  const srtPath = burnInRequested ? input.subtitlesLocalPath : undefined;

  const scenes = manifest.scenes.map((scene) => ({
    id: scene.id,
    duration_seconds: scene.duration_seconds,
    video_clip: scene.video_clip,
    image_bucket: scene.image_bucket,
    image_path: scene.image_path,
    image_prompt: scene.image_prompt,
    transition_in: scene.transition_in,
  }));

  const orch = await orchestrateVideoClipReel({
    scenes,
    voiceoverPath: input.voiceoverLocalPath,
    srtPath,
    music: musicRef,
    ambient: ambientRef,
    sfx: input.sfx,
    downloader: input.downloader,
    voiceoverDurationSeconds: input.voiceoverDurationSeconds,
    tempRoot: input.tempRoot,
    signal: input.signal,
  });

  if (orch.status === "not_ready") {
    return {
      status: "blocked",
      reason: "reel_not_ready",
      detail: orch.readiness.reason,
    };
  }

  const transitions = manifest.scenes.map((scene, index) => {
    const resolved = resolveClipSceneTransition(scene, index);
    return { sceneId: scene.id, transition: resolved.transition };
  });

  const diagnostics: VideoReelAssemblyDiagnostics = {
    ...orch.diagnostics,
    sceneCount: manifest.scenes.length,
    subtitlesBurnInUsed: burnInRequested && Boolean(srtPath),
    musicRef: musicRef
      ? { bucket: musicRef.bucket, path: musicRef.path }
      : null,
    ambientRef: ambientRef
      ? { bucket: ambientRef.bucket, path: ambientRef.path }
      : null,
    clips: manifest.assembly.clipAssignments.map((a) => ({
      sceneId: a.sceneId,
      generationAttemptId: a.generationAttemptId,
      bucket: a.clipBucket,
      path: a.clipPath,
    })),
    transitions,
  };

  return {
    status: "ok",
    mp4Path: orch.mp4Path,
    thumbnailPath: orch.thumbnailPath,
    workDir: orch.workDir,
    manifest,
    diagnostics,
    cleanupIntermediates: orch.cleanupIntermediates,
    cleanupAll: orch.cleanupAll,
  };
}
