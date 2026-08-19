import { spawn } from "node:child_process";
import { SHORT_PROFILE } from "@/lib/video-engine/storyboard";
import { computeXfadeSceneTimeline } from "@/lib/video-engine/xfadeTimeline";
import {
  AUDIO_MIX_DEFAULTS,
  type AudioMixDefaults,
} from "@/video-worker/services/audioMix/defaults";
import type {
  AudioMixBedTrack,
  AudioMixInput,
  AudioMixResult,
  AudioMixSceneAudio,
} from "@/video-worker/services/audioMix/types";
import { runFfmpeg } from "@/video-worker/services/ffmpeg";
import { probeAudioDurationSeconds } from "@/video-worker/services/tts";

const DEFAULT_TIMEOUT_MS = Number(
  process.env.VIDEO_WORKER_FFMPEG_TIMEOUT_MS ?? 10 * 60 * 1000,
);

function ffprobeBin(): string {
  return process.env.FFPROBE_PATH ?? "ffprobe";
}

function mergeLevels(partial?: AudioMixInput["levels"]): AudioMixDefaults {
  return { ...AUDIO_MIX_DEFAULTS, ...(partial ?? {}) };
}

function aformatFilter(levels: AudioMixDefaults): string {
  return `aformat=sample_fmts=fltp:sample_rates=${levels.sampleRate}:channel_layouts=stereo`;
}

/** True when the file has at least one audio stream (video or audio container). */
export async function probeHasAudioStream(filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    let stdout = "";
    let settled = false;
    const done = (value: boolean) => {
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
          "-select_streams",
          "a:0",
          "-show_entries",
          "stream=codec_type",
          "-of",
          "csv=p=0",
          filePath,
        ],
        { stdio: ["ignore", "pipe", "ignore"] },
      );
    } catch {
      done(false);
      return;
    }
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.on("error", () => done(false));
    child.on("close", (code) => {
      done(code === 0 && /audio/i.test(stdout));
    });
  });
}

function fadeChain(
  fadeIn: number,
  fadeOut: number,
  targetSeconds: number,
): string {
  const parts: string[] = [];
  if (fadeIn > 0) {
    parts.push(`afade=t=in:st=0:d=${fadeIn.toFixed(3)}`);
  }
  if (fadeOut > 0 && targetSeconds > fadeOut) {
    const st = Math.max(0, targetSeconds - fadeOut);
    parts.push(`afade=t=out:st=${st.toFixed(3)}:d=${fadeOut.toFixed(3)}`);
  }
  return parts.length ? `,${parts.join(",")}` : "";
}

function bedPrepChain(
  inputIndex: number,
  label: string,
  gain: number,
  targetSeconds: number,
  fadeIn: number,
  fadeOut: number,
  levels: AudioMixDefaults,
): string {
  // atrim after optional aloop materialization happens via -stream_loop on input.
  return (
    `[${inputIndex}:a]${aformatFilter(levels)},` +
    `atrim=0:${targetSeconds.toFixed(3)},asetpts=PTS-STARTPTS` +
    fadeChain(fadeIn, fadeOut, targetSeconds) +
    `,volume=${gain.toFixed(4)}[${label}]`
  );
}

export interface BuiltAudioMixGraph {
  inputArgs: string[];
  filterComplex: string;
  mapLabel: string;
  diagnostics: AudioMixResult["diagnostics"];
}

/**
 * Builds the FFmpeg filter graph for the multi-layer mix.
 * Exported for deterministic unit checks (fade-out, delays, ducking).
 */
