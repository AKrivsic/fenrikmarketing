import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import { buildZoompanExpr, xfadeTransitionName } from "@/lib/video-engine/motion";
import { SHORT_PROFILE, type MotionType, type TransitionType } from "@/lib/video-engine/storyboard";
import {
  probeAudioDurationSeconds,
  probeMediaStreams,
} from "@/video-worker/services/tts";

// Video Quality V2 — a render beat: one still shown with motion for a short
// duration, joined to the previous beat by a light transition.
export interface RenderBeat {
  sceneId: string;
  motion: MotionType;
  transition: TransitionType;
  durationSeconds: number;
}

export interface RenderMp4Input {
  images: { sceneId: string; imagePath: string }[];
  // V2 timeline. When omitted (or a single beat), a still-with-motion clip is
  // produced from the first image so the pipeline stays functional.
  beats?: RenderBeat[];
  audioPath: string;
  srtPath?: string;
  outputPath: string;
  durationSeconds?: number;
  // Content Quality Sprint 2 — seconds of silence appended to the audio so the
  // storyboard's final-beat hold survives. Omitted/<=0 keeps the audio untouched.
  tailPadSeconds?: number;
  // Subtitle Reliability V1 (Part A) — the MEASURED voiceover duration. AUDIO is
  // the single source of truth: the final MP4 duration is forced (explicit -t)
  // to audioDurationSeconds + tailPadSeconds, so the video can never end before
  // the audio. When absent the renderer probes the audio file itself.
  audioDurationSeconds?: number;
  // Internal — the resolved target duration (audio + tail) propagated to the
  // arg builders. Callers normally leave this unset; renderMp4 fills it in.
  targetDurationSeconds?: number;
  // Output geometry / pace. Defaults to the vertical Short profile.
  profile?: { width: number; height: number; fps: number; transitionSeconds: number };
}

// Subtitle Reliability V1 (Part A + G) — diagnostics recorded after every
// render. Never throws and never fails a render: purely observational.
export interface RenderDiagnostics {
  audioDuration: number | null;
  videoDuration: number | null;
  durationDelta: number | null;
  targetDuration: number | null;
  // Video Duration Audit V1 — per-STAGE durations so the exact point any future
  // truncation is introduced is provable from the debug payload alone:
  //   intermediateVideoDuration — video stream after the xfade chain + freeze.
  //   postMuxDuration           — audio stream after the mux (the intermediate).
  //   postSubtitleDuration      — final video stream after the subtitle burn.
  // All best-effort (null when the probe failed).
  intermediateVideoDuration: number | null;
  postMuxDuration: number | null;
  postSubtitleDuration: number | null;
  renderWarning: boolean;
  renderWarnings: string[];
}

export interface RenderMp4Result {
  mp4Path: string;
  diagnostics: RenderDiagnostics;
}

export interface GenerateThumbnailInput {
  mp4Path: string;
  outputPath: string;
}

export interface GenerateThumbnailResult {
  thumbnailPath: string;
}

const DEFAULT_TIMEOUT_MS = Number(
  process.env.VIDEO_WORKER_FFMPEG_TIMEOUT_MS ?? 10 * 60 * 1000,
);

// Subtitle styling (Task 4): large, high-contrast, lifted off the bottom edge.
// FontSize is in the libass script scale; Outline/Shadow keep it readable over
// any still. Alignment=2 is bottom-center.
const SUBTITLE_FORCE_STYLE =
  "FontSize=16,Bold=1,Outline=2,Shadow=1,MarginV=120,Alignment=2";

// Upscale factor for the still before zoompan, so the motion crop stays crisp.
const SCALE_HEADROOM = 1.4;

// Minimum clone-hold after xfade. Must be generous: xfade PTS length often exceeds
// the beat-sum timeline (frame rounding), and a short stop_duration does not
// materialize enough frames — output -t alone cannot fix that.
const FINAL_FRAME_FREEZE_SECONDS = 30;
// Extra seconds above (target - timeline) when sizing tpad for the audio target.
const VIDEO_EXTENSION_MARGIN_SECONDS = 5;

// Subtitle Reliability V1 (Part A) — max allowed |video - audio| in the final
// MP4 before a render_warning is recorded.
const DURATION_DELTA_WARNING_SECONDS = 0.25;

function ffmpegBin(): string {
  return process.env.FFMPEG_PATH ?? "ffmpeg";
}

function runFfmpeg(args: string[], timeoutMs = DEFAULT_TIMEOUT_MS): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegBin(), args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      reject(new Error(`ffmpeg timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
      if (stderr.length > 16_384) stderr = stderr.slice(-16_384);
    });

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`ffmpeg failed to start: ${err.message}`));
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}: ${stderr.trim()}`));
      }
    });
  });
}

