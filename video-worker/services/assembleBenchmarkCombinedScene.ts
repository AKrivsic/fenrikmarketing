import { spawn } from "node:child_process";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ROUND_A_DURATION_SECONDS } from "@/lib/ai-media-benchmark/catalog";
import {
  assertCombinedAssembleContract,
  CombinedContractError,
  evaluateCombinedMp4Identity,
  parsePortraitSize,
  type CombinedMp4Identity,
} from "@/lib/ai-media-benchmark/combinedContract";
import { AI_MEDIA_BENCHMARK_COMBINED_FILENAME } from "@/lib/ai-media-benchmark/constants";
import {
  isVoiceoverTooLongForScene,
  type CombinedMixSettings,
} from "@/lib/ai-media-benchmark/combinedPlan";
import { mixAudioLayers } from "@/video-worker/services/audioMix";
import type { AudioMixInput, AudioMixResult } from "@/video-worker/services/audioMix/types";
import { runFfmpeg } from "@/video-worker/services/ffmpeg";
import {
  downloadStorageObjectToFile,
  uploadStorageObjectFromFile,
} from "@/video-worker/services/storage";
import { probeAudioDurationSeconds } from "@/video-worker/services/tts";
import { STORAGE_BUCKETS } from "@/lib/api/storage";

const DEFAULT_TIMEOUT_MS = Number(
  process.env.VIDEO_WORKER_FFMPEG_TIMEOUT_MS ?? 10 * 60 * 1000,
);

function ffprobeBin(): string {
  return process.env.FFPROBE_PATH ?? "ffprobe";
}

export class CombinedAssembleError extends Error {
  readonly code: string;
  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = "CombinedAssembleError";
    this.code = code;
  }
}

function wrapContract<T>(fn: () => T): T {
  try {
    return fn();
  } catch (err) {
    if (err instanceof CombinedContractError) {
      throw new CombinedAssembleError(err.code);
    }
    throw err;
  }
}

export interface CombinedStorageRef {
  bucket: string;
  path: string;
}

export interface AssembleBenchmarkCombinedSceneInput {
  combinedRunId: string;
  projectId: string;
  video: CombinedStorageRef;
  voice: CombinedStorageRef;
  sound?: CombinedStorageRef | null;
  mix: CombinedMixSettings;
  outputBucket: string;
  outputPath: string;
}

export interface AssembleBenchmarkCombinedSceneResult {
  outputBucket: string;
  outputPath: string;
  durationSeconds: number;
  voiceoverDurationSeconds: number;
  reusedExistingOutput: boolean;
  usedSceneAudio: boolean;
  usedAmbientSound: boolean;
}

export interface AssembleBenchmarkCombinedSceneDeps {
  download?: (
    ref: CombinedStorageRef,
    destinationPath: string,
  ) => Promise<void>;
  probeDurationSeconds?: (filePath: string) => Promise<number | undefined>;
  probeCombinedMp4?: (filePath: string) => Promise<CombinedMp4Identity>;
  mixAudioLayers?: (input: AudioMixInput) => Promise<AudioMixResult>;
  muxVideoWithAudio?: (args: {
    videoPath: string;
    audioPath: string;
    outputPath: string;
    targetDurationSeconds: number;
  }) => Promise<void>;
  upload?: (args: {
    bucket: string;
    storagePath: string;
    localPath: string;
  }) => Promise<void>;
  afterOutputUploaded?: () => Promise<void>;
  tempRoot?: string;
}

