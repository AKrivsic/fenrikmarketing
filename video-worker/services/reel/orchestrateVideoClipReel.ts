import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  SHORT_PROFILE,
  TAIL_BUFFER_SECONDS,
} from "@/lib/video-engine/storyboard";
import { resolveClipSceneTransition } from "@/lib/video-engine/clipTransition";
import type { SceneVideoClip } from "@/lib/video-engine/schemas/sceneVideoClipSchema";
import {
  assessVideoClipRenderReadiness,
  type VideoClipRenderReadiness,
} from "@/lib/video-engine/videoClipReadiness";
import { computeXfadeSceneTimeline } from "@/lib/video-engine/xfadeTimeline";
import { mixAudioLayers } from "@/video-worker/services/audioMix";
import type { AudioMixSfxEvent } from "@/video-worker/services/audioMix/types";
import {
  generateThumbnail,
} from "@/video-worker/services/ffmpeg";
import { renderVideoClipsMp4 } from "@/video-worker/services/ffmpegVideoClips";
import type { VideoClipScene } from "@/lib/video-engine/videoClipScene";
import {
  DEFAULT_MAX_CLIP_BYTES,
  downloadDurableAsset,
  type DurableAssetDownloader,
  DurableDownloadError,
} from "@/video-worker/services/reel/durableDownload";
import { probeHasAudioStream } from "@/video-worker/services/audioMix/mixAudioLayers";
import {
  probeAudioDurationSeconds,
  probeMediaStreams,
} from "@/video-worker/services/tts";

function ffprobeBin(): string {
  return process.env.FFPROBE_PATH ?? "ffprobe";
}

export interface DurableAudioBedRef {
  bucket: string;
  path: string;
  gain?: number;
  loop?: boolean;
  fadeInSeconds?: number;
  fadeOutSeconds?: number;
}

export interface OrchestrateVideoClipReelInput {
  /** Scenes carrying optional `video_clip` (render spec / persisted scenes). */
  scenes: Array<{
    id: string;
    duration_seconds: number;
    video_clip?: unknown;
    image_bucket?: string;
    image_path?: string;
    image_prompt?: string;
    /** When set, used instead of index-based fallback (clip reel only). */
    transition_in?: unknown;
  }>;
  /** Local voiceover file (caller-owned; not deleted by orchestrator). */
  voiceoverPath: string;
  /** Optional local SRT (caller-owned). */
  srtPath?: string;
  music?: DurableAudioBedRef | null;
  ambient?: DurableAudioBedRef | null;
  /** Local SFX events for the mixer (programmatic or pre-downloaded). */
  sfx?: AudioMixSfxEvent[];
  downloader: DurableAssetDownloader;
  /** Measured VO duration; probed when omitted. */
  voiceoverDurationSeconds?: number;
  tailPadSeconds?: number;
  transitionSeconds?: number;
  maxClipBytes?: number;
  /** Parent directory for the temp work dir; defaults to os.tmpdir(). */
  tempRoot?: string;
  signal?: AbortSignal;
}

export interface VideoClipReelDiagnostics {
  voiceoverDurationSeconds: number;
  visualTimelineSeconds: number;
  targetDurationSeconds: number;
  finalVideoDurationSeconds: number | null;
  finalAudioDurationSeconds: number | null;
  durationWarning: boolean;
  durationWarnings: string[];
  sceneAudioUsed: string[];
  sceneAudioSkipped: Array<{ sceneId: string; reason: string }>;
  musicUsed: boolean;
  ambientUsed: boolean;
  sfxCount: number;
  clipsDownloaded: number;
  readiness: VideoClipRenderReadiness;
}

export type OrchestrateVideoClipReelResult =
  | {
      status: "not_ready";
      readiness: VideoClipRenderReadiness;
    }
  | {
      status: "ok";
      mp4Path: string;
      thumbnailPath: string;
      workDir: string;
      diagnostics: VideoClipReelDiagnostics;
      /** Removes downloaded clips / mix intermediates; keeps MP4 + thumbnail. */
      cleanupIntermediates: () => Promise<void>;
      /** Removes the entire work directory including finals (after caller upload). */
      cleanupAll: () => Promise<void>;
    };

const DURATION_WARN_SECONDS = 0.35;

async function probeHasVideoStream(filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    let stdout = "";
    const child = spawn(
      ffprobeBin(),
      [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=codec_type",
        "-of",
        "csv=p=0",
        filePath,
      ],
      { stdio: ["ignore", "pipe", "ignore"] },
    );
    child.stdout.on("data", (c: Buffer) => {
      stdout += c.toString();
    });
    child.on("error", () => resolve(false));
    child.on("close", (code) => {
      resolve(code === 0 && /video/i.test(stdout));
    });
  });
}

async function bestEffortRm(paths: string[]): Promise<void> {
  for (const path of paths) {
    if (!path) continue;
    try {
      await rm(path, { force: true, recursive: true });
    } catch {
      // best-effort
    }
  }
}

