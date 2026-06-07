import { spawn } from "node:child_process";

export interface RenderMp4Input {
  images: { sceneId: string; imagePath: string }[];
  audioPath: string;
  srtPath?: string;
  outputPath: string;
  durationSeconds?: number;
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
  process.env.VIDEO_WORKER_FFMPEG_TIMEOUT_MS ?? 5 * 60 * 1000,
);

function ffmpegBin(): string {
  return process.env.FFMPEG_PATH ?? "ffmpeg";
}

// Runs ffmpeg once with a hard timeout. Rejects on non-zero exit, spawn error,
// or timeout (killing the process) — captured stderr is included for debugging.
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

// Escapes a filesystem path for libavfilter option values (e.g. subtitles filename=).
// See FFmpeg filtergraph escaping: \, :, ', ,, [, ] must be backslash-escaped when
// the path is passed unquoted after `filename=`.
function escapeForSubtitlesFilter(path: string): string {
  return path
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/,/g, "\\,")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
}

// MVP render: a single still image looped over the voiceover audio, h264/aac.
// With multiple scene images we fall back to the FIRST image (no multi-scene
// editor in MVP). Subtitles are burned in when an srtPath is provided.
export async function renderMp4(input: RenderMp4Input): Promise<RenderMp4Result> {
  if (input.images.length === 0) {
    throw new Error("renderMp4: at least one image is required");
  }

  const primaryImage = input.images[0].imagePath;

  const args: string[] = [
    "-y",
    "-loop",
    "1",
    "-i",
    primaryImage,
    "-i",
    input.audioPath,
  ];

  // Even dimensions are required by yuv420p; burn-in subtitles when present.
  const scaleFilter = "scale=trunc(iw/2)*2:trunc(ih/2)*2";
  const vf = input.srtPath
    ? `${scaleFilter},subtitles=filename=${escapeForSubtitlesFilter(input.srtPath)}`
    : scaleFilter;

  args.push("-vf", vf);
  args.push(
    "-c:v",
    "libx264",
    "-tune",
    "stillimage",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
  );

  // Bound the clip: audio length by default; an explicit duration wins.
  if (input.durationSeconds && input.durationSeconds > 0) {
    args.push("-t", String(input.durationSeconds));
  } else {
    args.push("-shortest");
  }

  args.push(input.outputPath);

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