export async function probeCombinedMp4Identity(
  filePath: string,
): Promise<CombinedMp4Identity> {
  return new Promise((resolve) => {
    let stdout = "";
    let settled = false;
    const done = (value: CombinedMp4Identity) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    let child;
    try {
      child = spawn(
        ffprobeBin(),
        [
          "-v",
          "error",
          "-show_entries",
          "stream=codec_type,width,height,duration",
          "-show_entries",
          "format=duration,format_name",
          "-of",
          "json",
          filePath,
        ],
        { stdio: ["ignore", "pipe", "ignore"] },
      );
    } catch {
      done(evaluateCombinedMp4Identity({ readable: false, hasVideo: false, hasAudio: false }));
      return;
    }

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.on("error", () =>
      done(evaluateCombinedMp4Identity({ readable: false, hasVideo: false, hasAudio: false })),
    );
    child.on("close", (code) => {
      if (code !== 0) {
        done(evaluateCombinedMp4Identity({ readable: false, hasVideo: false, hasAudio: false }));
        return;
      }
      try {
        const parsed = JSON.parse(stdout) as {
          streams?: {
            codec_type?: string;
            width?: number;
            height?: number;
            duration?: string;
          }[];
          format?: { duration?: string; format_name?: string };
        };
        let hasVideo = false;
        let hasAudio = false;
        let width: number | undefined;
        let height: number | undefined;
        for (const stream of parsed.streams ?? []) {
          if (stream.codec_type === "video" && !hasVideo) {
            hasVideo = true;
            width = Number(stream.width);
            height = Number(stream.height);
            if (!Number.isFinite(width) || width <= 0) width = undefined;
            if (!Number.isFinite(height) || height <= 0) height = undefined;
          } else if (stream.codec_type === "audio" && !hasAudio) {
            hasAudio = true;
          }
        }
        const formatDuration = Number.parseFloat(String(parsed.format?.duration ?? ""));
        done(
          evaluateCombinedMp4Identity({
            readable: true,
            hasVideo,
            hasAudio,
            width,
            height,
            durationSeconds: Number.isFinite(formatDuration) ? formatDuration : undefined,
          }),
        );
      } catch {
        done(evaluateCombinedMp4Identity({ readable: false, hasVideo: false, hasAudio: false }));
      }
    });
  });
}

export async function muxVideoWithMixedAudio(args: {
  videoPath: string;
  audioPath: string;
  outputPath: string;
  targetDurationSeconds: number;
  signal?: AbortSignal;
}): Promise<void> {
  const { width, height } = parsePortraitSize();
  const t = args.targetDurationSeconds.toFixed(3);
  await runFfmpeg(
    [
      "-y",
      "-i",
      args.videoPath,
      "-i",
      args.audioPath,
      "-filter_complex",
      `[0:v]fps=30,scale=${width}:${height}:force_original_aspect_ratio=decrease,` +
        `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,` +
        `tpad=stop_mode=clone:stop_duration=${t},trim=0:${t},setpts=PTS-STARTPTS[v]`,
      "-map",
      "[v]",
      "-map",
      "1:a:0",
      "-t",
      t,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-ar",
      "44100",
      "-ac",
      "2",
      "-movflags",
      "+faststart",
      args.outputPath,
    ],
    DEFAULT_TIMEOUT_MS,
    args.signal,
  );
}

async function tryReuseExistingOutput(
  input: AssembleBenchmarkCombinedSceneInput,
  existingPath: string,
  download: NonNullable<AssembleBenchmarkCombinedSceneDeps["download"]>,
  probeMp4: (filePath: string) => Promise<CombinedMp4Identity>,
): Promise<AssembleBenchmarkCombinedSceneResult | null> {
  try {
    await download(
      { bucket: input.outputBucket, path: input.outputPath },
      existingPath,
    );
    const info = await stat(existingPath);
    if (!info.isFile() || info.size <= 0) return null;
  } catch {
    return null;
  }

  const identity = await probeMp4(existingPath);
  if (!identity.ok) return null;

  return {
    outputBucket: input.outputBucket,
    outputPath: input.outputPath,
    durationSeconds: identity.durationSeconds ?? ROUND_A_DURATION_SECONDS,
    voiceoverDurationSeconds: identity.durationSeconds ?? ROUND_A_DURATION_SECONDS,
    reusedExistingOutput: true,
    usedSceneAudio: input.mix.useSceneAudio,
    usedAmbientSound: input.mix.useAmbientSound,
  };
}