/**
 * Standalone Reel orchestrator for durable video clips.
 * Not imported by jobRunner — production still path unchanged.
 */
export async function orchestrateVideoClipReel(
  input: OrchestrateVideoClipReelInput,
): Promise<OrchestrateVideoClipReelResult> {
  const readiness = assessVideoClipRenderReadiness({
    scenes: input.scenes,
    music: input.music
      ? { bucket: input.music.bucket, path: input.music.path }
      : null,
    ambient: input.ambient
      ? { bucket: input.ambient.bucket, path: input.ambient.path }
      : null,
  });

  if (!readiness.ready) {
    return { status: "not_ready", readiness };
  }

  const transitionSeconds =
    input.transitionSeconds ?? SHORT_PROFILE.transitionSeconds;
  const tail =
    typeof input.tailPadSeconds === "number" &&
    Number.isFinite(input.tailPadSeconds) &&
    input.tailPadSeconds >= 0
      ? input.tailPadSeconds
      : TAIL_BUFFER_SECONDS;
  const maxBytes = input.maxClipBytes ?? DEFAULT_MAX_CLIP_BYTES;

  let voiceoverDuration = input.voiceoverDurationSeconds;
  if (
    voiceoverDuration === undefined ||
    !Number.isFinite(voiceoverDuration) ||
    voiceoverDuration <= 0
  ) {
    voiceoverDuration = await probeAudioDurationSeconds(input.voiceoverPath);
  }
  if (
    voiceoverDuration === undefined ||
    !Number.isFinite(voiceoverDuration) ||
    voiceoverDuration <= 0
  ) {
    throw new Error("orchestrateVideoClipReel: could not probe voiceover duration");
  }

  const visualTimelineSeconds = computeXfadeSceneTimeline(
    input.scenes.map((s) => ({
      sceneId: s.id,
      durationSeconds: s.duration_seconds,
    })),
    transitionSeconds,
  ).timelineSeconds;

  const targetDurationSeconds = voiceoverDuration + tail;

  const workDir = await mkdtemp(
    join(input.tempRoot ?? tmpdir(), "fenrik-clip-reel-"),
  );
  const intermediatePaths: string[] = [];
  const clipsDir = join(workDir, "clips");
  const bedsDir = join(workDir, "beds");

  const cleanupIntermediates = async () => {
    await bestEffortRm(intermediatePaths);
  };
  const cleanupAll = async () => {
    await bestEffortRm([workDir]);
  };

  try {
    const clipScenes: VideoClipScene[] = [];
    const sceneAudio: Array<{
      sceneId: string;
      path: string;
      enabled: boolean;
    }> = [];
    const sceneAudioSkipped: Array<{ sceneId: string; reason: string }> = [];

    for (let i = 0; i < readiness.scenes.length; i++) {
      const assessment = readiness.scenes[i]!;
      const scene = input.scenes[i]!;
      const clip = assessment.clip as SceneVideoClip;
      const localName = `scene-${String(i).padStart(3, "0")}.mp4`;
      const localPath = join(clipsDir, localName);

      const downloaded = await downloadDurableAsset({
        downloader: input.downloader,
        bucket: clip.bucket,
        path: clip.path,
        destinationPath: localPath,
        maxBytes,
      });
      intermediatePaths.push(downloaded.localPath);

      const hasVideo = await probeHasVideoStream(downloaded.localPath);
      if (!hasVideo) {
        throw new Error(
          `downloaded asset has no video stream: scene ${scene.id} (${clip.bucket}/${clip.path})`,
        );
      }

      const sourceDuration =
        (await probeAudioDurationSeconds(downloaded.localPath)) ??
        clip.duration_seconds ??
        scene.duration_seconds;

      const actualHasAudio = await probeHasAudioStream(downloaded.localPath);
      const declared = assessment.declaredHasAudio;

      if (declared === true) {
        if (actualHasAudio) {
          sceneAudio.push({
            sceneId: scene.id,
            path: downloaded.localPath,
            enabled: true,
          });
        } else {
          sceneAudioSkipped.push({
            sceneId: scene.id,
            reason: "declared_has_audio_but_missing_stream",
          });
        }
      } else {
        sceneAudioSkipped.push({
          sceneId: scene.id,
          reason:
            declared === false
              ? "declared_has_audio_false"
              : "has_audio_unspecified",
        });
      }

      clipScenes.push({
        sceneId: scene.id,
        clipPath: downloaded.localPath,
        durationSeconds: scene.duration_seconds,
        transition: resolveClipSceneTransition(scene, i).transition,
        sourceDurationSeconds: sourceDuration,
      });
    }

    let musicLocal: string | null = null;
    let ambientLocal: string | null = null;

    if (input.music) {
      musicLocal = join(bedsDir, "music.bin");
      const dl = await downloadDurableAsset({
        downloader: input.downloader,
        bucket: input.music.bucket,
        path: input.music.path,
        destinationPath: musicLocal,
        maxBytes,
      });
      intermediatePaths.push(dl.localPath);
    }
    if (input.ambient) {
      ambientLocal = join(bedsDir, "ambient.bin");
      const dl = await downloadDurableAsset({
        downloader: input.downloader,
        bucket: input.ambient.bucket,
        path: input.ambient.path,
        destinationPath: ambientLocal,
        maxBytes,
      });
      intermediatePaths.push(dl.localPath);
    }

    const mixPath = join(workDir, "mixed-audio.wav");
    intermediatePaths.push(mixPath);

    const mixResult = await mixAudioLayers({
      voiceover: { path: input.voiceoverPath },
      timelineScenes: input.scenes.map((s, i) => ({
        sceneId: s.id,
        durationSeconds: s.duration_seconds,
        transition: resolveClipSceneTransition(s, i).transition,
      })),
      transitionSeconds,
      sceneAudio: sceneAudio.map((s) => ({
        sceneId: s.sceneId,
        path: s.path,
        enabled: s.enabled,
      })),
      music: musicLocal
        ? {
            path: musicLocal,
            gain: input.music?.gain,
            loop: input.music?.loop,
            fadeInSeconds: input.music?.fadeInSeconds,
            fadeOutSeconds: input.music?.fadeOutSeconds,
          }
        : null,
      ambient: ambientLocal
        ? {
            path: ambientLocal,
            gain: input.ambient?.gain,
            loop: input.ambient?.loop,
            fadeInSeconds: input.ambient?.fadeInSeconds,
            fadeOutSeconds: input.ambient?.fadeOutSeconds,
          }
        : null,
      sfx: input.sfx ?? [],
      targetDurationSeconds,
      outputPath: mixPath,
      signal: input.signal,
    });

    // Optional SRT copy into workDir is unnecessary — pass caller path through.
    const mp4Path = join(workDir, "output.mp4");
    const thumbPath = join(workDir, "thumbnail.png");

    await renderVideoClipsMp4({
      scenes: clipScenes,
      audioPath: mixPath,
      srtPath: input.srtPath,
      outputPath: mp4Path,
      audioDurationSeconds: targetDurationSeconds,
      tailPadSeconds: 0,
      profile: {
        width: SHORT_PROFILE.width,
        height: SHORT_PROFILE.height,
        fps: SHORT_PROFILE.fps,
        transitionSeconds,
      },
      signal: input.signal,
    });

    await generateThumbnail({ mp4Path, outputPath: thumbPath });

    const streams = await probeMediaStreams(mp4Path);
    const finalVideo = streams.video ?? null;
    const finalAudio = streams.audio ?? null;
    const durationWarnings: string[] = [];
    if (
      finalVideo !== null &&
      Math.abs(finalVideo - targetDurationSeconds) > DURATION_WARN_SECONDS
    ) {
      durationWarnings.push(
        `final video duration ${finalVideo.toFixed(3)}s differs from target ${targetDurationSeconds.toFixed(3)}s`,
      );
    }
    if (visualTimelineSeconds > targetDurationSeconds + 0.05) {
      durationWarnings.push(
        `visual timeline ${visualTimelineSeconds.toFixed(3)}s longer than audio master ${targetDurationSeconds.toFixed(3)}s (trimmed to audio)`,
      );
    }
    if (visualTimelineSeconds + 0.05 < targetDurationSeconds) {
      durationWarnings.push(
        `visual timeline ${visualTimelineSeconds.toFixed(3)}s shorter than audio master ${targetDurationSeconds.toFixed(3)}s (last frame held)`,
      );
    }

    // Remove downloaded clips + mix; keep finals for caller upload.
    await cleanupIntermediates();

    return {
      status: "ok",
      mp4Path,
      thumbnailPath: thumbPath,
      workDir,
      diagnostics: {
        voiceoverDurationSeconds: voiceoverDuration,
        visualTimelineSeconds,
        targetDurationSeconds,
        finalVideoDurationSeconds: finalVideo,
        finalAudioDurationSeconds: finalAudio,
        durationWarning: durationWarnings.length > 0,
        durationWarnings,
        sceneAudioUsed: mixResult.diagnostics.sceneAudioUsed,
        sceneAudioSkipped,
        musicUsed: mixResult.diagnostics.musicUsed,
        ambientUsed: mixResult.diagnostics.ambientUsed,
        sfxCount: mixResult.diagnostics.sfxCount,
        clipsDownloaded: clipScenes.length,
        readiness,
      },
      cleanupIntermediates,
      cleanupAll,
    };
  } catch (err) {
    await cleanupAll();
    if (err instanceof DurableDownloadError) throw err;
    throw err;
  }
}

/** Re-export readiness for callers that only need the pure check. */
export { assessVideoClipRenderReadiness };