export async function buildAudioMixGraph(
  input: AudioMixInput,
): Promise<BuiltAudioMixGraph> {
  const levels = mergeLevels(input.levels);
  const target = Math.max(0.05, input.targetDurationSeconds);
  const transitionSeconds =
    input.transitionSeconds ?? SHORT_PROFILE.transitionSeconds;

  const timeline =
    input.timelineScenes && input.timelineScenes.length > 0
      ? computeXfadeSceneTimeline(
          input.timelineScenes.map((s) => ({
            sceneId: s.sceneId,
            durationSeconds: s.durationSeconds,
          })),
          transitionSeconds,
        )
      : null;

  const startBySceneId = new Map(
    (timeline?.scenes ?? []).map((s) => [s.sceneId, s]),
  );

  const inputArgs: string[] = [];
  const chains: string[] = [];
  const duckBedLabels: string[] = [];
  const sfxLabels: string[] = [];
  const sceneAudioUsed: string[] = [];
  const sceneAudioSkipped: string[] = [];

  // 0: voiceover
  inputArgs.push("-i", input.voiceover.path);
  const voGain = input.voiceover.gain ?? levels.voiceoverGain;
  chains.push(
    `[0:a]${aformatFilter(levels)},` +
      `apad,atrim=0:${target.toFixed(3)},asetpts=PTS-STARTPTS,` +
      `volume=${voGain.toFixed(4)}[vo]`,
  );

  let nextIndex = 1;

  const sceneAudioList = input.sceneAudio ?? [];
  for (const sa of sceneAudioList) {
    if (sa.enabled === false) {
      sceneAudioSkipped.push(sa.sceneId);
      continue;
    }
    const hasAudio = await probeHasAudioStream(sa.path);
    if (!hasAudio) {
      sceneAudioSkipped.push(sa.sceneId);
      continue;
    }
    const entry = startBySceneId.get(sa.sceneId);
    const start =
      typeof sa.startSeconds === "number" && Number.isFinite(sa.startSeconds)
        ? Math.max(0, sa.startSeconds)
        : (entry?.startSeconds ?? 0);
    const dur =
      typeof sa.durationSeconds === "number" &&
      Number.isFinite(sa.durationSeconds) &&
      sa.durationSeconds > 0
        ? sa.durationSeconds
        : (entry?.durationSeconds ?? target);
    const gain = sa.gain ?? levels.sceneAudioGain;
    const delayMs = Math.round(start * 1000);
    const label = `sa${duckBedLabels.length}`;
    inputArgs.push("-i", sa.path);
    // Trim to scene length only — do not stretch short clip audio.
    chains.push(
      `[${nextIndex}:a]${aformatFilter(levels)},` +
        `atrim=0:${dur.toFixed(3)},asetpts=PTS-STARTPTS,` +
        `adelay=${delayMs}|${delayMs},volume=${gain.toFixed(4)},` +
        `apad,atrim=0:${target.toFixed(3)},asetpts=PTS-STARTPTS[${label}]`,
    );
    duckBedLabels.push(label);
    sceneAudioUsed.push(sa.sceneId);
    nextIndex += 1;
  }

  const addLoopedBed = (
    bed: AudioMixBedTrack | null | undefined,
    kind: "music" | "ambient",
  ): boolean => {
    if (!bed?.path) return false;
    const gain =
      bed.gain ??
      (kind === "music" ? levels.musicGain : levels.ambientGain);
    const loop = bed.loop !== false;
    const fadeIn =
      bed.fadeInSeconds ??
      (kind === "music"
        ? levels.musicFadeInSeconds
        : levels.ambientFadeInSeconds);
    const fadeOut =
      bed.fadeOutSeconds ??
      (kind === "music"
        ? levels.musicFadeOutSeconds
        : levels.ambientFadeOutSeconds);
    if (loop) {
      inputArgs.push("-stream_loop", "-1", "-i", bed.path);
    } else {
      inputArgs.push("-i", bed.path);
    }
    const label = kind === "music" ? "music" : "ambient";
    chains.push(
      bedPrepChain(nextIndex, label, gain, target, fadeIn, fadeOut, levels),
    );
    duckBedLabels.push(label);
    nextIndex += 1;
    return true;
  };

  const musicUsed = addLoopedBed(input.music, "music");
  const ambientUsed = addLoopedBed(input.ambient, "ambient");

  const sfxList = input.sfx ?? [];
  for (let i = 0; i < sfxList.length; i++) {
    const sfx = sfxList[i]!;
    const gain = sfx.gain ?? levels.sfxGain;
    const delayMs = Math.round(Math.max(0, sfx.startSeconds) * 1000);
    const label = `sfx${i}`;
    inputArgs.push("-i", sfx.path);
    chains.push(
      `[${nextIndex}:a]${aformatFilter(levels)},` +
        `adelay=${delayMs}|${delayMs},volume=${gain.toFixed(4)},` +
        `apad,atrim=0:${target.toFixed(3)},asetpts=PTS-STARTPTS[${label}]`,
    );
    sfxLabels.push(label);
    nextIndex += 1;
  }

  let filterComplex: string;
  let ducked = false;
  const hasDuckBeds = duckBedLabels.length > 0;
  const hasSfx = sfxLabels.length > 0;

  if (!hasDuckBeds && !hasSfx) {
    chains.push(
      `[vo]alimiter=limit=${levels.limiterLimit}:attack=${levels.limiterAttackMs}:release=${levels.limiterReleaseMs}[aout]`,
    );
    filterComplex = chains.join(";");
  } else {
    // Duck only continuous beds (scene/music/ambient) under VO.
    // SFX stay unducked so short accents remain audible, still gain-capped.
    let duckedOrBeds = "silence_beds";
    if (hasDuckBeds) {
      const bedsMixLabel = "beds";
      if (duckBedLabels.length === 1) {
        chains.push(`[${duckBedLabels[0]}]anull[${bedsMixLabel}]`);
      } else {
        const inputs = duckBedLabels.map((l) => `[${l}]`).join("");
        chains.push(
          `${inputs}amix=inputs=${duckBedLabels.length}:duration=longest:dropout_transition=0:normalize=0[${bedsMixLabel}]`,
        );
      }
      chains.push(`[vo]asplit=2[vo_main][vo_sc]`);
      chains.push(
        `[${bedsMixLabel}][vo_sc]sidechaincompress=` +
          `threshold=${levels.duckThreshold}:ratio=${levels.duckRatio}:` +
          `attack=${levels.duckAttackMs}:release=${levels.duckReleaseMs}:` +
          `makeup=${levels.duckMakeup}[ducked]`,
      );
      duckedOrBeds = "ducked";
      ducked = true;
    } else {
      chains.push(`[vo]anull[vo_main]`);
    }

    const mixParts: string[] = ["[vo_main]"];
    const weights: string[] = ["1"];
    if (hasDuckBeds) {
      mixParts.push(`[${duckedOrBeds}]`);
      weights.push("0.85");
    }
    for (const label of sfxLabels) {
      mixParts.push(`[${label}]`);
      weights.push("0.95");
    }

    const n = mixParts.length;
    chains.push(
      `${mixParts.join("")}amix=inputs=${n}:duration=first:dropout_transition=0:normalize=0:weights=${weights.join("|")}[pre]`,
    );
    chains.push(
      `[pre]alimiter=limit=${levels.limiterLimit}:attack=${levels.limiterAttackMs}:release=${levels.limiterReleaseMs}[aout]`,
    );
    filterComplex = chains.join(";");
  }

  return {
    inputArgs,
    filterComplex,
    mapLabel: "[aout]",
    diagnostics: {
      sceneAudioUsed,
      sceneAudioSkipped,
      musicUsed,
      ambientUsed,
      sfxCount: sfxList.length,
      visualTimelineSeconds: timeline?.timelineSeconds ?? null,
      ducked,
    },
  };
}