export async function assembleBenchmarkCombinedScene(
  input: AssembleBenchmarkCombinedSceneInput,
  deps: AssembleBenchmarkCombinedSceneDeps = {},
): Promise<AssembleBenchmarkCombinedSceneResult> {
  wrapContract(() => assertCombinedAssembleContract(input));

  const download =
    deps.download ??
    (async (ref, dest) => {
      await downloadStorageObjectToFile({
        bucket: ref.bucket,
        storagePath: ref.path,
        localPath: dest,
      });
    });
  const probe = deps.probeDurationSeconds ?? probeAudioDurationSeconds;
  const probeMp4 = deps.probeCombinedMp4 ?? probeCombinedMp4Identity;
  const mix = deps.mixAudioLayers ?? mixAudioLayers;
  const mux = deps.muxVideoWithAudio ?? muxVideoWithMixedAudio;
  const upload =
    deps.upload ??
    (async ({ bucket, storagePath, localPath }) => {
      await uploadStorageObjectFromFile({
        bucket,
        storagePath,
        localPath,
        contentType: "video/mp4",
      });
    });

  const workDir = await mkdtemp(
    join(deps.tempRoot ?? tmpdir(), "benchmark-combined-"),
  );
  try {
    const existingPath = join(workDir, "existing.mp4");
    const reused = await tryReuseExistingOutput(input, existingPath, download, probeMp4);
    if (reused) return reused;

    const videoPath = join(workDir, "source.mp4");
    const voicePath = join(workDir, "voice.mp3");
    const mixPath = join(workDir, "mix.wav");
    const outPath = join(workDir, AI_MEDIA_BENCHMARK_COMBINED_FILENAME);

    try {
      await download(input.video, videoPath);
    } catch {
      throw new CombinedAssembleError("source_output_missing");
    }
    try {
      await download(input.voice, voicePath);
    } catch {
      throw new CombinedAssembleError("source_output_missing");
    }

    let soundPath: string | null = null;
    if (input.mix.useAmbientSound) {
      if (!input.sound?.path) {
        throw new CombinedAssembleError("source_output_missing");
      }
      soundPath = join(workDir, "sound.mp3");
      try {
        await download(input.sound, soundPath);
      } catch {
        throw new CombinedAssembleError("source_output_missing");
      }
    }

    const voiceoverDuration = await probe(voicePath);
    if (voiceoverDuration == null) {
      throw new CombinedAssembleError("voiceover_duration_unknown");
    }
    if (isVoiceoverTooLongForScene(voiceoverDuration)) {
      throw new CombinedAssembleError("voiceover_too_long_for_scene");
    }

    const target = ROUND_A_DURATION_SECONDS;
    await mix({
      voiceover: {
        path: voicePath,
        gain: input.mix.voiceoverGain,
      },
      sceneAudio: input.mix.useSceneAudio
        ? [
            {
              sceneId: "combined-scene",
              path: videoPath,
              enabled: true,
              gain: input.mix.sceneAudioGain,
              startSeconds: 0,
              durationSeconds: target,
            },
          ]
        : [],
      timelineScenes: input.mix.useSceneAudio
        ? [
            {
              sceneId: "combined-scene",
              durationSeconds: target,
              transition: "none",
            },
          ]
        : [],
      ambient:
        input.mix.useAmbientSound && soundPath
          ? {
              path: soundPath,
              gain: input.mix.ambientGain,
              loop: true,
            }
          : null,
      targetDurationSeconds: target,
      outputPath: mixPath,
    });

    await mux({
      videoPath,
      audioPath: mixPath,
      outputPath: outPath,
      targetDurationSeconds: target,
    });

    await upload({
      bucket: input.outputBucket || STORAGE_BUCKETS.videoRenders,
      storagePath: input.outputPath,
      localPath: outPath,
    });

    if (deps.afterOutputUploaded) {
      await deps.afterOutputUploaded();
    }

    return {
      outputBucket: input.outputBucket || STORAGE_BUCKETS.videoRenders,
      outputPath: input.outputPath,
      durationSeconds: target,
      voiceoverDurationSeconds: voiceoverDuration,
      reusedExistingOutput: false,
      usedSceneAudio: input.mix.useSceneAudio,
      usedAmbientSound: input.mix.useAmbientSound,
    };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
