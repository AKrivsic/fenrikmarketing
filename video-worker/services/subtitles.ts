import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export interface WriteSrtFileInput {
  subtitles?: string;
  voiceoverText: string;
  durationSeconds?: number;
}

export interface WriteSrtFileResult {
  srtPath: string;
}

const DEFAULT_DURATION_SECONDS = 10;

function workerTempDir(): string {
  return (
    process.env.VIDEO_WORKER_TEMP_DIR ?? join(process.cwd(), ".video-worker-tmp")
  );
}

// Formats a duration in seconds as an SRT timestamp: HH:MM:SS,mmm.
function toSrtTimestamp(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const ms = Math.round((clamped - Math.floor(clamped)) * 1000);
  const whole = Math.floor(clamped);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const seconds = whole % 60;
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(ms, 3)}`;
}

// MVP subtitles: a single SRT cue spanning the whole clip. Prefers the provided
// subtitles text, otherwise falls back to the voiceover text. Timing runs from
// 0 to durationSeconds (or a 10s default).
export async function writeSrtFile(
  input: WriteSrtFileInput,
): Promise<WriteSrtFileResult> {
  const rawText = (input.subtitles ?? input.voiceoverText ?? "").trim();
  const text = rawText.length > 0 ? rawText : " ";

  const end =
    input.durationSeconds && input.durationSeconds > 0
      ? input.durationSeconds
      : DEFAULT_DURATION_SECONDS;

  const cue = `1\n${toSrtTimestamp(0)} --> ${toSrtTimestamp(end)}\n${text}\n`;

  const dir = workerTempDir();
  await mkdir(dir, { recursive: true });
  const srtPath = join(dir, `subtitles-${randomUUID()}.srt`);
  await writeFile(srtPath, cue, "utf8");

  return { srtPath };
}
