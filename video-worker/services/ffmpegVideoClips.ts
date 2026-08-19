import { rm } from "node:fs/promises";
import { xfadeTransitionName } from "@/lib/video-engine/motion";
import { SHORT_PROFILE, type TransitionType } from "@/lib/video-engine/storyboard";
import type { VideoClipScene } from "@/lib/video-engine/videoClipScene";
import { computeXfadeSceneTimeline } from "@/lib/video-engine/xfadeTimeline";
import {
  applyFastStartMp4,
  buildSubtitleBurnArgs,
  computeXfadeTimelineSeconds,
  runFfmpeg,
  type RenderBeat,
  type RenderDiagnostics,
  type RenderMp4Result,
} from "@/video-worker/services/ffmpeg";
import {
  probeAudioDurationSeconds,
  probeMediaStreams,
} from "@/video-worker/services/tts";

/**
 * Standalone FFmpeg path: local video clips → normalize → trim/freeze →
 * transitions → shared voiceover → optional subtitle burn.
 *
 * Not wired into jobRunner / production default (stills → zoompan).
 */

const DEFAULT_TIMEOUT_MS = Number(
  process.env.VIDEO_WORKER_FFMPEG_TIMEOUT_MS ?? 10 * 60 * 1000,
);

const FINAL_FRAME_FREEZE_SECONDS = 30;
const VIDEO_EXTENSION_MARGIN_SECONDS = 5;
const DURATION_DELTA_WARNING_SECONDS = 0.25;

export interface RenderVideoClipsInput {
  scenes: VideoClipScene[];
  audioPath: string;
  srtPath?: string;
  outputPath: string;
  /** Measured voiceover duration; AUDIO is the master clock when set. */
  audioDurationSeconds?: number;
  /** Silence after VO (same role as still-image tail pad). */
  tailPadSeconds?: number;
  /** Filled by renderVideoClipsMp4 when audio master is known. */
  targetDurationSeconds?: number;
  profile?: {
    width: number;
    height: number;
    fps: number;
    transitionSeconds: number;
  };
  signal?: AbortSignal;
}

export type RenderVideoClipsResult = RenderMp4Result;

function hasTarget(input: RenderVideoClipsInput): boolean {
  return (
    typeof input.targetDurationSeconds === "number" &&
    Number.isFinite(input.targetDurationSeconds) &&
    input.targetDurationSeconds > 0
  );
}

function resolveAudioMapping(
  audioInputIndex: number,
  input: RenderVideoClipsInput,
): { filter: string | null; mapLabel: string } {
  if (hasTarget(input)) {
    return {
      filter: `[${audioInputIndex}:a]apad[aout]`,
      mapLabel: "[aout]",
    };
  }
  const tailPadSeconds = input.tailPadSeconds;
  if (
    typeof tailPadSeconds === "number" &&
    Number.isFinite(tailPadSeconds) &&
    tailPadSeconds > 0
  ) {
    return {
      filter: `[${audioInputIndex}:a]apad=pad_dur=${tailPadSeconds.toFixed(3)}[aout]`,
      mapLabel: "[aout]",
    };
  }
  return { filter: null, mapLabel: `${audioInputIndex}:a` };
}

function outputArgs(input: RenderVideoClipsInput, fps: number): string[] {
  const tail = hasTarget(input)
    ? ["-t", (input.targetDurationSeconds as number).toFixed(3)]
    : ["-shortest"];
  return [
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-r",
    String(fps),
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    ...tail,
    input.outputPath,
  ];
}

function extendVideoToTargetDuration(
  inLabel: string,
  outLabel: string,
  targetSeconds: number,
  timelineSeconds: number,
): string {
  const target = targetSeconds.toFixed(3);
  const gap = Number.isFinite(targetSeconds - timelineSeconds)
    ? targetSeconds - timelineSeconds
    : VIDEO_EXTENSION_MARGIN_SECONDS;
  const stopDuration = Math.max(
    FINAL_FRAME_FREEZE_SECONDS,
    gap + VIDEO_EXTENSION_MARGIN_SECONDS,
  );
  return (
    `[${inLabel}]tpad=stop_mode=1:stop_duration=${stopDuration.toFixed(3)},` +
    `trim=duration=${target},setpts=PTS-STARTPTS[${outLabel}]`
  );
}