/**
 * Mix voiceover + optional scene/music/ambient/SFX into one stem.
 * Not wired into jobRunner — standalone for later integration.
 */
export async function mixAudioLayers(
  input: AudioMixInput,
): Promise<AudioMixResult> {
  if (!input.voiceover?.path) {
    throw new Error("mixAudioLayers: voiceover.path is required");
  }
  if (
    !Number.isFinite(input.targetDurationSeconds) ||
    input.targetDurationSeconds <= 0
  ) {
    throw new Error("mixAudioLayers: targetDurationSeconds must be > 0");
  }

  const levels = mergeLevels(input.levels);
  const graph = await buildAudioMixGraph(input);

  const args = [
    "-y",
    ...graph.inputArgs,
    "-filter_complex",
    graph.filterComplex,
    "-map",
    graph.mapLabel,
    "-t",
    input.targetDurationSeconds.toFixed(3),
    "-ar",
    String(levels.sampleRate),
    "-ac",
    String(levels.channels),
    "-c:a",
    "pcm_s16le",
    input.outputPath,
  ];

  await runFfmpeg(args, DEFAULT_TIMEOUT_MS, input.signal);

  const duration =
    (await probeAudioDurationSeconds(input.outputPath)) ??
    input.targetDurationSeconds;

  return {
    audioPath: input.outputPath,
    durationSeconds: duration,
    sampleRate: levels.sampleRate,
    channels: levels.channels,
    diagnostics: graph.diagnostics,
  };
}

/** @internal test helper — resolve scene audio placement without running ffmpeg. */
export function resolveSceneAudioPlacement(
  sceneAudio: AudioMixSceneAudio[],
  timelineScenes: AudioMixInput["timelineScenes"],
  transitionSeconds: number,
): Array<{ sceneId: string; startSeconds: number; durationSeconds: number }> {
  const timeline = computeXfadeSceneTimeline(
    (timelineScenes ?? []).map((s) => ({
      sceneId: s.sceneId,
      durationSeconds: s.durationSeconds,
    })),
    transitionSeconds,
  );
  const byId = new Map(timeline.scenes.map((s) => [s.sceneId, s]));
  return sceneAudio
    .filter((s) => s.enabled !== false)
    .map((s) => {
      const entry = byId.get(s.sceneId);
      return {
        sceneId: s.sceneId,
        startSeconds:
          typeof s.startSeconds === "number"
            ? s.startSeconds
            : (entry?.startSeconds ?? 0),
        durationSeconds:
          typeof s.durationSeconds === "number"
            ? s.durationSeconds
            : (entry?.durationSeconds ?? 0),
      };
    });
}
