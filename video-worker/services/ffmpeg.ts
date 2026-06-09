import { spawn } from "node:child_process";
import { buildZoompanExpr, xfadeTransitionName } from "@/lib/video-engine/motion";
import { SHORT_PROFILE, type MotionType, type TransitionType } from "@/lib/video-engine/storyboard";

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
  // Content Quality Sprint 2 — seconds of silence appended to the audio (apad)
  // so the storyboard's final-beat hold survives -shortest. Omitted/<=0 keeps
  // the audio untouched (backward compatible).
  tailPadSeconds?: number;
  // Output geometry / pace. Defaults to the vertical Short profile.
  profile?: { width: number; height: number; fps: number; transitionSeconds: number };
}

export interface RenderMp4Result {
  mp4Path: string;
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

// End-of-video silence — how long the FINAL frame is frozen (cloned) past the
// end of the beat timeline in the multi-beat path. The audio carries the real
// voiceover + `apad` silence and `-shortest` bounds the muxed file to whichever
// stream ends first. The multi-beat video is a fixed sum of independently
// rounded beat durations computed from the *measured* voiceover length, while
// the audio is the *real* file padded by the tail; if the two drift (per-beat
// rounding, xfade clamping, or — worst case — a failed duration probe that fell
// back to the words-per-second estimate) `-shortest` would otherwise truncate
// the spoken track or the silent hold. Freezing the final frame well past the
// audio makes the VIDEO always the longer stream, so `-shortest` ends the file
// exactly when the padded audio ends: voiceover -> tail silence -> hold -> end.
// ffmpeg stops muxing the frozen frames as soon as the audio ends, so an
// over-long hold costs nothing.
const FINAL_FRAME_FREEZE_SECONDS = 30;

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

// Content Quality Sprint 2 — resolves how the audio stream is mapped. When a
// tail pad is requested the audio is routed through the filtergraph with `apad`
// so it gains exactly `tailPadSeconds` of trailing silence (the final beat's
// hold), and the output maps the padded label. Otherwise the raw audio stream
// is mapped directly (unchanged behavior).
function resolveAudioMapping(
  audioInputIndex: number,
  tailPadSeconds: number | undefined,
): { filter: string | null; mapLabel: string } {
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

// Builds the per-beat motion chain: upscale the still, apply zoompan motion for
// the beat's frames, trim to the exact duration and normalize for xfade.
function beatVideoChain(
  inputIndex: number,
  motion: MotionType,
  durationSeconds: number,
  width: number,
  height: number,
  fps: number,
  // When false, the clip is not trimmed (single-still fallback relies on
  // -shortest to bound it to the audio so the voiceover is never cut).
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

// MVP-compatible single still path (also used when there is just one beat). Adds
// a gentle zoom-in so even a one-image video is never fully static. Exported for
// dependency-free arg-construction tests (scripts/check-end-silence.ts).
export function buildSingleImageArgs(input: RenderMp4Input): string[] {
  const profile = input.profile ?? SHORT_PROFILE;
  const primaryImage = input.images[0].imagePath;
  // No trim: -shortest bounds the clip to the audio, so the voiceover is never
  // cut. The slow zoom completes over ~maxDuration frames and then holds.
  const { chain, label } = beatVideoChain(
    0,
    "zoom_in",
    input.durationSeconds ?? 30,
    profile.width,
    profile.height,
    profile.fps,
    false,
  );

  const videoLabel = "vout";
  const videoFilter = input.srtPath
    ? `${chain};[${label}]${subtitlesFilter(input.srtPath)}[${videoLabel}]`
    : `${chain};[${label}]null[${videoLabel}]`;

  const audioInputIndex = 1;
  const audio = resolveAudioMapping(audioInputIndex, input.tailPadSeconds);
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
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-r",
    String(profile.fps),
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-shortest",
    input.outputPath,
  ];
  return args;
}

// Multi-beat path (Task 2 + 3 + 7): each beat is a moving clip; consecutive
// beats are joined with a light xfade transition; subtitles are burned onto the
// final stream. A single ffmpeg invocation builds the whole filtergraph.
// Exported for dependency-free arg-construction tests
// (scripts/check-end-silence.ts).
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

  // Burn subtitles onto the joined stream (or pass through), then — when a tail
  // pad is requested — freeze the FINAL frame so the video outlasts the padded
  // audio. With `-shortest` the file ends exactly when the audio ends (voiceover
  // + apad silence), so the last subtitle stays readable through the silent hold
  // and the voiceover is never truncated by beat/audio drift. See
  // FINAL_FRAME_FREEZE_SECONDS.
  const videoLabel = "vout";
  const hasTailPad =
    typeof input.tailPadSeconds === "number" &&
    Number.isFinite(input.tailPadSeconds) &&
    input.tailPadSeconds > 0;
  const subtitleStage = input.srtPath
    ? `[${currentLabel}]${subtitlesFilter(input.srtPath)}`
    : `[${currentLabel}]null`;
  const finalChain = hasTailPad
    ? `${subtitleStage}[vsub];[vsub]tpad=stop_mode=clone:stop_duration=${FINAL_FRAME_FREEZE_SECONDS.toFixed(3)}[${videoLabel}]`
    : `${subtitleStage}[${videoLabel}]`;

  // Audio is the last input.
  const audioInputIndex = beats.length;
  const audio = resolveAudioMapping(audioInputIndex, input.tailPadSeconds);

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
    "-shortest",
    input.outputPath,
  ];
  return args;
}

// Renders the final MP4. Uses the multi-beat motion+transition path when a beat
// timeline with at least two beats is provided; otherwise renders a single
// moving still (backward compatible, never static).
export async function renderMp4(input: RenderMp4Input): Promise<RenderMp4Result> {
  if (input.images.length === 0) {
    throw new Error("renderMp4: at least one image is required");
  }

  const args =
    input.beats && input.beats.length >= 2
      ? buildMultiBeatArgs(input, input.beats)
      : buildSingleImageArgs(input);

  await runFfmpeg(args);
  return { mp4Path: input.outputPath };
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