function scenesAsBeats(scenes: VideoClipScene[]): RenderBeat[] {
  return scenes.map((scene) => ({
    sceneId: scene.sceneId,
    motion: "static" as const,
    transition: scene.transition,
    durationSeconds: scene.durationSeconds,
  }));
}

/**
 * Cover-crop normalize + deterministic length:
 * - longer than scene → trim
 * - equal → trim to scene length
 * - shorter → hold last frame (tpad clone), no loop / no extreme slowdown
 *
 * Clip audio is never referenced (`:v` only).
 */
export function buildVideoClipNormalizeChain(
  inputIndex: number,
  sceneDurationSeconds: number,
  sourceDurationSeconds: number,
  width: number,
  height: number,
  fps: number,
): { chain: string; label: string } {
  const label = `cv${inputIndex}`;
  const dur = Math.max(0.001, sceneDurationSeconds).toFixed(3);
  const source = Math.max(0, sourceDurationSeconds);

  let chain =
    `[${inputIndex}:v]` +
    `scale=${width}:${height}:force_original_aspect_ratio=increase,` +
    `crop=${width}:${height},` +
    `fps=${fps},setsar=1,format=yuv420p,setpts=PTS-STARTPTS`;

  if (source + 0.001 < sceneDurationSeconds) {
    const pad = Math.max(0, sceneDurationSeconds - source);
    chain +=
      `,tpad=stop_mode=1:stop_duration=${pad.toFixed(3)}` +
      `,trim=duration=${dur},setpts=PTS-STARTPTS`;
  } else {
    chain += `,trim=duration=${dur},setpts=PTS-STARTPTS`;
  }

  chain += `[${label}]`;
  return { chain, label };
}

/** Exported for unit tests of xfade offset math on clip scenes. */
export function computeVideoClipXfadeOffsets(
  scenes: VideoClipScene[],
  transitionSeconds: number,
): { offsets: number[]; transitionDurations: number[]; timelineSeconds: number } {
  const { scenes: entries, timelineSeconds } = computeXfadeSceneTimeline(
    scenes.map((s) => ({
      sceneId: s.sceneId,
      durationSeconds: s.durationSeconds,
    })),
    transitionSeconds,
  );
  return {
    offsets: entries.slice(1).map((e) => e.startSeconds),
    transitionDurations: entries
      .slice(1)
      .map((e) => e.incomingTransitionDurationSeconds),
    timelineSeconds,
  };
}

/**
 * Intermediate (subtitle-free) arg builder: clips → normalize → xfade → VO mux.
 * Scene audio inputs are never mapped.
 */