// Escapes a filesystem path for libavfilter option values (e.g. subtitles
// filename=). \, :, ', ,, [, ] must be backslash-escaped when passed unquoted.
function escapeForSubtitlesFilter(path: string): string {
  return path
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/,/g, "\\,")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
}

function subtitlesFilter(srtPath: string): string {
  return `subtitles=filename=${escapeForSubtitlesFilter(srtPath)}:force_style='${SUBTITLE_FORCE_STYLE}'`;
}

function hasTarget(input: RenderMp4Input): boolean {
  return (
    typeof input.targetDurationSeconds === "number" &&
    Number.isFinite(input.targetDurationSeconds) &&
    input.targetDurationSeconds > 0
  );
}

// Resolves how the audio stream is mapped for the INTERMEDIATE (audio-muxed,
// subtitle-free) render.
//   - With an explicit target: pad the audio with silence indefinitely (`apad`)
//     so it always reaches the target; the output `-t` does the cutting. This is
//     explicit duration control — `apad`/`-shortest` are no longer the duration
//     mechanism, only a guarantee the stream is long enough.
//   - Without a target (legacy fallback only): the historical `apad=pad_dur` +
//     `-shortest` behaviour.
function resolveAudioMapping(
  audioInputIndex: number,
  input: RenderMp4Input,
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

// Output codec/duration tail shared by the intermediate render paths.
function outputArgs(input: RenderMp4Input, fps: number): string[] {
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

// Builds the per-beat motion chain: upscale the still, apply zoompan motion for
// the beat's frames, trim to the exact duration and normalize for xfade.
function beatVideoChain(
  inputIndex: number,
  motion: MotionType,
  durationSeconds: number,
  width: number,
  height: number,
  fps: number,
  // When false, the clip is not trimmed (single-still fallback relies on the
  // output -t / -shortest to bound it to the audio so the voiceover is never cut).
  trim = true,
): { chain: string; label: string } {
  const bigW = Math.round(width * SCALE_HEADROOM);
  const bigH = Math.round(height * SCALE_HEADROOM);
  const frames = Math.max(1, Math.round(durationSeconds * fps));
  const { z, x, y } = buildZoompanExpr(motion, frames);
  const label = `v${inputIndex}`;

  const chain =
    `[${inputIndex}:v]` +
    `scale=${bigW}:${bigH}:force_original_aspect_ratio=increase,` +
    `crop=${bigW}:${bigH},` +
    `zoompan=z='${z}':x='${x}':y='${y}':d=1:s=${width}x${height}:fps=${fps},` +
    (trim ? `trim=duration=${durationSeconds},` : "") +
    `setpts=PTS-STARTPTS,` +
    `setsar=1,format=yuv420p[${label}]`;

  return { chain, label };
}

// Video Stream Extension V2 — xfade timeline length (seconds) after overlaps.
export function computeXfadeTimelineSeconds(
  beats: RenderBeat[],
  transitionSeconds: number,
): number {
  if (beats.length === 0) return 0;
  let cumulative = beats[0].durationSeconds;
  for (let i = 1; i < beats.length; i++) {
    const td = Math.min(transitionSeconds, beats[i].durationSeconds / 2);
    cumulative = cumulative - td + beats[i].durationSeconds;
  }
  return cumulative;
}

// Legacy tail-pad hold (no measured audio target).
function finalFreezeStage(currentLabel: string, videoLabel: string): string {
  return `[${currentLabel}]tpad=stop_mode=1:stop_duration=${FINAL_FRAME_FREEZE_SECONDS.toFixed(3)}[${videoLabel}]`;
}

// Video Stream Extension V2 — after the xfade chain, clone the last frame and
// concat until the stream is at least the audio target, then trim to the exact
// target. Output `-t` can cap mux duration but cannot create missing frames; this
// stage materializes them in the filtergraph before encode.
function extendVideoToTargetDuration(
  inLabel: string,
  outLabel: string,
  targetSeconds: number,
  timelineSeconds: number,
): string {
  const target = targetSeconds.toFixed(3);
  // Always clone-hold then trim. The beat-sum timeline (and even xfade PTS length)
  // can match the audio target within a frame while the joined stream is still
  // shorter than that target — trim-only then caps a ~one-beat stream (~5s) even
  // though -t on the mux forces full-length audio.
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

// MVP-compatible single still path (also used when there is just one beat). Adds
// a gentle zoom-in so even a one-image video is never fully static. Produces the
// INTERMEDIATE (audio-muxed, SUBTITLE-FREE) video — subtitles are burned in a
// dedicated second pass (buildSubtitleBurnArgs). Exported for dependency-free
// arg-construction tests.
export function buildSingleImageArgs(input: RenderMp4Input): string[] {
  const profile = input.profile ?? SHORT_PROFILE;
  const primaryImage = input.images[0].imagePath;
  // No trim: the output -t (or -shortest) bounds the clip to the audio target,
  // so the voiceover is never cut. The slow zoom completes then holds.
  const { chain, label } = beatVideoChain(
    0,
    "zoom_in",
    input.targetDurationSeconds ?? input.durationSeconds ?? 30,
    profile.width,
    profile.height,
    profile.fps,
    false,
  );

  const videoLabel = "vout";
  // Looped still + zoompan is unbounded; output -t bounds to the audio target.
  const videoFilter = `${chain};[${label}]null[${videoLabel}]`;

  const audioInputIndex = 1;
  const audio = resolveAudioMapping(audioInputIndex, input);
  const filter = audio.filter
    ? `${videoFilter};${audio.filter}`
    : videoFilter;
  const args: string[] = [
    "-y",
    "-loop",
    "1",
    "-i",
    primaryImage,
    "-i",
    input.audioPath,
    "-filter_complex",
    filter,
    "-map",
    `[${videoLabel}]`,
    "-map",
    audio.mapLabel,
    ...outputArgs(input, profile.fps),
  ];
  return args;
}

// Multi-beat path: each beat is a moving clip; consecutive beats are joined with
// a light xfade transition. Produces the INTERMEDIATE (audio-muxed,
// SUBTITLE-FREE) video — libass never touches the xfade graph. Subtitles are
// burned in a dedicated second pass (buildSubtitleBurnArgs). Exported for
// dependency-free arg-construction tests.
export function buildMultiBeatArgs(
  input: RenderMp4Input,
  beats: RenderBeat[],
): string[] {
  const profile = input.profile ?? SHORT_PROFILE;
  const { width, height, fps, transitionSeconds } = profile;

  const imageBySceneId = new Map(input.images.map((img) => [img.sceneId, img]));

  const inputArgs: string[] = [];
  const chains: string[] = [];
  const beatLabels: string[] = [];

  beats.forEach((beat, index) => {
    const image = imageBySceneId.get(beat.sceneId) ?? input.images[0];
    inputArgs.push("-loop", "1", "-t", String(beat.durationSeconds), "-i", image.imagePath);
    const { chain, label } = beatVideoChain(
      index,
      beat.motion,
      beat.durationSeconds,
      width,
      height,
      fps,
    );
    chains.push(chain);
    beatLabels.push(label);
  });

  // Chain the beats with xfade. Each transition overlaps the running timeline by
  // transitionSeconds, so the cumulative offset subtracts the prior overlaps.
  let currentLabel = beatLabels[0];
  let cumulative = beats[0].durationSeconds;
  const xfadeChains: string[] = [];
  for (let i = 1; i < beats.length; i++) {
    const td = Math.min(transitionSeconds, beats[i].durationSeconds / 2);
    const offset = Math.max(0, cumulative - td);
    const outLabel = i === beats.length - 1 ? "vjoined" : `x${i}`;
    const name = xfadeTransitionName(beats[i].transition);
    xfadeChains.push(
      `[${currentLabel}][${beatLabels[i]}]xfade=transition=${name}:duration=${td.toFixed(3)}:offset=${offset.toFixed(3)}[${outLabel}]`,
    );
    currentLabel = outLabel;
    cumulative = cumulative - td + beats[i].durationSeconds;
  }

  const videoLabel = "vout";
  const timelineSeconds = computeXfadeTimelineSeconds(beats, transitionSeconds);
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
        ? finalFreezeStage(currentLabel, videoLabel)
        : `[${currentLabel}]null[${videoLabel}]`;

  // Audio is the last input.
  const audioInputIndex = beats.length;
  const audio = resolveAudioMapping(audioInputIndex, input);

  const filter = [
    ...chains,
    ...xfadeChains,
    finalChain,
    ...(audio.filter ? [audio.filter] : []),
  ].join(";");

  const args: string[] = [
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
  return args;
}

// Subtitle Reliability V1 (Part B) — DEDICATED final subtitle pass. libass burns
// the SRT onto the already-flattened intermediate video only; the audio is copied
// verbatim so the verified durations are preserved. This is the single place
// subtitles are rendered, so they can never be lost inside the xfade graph.
// Exported for dependency-free arg-construction tests.
export function buildSubtitleBurnArgs(
  intermediatePath: string,
  srtPath: string,
  outputPath: string,
  // Video Duration Audit V1 — targetDurationSeconds bounds the FINAL output to
  // the audio master (audio + tail) with an explicit -t, exactly like the
  // intermediate. The intermediate is already exact, so this is defensive: it
  // guarantees the LAST stage can never reintroduce drift (e.g. a libass tail
  // event extending the timeline). Omitted -> inherit the intermediate length.
  options?: { fps?: number; targetDurationSeconds?: number },
): string[] {
  const fps = options?.fps;
  const target = options?.targetDurationSeconds;
  const tail =
    typeof target === "number" && Number.isFinite(target) && target > 0
      ? ["-t", target.toFixed(3)]
      : [];
  return [
    "-y",
    "-i",
    intermediatePath,
    "-vf",
    subtitlesFilter(srtPath),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    ...(typeof fps === "number" ? ["-r", String(fps)] : []),
    "-c:a",
    "copy",
    ...tail,
    outputPath,
  ];
}

// Renders the final MP4 in two passes:
//   Pass 1 — images -> xfade chain -> mux audio -> intermediate video (no subs).
//   Pass 2 — burn subtitles onto the intermediate -> final output.
// AUDIO is the single source of truth: the intermediate is forced to
// audioDuration + tailPad via an explicit -t (not -shortest/filtergraph
// convergence). After the render, both stream durations are probed and a
// render_warning is recorded when they drift by more than the threshold.
export async function renderMp4(input: RenderMp4Input): Promise<RenderMp4Result> {
  if (input.images.length === 0) {
    throw new Error("renderMp4: at least one image is required");
  }

  const tail =
    typeof input.tailPadSeconds === "number" &&
    Number.isFinite(input.tailPadSeconds) &&
    input.tailPadSeconds > 0
      ? input.tailPadSeconds
      : 0;

  // Resolve the audio master clock. Prefer the measured value the caller passed;
  // otherwise probe the audio file. Either way AUDIO drives the target duration.
  let audioDuration = input.audioDurationSeconds ?? null;
  if (audioDuration === null) {
    audioDuration = (await probeAudioDurationSeconds(input.audioPath)) ?? null;
  }
  const targetDuration =
    audioDuration !== null && audioDuration > 0 ? audioDuration + tail : undefined;

  // Pass 1 — intermediate (audio-muxed, subtitle-free).
  const intermediatePath = `${input.outputPath}.intermediate.mp4`;
  const pass1Input: RenderMp4Input = {
    ...input,
    outputPath: intermediatePath,
    ...(targetDuration !== undefined
      ? { targetDurationSeconds: targetDuration }
      : {}),
  };
  const pass1Args =
    input.beats && input.beats.length >= 2
      ? buildMultiBeatArgs(pass1Input, input.beats)
      : buildSingleImageArgs(pass1Input);
  await runFfmpeg(pass1Args);

  const profile = input.profile ?? SHORT_PROFILE;

  // Video Duration Audit V1 — probe the intermediate BEFORE it is deleted so the
  // mux stage durations are recorded. Best-effort: a probe failure never affects
  // the render, only the diagnostics.
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
    // Diagnostics only — ignore.
  }

  try {
    // Pass 2 — dedicated subtitle burn (or passthrough when there are no subs).
    // Both branches force the FINAL duration to the audio master with -t when a
    // target is known, so the last stage can never end before the audio.
    if (input.srtPath) {
      await runFfmpeg(
        buildSubtitleBurnArgs(intermediatePath, input.srtPath, input.outputPath, {
          fps: profile.fps,
          ...(targetDuration !== undefined
            ? { targetDurationSeconds: targetDuration }
            : {}),
        }),
      );
    } else {
      // No subtitles: re-mux the intermediate to the final path (stream copy).
      await runFfmpeg([
        "-y",
        "-i",
        intermediatePath,
        "-c",
        "copy",
        ...(targetDuration !== undefined
          ? ["-t", targetDuration.toFixed(3)]
          : []),
        input.outputPath,
      ]);
    }
  } finally {
    await rm(intermediatePath, { force: true }).catch(() => undefined);
  }

  // Post-render verification (Part A + G). Best-effort, never throws.
  const diagnostics = await verifyRender({
    outputPath: input.outputPath,
    audioDuration,
    targetDuration: targetDuration ?? null,
    intermediateVideoDuration,
    postMuxDuration,
  });

  return { mp4Path: input.outputPath, diagnostics };
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
    // The video must never END BEFORE the audio.
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
    // The final video stream IS the post-subtitle-pass duration.
    postSubtitleDuration: videoDuration,
    renderWarning: warnings.length > 0,
    renderWarnings: warnings,
  };
}

// Extracts the first frame of the rendered mp4 as a PNG thumbnail.
export async function generateThumbnail(
  input: GenerateThumbnailInput,
): Promise<GenerateThumbnailResult> {
  const args = [
    "-y",
    "-i",
    input.mp4Path,
    "-frames:v",
    "1",
    "-q:v",
    "2",
    input.outputPath,
  ];
  await runFfmpeg(args);
  return { thumbnailPath: input.outputPath };
}
