import { spawn } from "node:child_process";
import { writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";

function ffprobeBin(): string {
  return process.env.FFPROBE_PATH ?? "ffprobe";
}

export async function probeAudioBufferDurationSeconds(
  audio: Buffer,
  ext = "mp3",
): Promise<number> {
  const filePath = join(tmpdir(), `fenrik-audio-probe-${randomUUID()}.${ext}`);
  await writeFile(filePath, audio);
  try {
    return await probeAudioFileDurationSeconds(filePath);
  } finally {
    await unlink(filePath).catch(() => undefined);
  }
}

export function probeAudioFileDurationSeconds(
  filePath: string,
): Promise<number> {
  return new Promise((resolve, reject) => {
    let stdout = "";
    const child = spawn(
      ffprobeBin(),
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        filePath,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.on("error", (err) => reject(err));
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error("ffprobe_failed"));
        return;
      }
      const parsed = Number.parseFloat(stdout.trim());
      if (!Number.isFinite(parsed) || parsed <= 0) {
        reject(new Error("invalid_audio_duration"));
        return;
      }
      resolve(parsed);
    });
  });
}

export const TEXT_TO_VIDEO_AUDIO_MIN_SECONDS = 18;
export const TEXT_TO_VIDEO_AUDIO_MAX_SECONDS = 30;

export function assertAcceptableVoiceoverDuration(seconds: number): void {
  if (seconds < TEXT_TO_VIDEO_AUDIO_MIN_SECONDS) {
    throw new Error("voiceover_audio_too_short");
  }
  if (seconds > TEXT_TO_VIDEO_AUDIO_MAX_SECONDS) {
    throw new Error("voiceover_audio_too_long");
  }
}