export function buildMultiVideoClipArgs(
  input: RenderVideoClipsInput,
  resolvedScenes: Array<VideoClipScene & { sourceDurationSeconds: number }>,
): string[] {
  const profile = input.profile ?? SHORT_PROFILE;
  const { width, height, fps, transitionSeconds } = profile;

  const inputArgs: string[] = [];
  const chains: string[] = [];
  const labels: string[] = [];

  resolvedScenes.forEach((scene, index) => {
    // Clip audio is demuxed but never mapped / mixed — only shared VO is used.
    inputArgs.push("-i", scene.clipPath);
    const { chain, label } = buildVideoClipNormalizeChain(
      index,
      scene.durationSeconds,
      scene.sourceDurationSeconds,
      width,
      height,
      fps,
    );
    chains.push(chain);
    labels.push(label);
  });

  let currentLabel = labels[0];
  let cumulative = resolvedScenes[0].durationSeconds;
  const xfadeChains: string[] = [];
  for (let i = 1; i < resolvedScenes.length; i++) {
    const td = Math.min(transitionSeconds, resolvedScenes[i].durationSeconds / 2);
    const offset = Math.max(0, cumulative - td);
    const outLabel = i === resolvedScenes.length - 1 ? "vjoined" : `x${i}`;
    const name = xfadeTransitionName(resolvedScenes[i].transition as TransitionType);
    xfadeChains.push(
      `[${currentLabel}][${labels[i]}]xfade=transition=${name}:duration=${td.toFixed(3)}:offset=${offset.toFixed(3)}[${outLabel}]`,
    );
    currentLabel = outLabel;
    cumulative = cumulative - td + resolvedScenes[i].durationSeconds;
  }

  const videoLabel = "vout";
  const timelineSeconds = computeXfadeTimelineSeconds(
    scenesAsBeats(resolvedScenes),
    transitionSeconds,
  );
  const targetSeconds = input.targetDurationSeconds;
  const needsLegacyFreeze =
    !hasTarget(input) &&
    typeof input.tailPadSeconds === "number" &&
    Number.isFinite(input.tailPadSeconds) &&
    input.tailPadSeconds > 0;
  const finalChain =
    hasTarget(input) && typeof targetSeconds === "number"
      ? extendVideoToTargetDuration(
          currentLabel,
          videoLabel,
          targetSeconds,
          timelineSeconds,
        )
      : needsLegacyFreeze
        ? `[${currentLabel}]tpad=stop_mode=1:stop_duration=${FINAL_FRAME_FREEZE_SECONDS.toFixed(3)}[${videoLabel}]`
        : `[${currentLabel}]null[${videoLabel}]`;

  const audioInputIndex = resolvedScenes.length;
  const audio = resolveAudioMapping(audioInputIndex, input);

  const filter = [
    ...chains,
    ...xfadeChains,
    finalChain,
    ...(audio.filter ? [audio.filter] : []),
  ].join(";");

  return [
    "-y",
    ...inputArgs,
    "-i",
    input.audioPath,
    "-filter_complex",
    filter,
    "-map",
    `[${videoLabel}]`,
    "-map",
    audio.mapLabel,
    ...outputArgs(input, fps),
  ];
}

async function resolveSourceDuration(
  scene: VideoClipScene,
): Promise<number> {
  if (
    typeof scene.sourceDurationSeconds === "number" &&
    Number.isFinite(scene.sourceDurationSeconds) &&
    scene.sourceDurationSeconds > 0
  ) {
    return scene.sourceDurationSeconds;
  }
  const probed = await probeAudioDurationSeconds(scene.clipPath);
  if (probed && probed > 0) return probed;
  throw new Error(
    `renderVideoClipsMp4: could not probe duration for scene ${scene.sceneId} (${scene.clipPath})`,
  );
}

async function verifyRender(args: {
  outputPath: string;
  audioDuration: number | null;
  targetDuration: number | null;
  intermediateVideoDuration: number | null;
  postMuxDuration: number | null;
}): Promise<RenderDiagnostics> {
  const warnings: string[] = [];
  let videoDuration: number | null = null;
  let measuredAudio = args.audioDuration;

  try {
    const streams = await probeMediaStreams(args.outputPath);
    if (typeof streams.video === "number") videoDuration = streams.video;
    if (typeof streams.audio === "number") measuredAudio = streams.audio;
  } catch {
    warnings.push("post-render probe failed");
  }

  let durationDelta: number | null = null;
  if (videoDuration !== null && measuredAudio !== null) {
    durationDelta = Math.abs(videoDuration - measuredAudio);
    if (durationDelta > DURATION_DELTA_WARNING_SECONDS) {
      warnings.push(
        `video/audio duration mismatch: video=${videoDuration.toFixed(2)}s ` +
          `audio=${measuredAudio.toFixed(2)}s delta=${durationDelta.toFixed(2)}s`,
      );
    }
    if (videoDuration + DURATION_DELTA_WARNING_SECONDS < measuredAudio) {
      warnings.push("video ends before audio");
    }
  } else {
    warnings.push("could not probe final durations");
  }

  return {
    audioDuration: measuredAudio,
    videoDuration,
    durationDelta,
    targetDuration: args.targetDuration,
    intermediateVideoDuration: args.intermediateVideoDuration,
    postMuxDuration: args.postMuxDuration,
    postSubtitleDuration: videoDuration,
    renderWarning: warnings.length > 0,
    renderWarnings: warnings,
  };
}

