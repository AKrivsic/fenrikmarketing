import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { probeVideoBuffer } from "@/lib/scene-video-attempts/probeOutput";

function ffmpegBin(): string {
  return process.env.FFMPEG_PATH ?? "ffmpeg";
}

export async function trimTextToVideoSceneClip(args: {
  inputBuffer: Buffer;
  requiredTrimSeconds: number;
}): Promise<Buffer> {
  if (args.requiredTrimSeconds <= 0) {
    throw new Error("trim_duration_invalid");
  }
  const dir = await mkdtemp(join(tmpdir(), "fenrik-t2v-trim-"));
  const inputPath = join(dir, "in.mp4");
  const outputPath = join(dir, "out.mp4");
  try {
    await writeFile(inputPath, args.inputBuffer);
    const probed = await probeVideoBuffer(args.inputBuffer);
    if (
      probed.durationSeconds !== null &&
      probed.durationSeconds + 0.05 < args.requiredTrimSeconds
    ) {
      throw new Error("trim_source_too_short");
    }
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        ffmpegBin(),
        [
          "-y",
          "-i",
          inputPath,
          "-t",
          String(args.requiredTrimSeconds),
          "-vf",
          "scale=720:1280",
          "-c:v",
          "libx264",
          "-pix_fmt",
          "yuv420p",
          "-an",
          "-movflags",
          "+faststart",
          outputPath,
        ],
        { stdio: ["ignore", "ignore", "pipe"] },
      );
      let err = "";
      child.stderr.on("data", (c: Buffer) => {
        err += c.toString();
      });
      child.on("error", reject);
      child.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(err.slice(0, 500) || "ffmpeg_trim_failed"));
      });
    });
    return await readFile(outputPath);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}
