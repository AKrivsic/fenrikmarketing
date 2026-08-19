import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

function ffprobeBin(): string {
  return process.env.FFPROBE_PATH ?? "ffprobe";
}

export interface ProbedVideoFile {
  hasVideo: boolean;
  hasAudio: boolean;
  durationSeconds: number | null;
}

/**
 * Probe a video buffer via a temporary file + ffprobe (no network).
 */
export async function probeVideoBuffer(buffer: Buffer): Promise<ProbedVideoFile> {
  const dir = await mkdtemp(join(tmpdir(), "fenrik-attempt-probe-"));
  const path = join(dir, "clip.mp4");
  try {
    await writeFile(path, buffer);
    return await probeVideoFile(path);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function probeVideoFile(filePath: string): Promise<ProbedVideoFile> {
  return new Promise((resolve) => {
    let stdout = "";
    const child = spawn(
      ffprobeBin(),
      [
        "-v",
        "error",
        "-show_entries",
        "stream=codec_type:format=duration",
        "-of",
        "json",
        filePath,
      ],
      { stdio: ["ignore", "pipe", "ignore"] },
    );
    child.stdout.on("data", (c: Buffer) => {
      stdout += c.toString();
    });
    child.on("error", () =>
      resolve({ hasVideo: false, hasAudio: false, durationSeconds: null }),
    );
    child.on("close", (code) => {
      if (code !== 0) {
        resolve({ hasVideo: false, hasAudio: false, durationSeconds: null });
        return;
      }
      try {
        const parsed = JSON.parse(stdout) as {
          streams?: { codec_type?: string }[];
          format?: { duration?: string };
        };
        let hasVideo = false;
        let hasAudio = false;
        for (const s of parsed.streams ?? []) {
          if (s.codec_type === "video") hasVideo = true;
          if (s.codec_type === "audio") hasAudio = true;
        }
        const duration = Number.parseFloat(String(parsed.format?.duration ?? ""));
        resolve({
          hasVideo,
          hasAudio,
          durationSeconds:
            Number.isFinite(duration) && duration > 0 ? duration : null,
        });
      } catch {
        resolve({ hasVideo: false, hasAudio: false, durationSeconds: null });
      }
    });
  });
}