/**
 * Two-pass render mirroring still-image production:
 *   1) clips + xfade + shared VO → intermediate
 *   2) optional subtitle burn → final + faststart
 */
export async function renderVideoClipsMp4(
  input: RenderVideoClipsInput,
): Promise<RenderVideoClipsResult> {
  if (input.scenes.length === 0) {
    throw new Error("renderVideoClipsMp4: at least one scene is required");
  }

  const tail =
    typeof input.tailPadSeconds === "number" &&
    Number.isFinite(input.tailPadSeconds) &&
    input.tailPadSeconds > 0
      ? input.tailPadSeconds
      : 0;

  let audioDuration = input.audioDurationSeconds ?? null;
  if (audioDuration === null) {
    audioDuration = (await probeAudioDurationSeconds(input.audioPath)) ?? null;
  }
  const targetDuration =
    audioDuration !== null && audioDuration > 0 ? audioDuration + tail : undefined;

  const resolvedScenes = await Promise.all(
    input.scenes.map(async (scene) => ({
      ...scene,
      sourceDurationSeconds: await resolveSourceDuration(scene),
    })),
  );

  const intermediatePath = `${input.outputPath}.clip-intermediate.mp4`;
  const pass1Input: RenderVideoClipsInput = {
    ...input,
    outputPath: intermediatePath,
    ...(targetDuration !== undefined
      ? { targetDurationSeconds: targetDuration }
      : {}),
  };

  await runFfmpeg(
    buildMultiVideoClipArgs(pass1Input, resolvedScenes),
    DEFAULT_TIMEOUT_MS,
    input.signal,
  );

  const profile = input.profile ?? SHORT_PROFILE;

  let intermediateVideoDuration: number | null = null;
  let postMuxDuration: number | null = null;
  try {
    const interStreams = await probeMediaStreams(intermediatePath);
    if (typeof interStreams.video === "number") {
      intermediateVideoDuration = interStreams.video;
    }
    if (typeof interStreams.audio === "number") {
      postMuxDuration = interStreams.audio;
    }
  } catch {
    // Diagnostics only.
  }

  try {
    if (input.srtPath) {
      await runFfmpeg(
        buildSubtitleBurnArgs(intermediatePath, input.srtPath, input.outputPath, {
          fps: profile.fps,
          ...(targetDuration !== undefined
            ? { targetDurationSeconds: targetDuration }
            : {}),
        }),
        DEFAULT_TIMEOUT_MS,
        input.signal,
      );
    } else {
      await runFfmpeg(
        [
          "-y",
          "-i",
          intermediatePath,
          "-c",
          "copy",
          ...(targetDuration !== undefined
            ? ["-t", targetDuration.toFixed(3)]
            : []),
          input.outputPath,
        ],
        DEFAULT_TIMEOUT_MS,
        input.signal,
      );
    }
  } finally {
    await rm(intermediatePath, { force: true }).catch(() => undefined);
  }

  await applyFastStartMp4(input.outputPath, input.signal);

  const diagnostics = await verifyRender({
    outputPath: input.outputPath,
    audioDuration,
    targetDuration: targetDuration ?? null,
    intermediateVideoDuration,
    postMuxDuration,
  });

  return { mp4Path: input.outputPath, diagnostics };
}
