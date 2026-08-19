import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { probeVideoBuffer } from "@/lib/scene-video-attempts/probeOutput";

export type SceneClipValidationOutcome =
  | { ok: true }
  | { ok: false; code: "needs_review"; reason: string };

const PORTRAIT_WIDTH = 720;
const PORTRAIT_HEIGHT = 1280;

function ffprobeBin(): string {
  return process.env.FFPROBE_PATH ?? "ffprobe";
}

async function probeDimensions(
  filePath: string,
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    let stdout = "";
    const child = spawn(
      ffprobeBin(),
      [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height",
        "-of",
        "json",
        filePath,
      ],
      { stdio: ["ignore", "pipe", "ignore"] },
    );
    child.stdout.on("data", (c: Buffer) => {
      stdout += c.toString();
    });
    child.on("error", () => resolve(null));
    child.on("close", (code) => {
      if (code !== 0) {
        resolve(null);
        return;
      }
      try {
        const parsed = JSON.parse(stdout) as {
          streams?: { width?: number; height?: number }[];
        };
        const stream = parsed.streams?.[0];
        if (!stream?.width || !stream.height) {
          resolve(null);
          return;
        }
        resolve({ width: stream.width, height: stream.height });
      } catch {
        resolve(null);
      }
    });
  });
}

export async function validateTextToVideoSceneClipBuffer(args: {
  buffer: Buffer;
  minDurationSeconds: number;
  providerDurationSeconds: number;
}): Promise<SceneClipValidationOutcome> {
  const probed = await probeVideoBuffer(args.buffer);
  if (!probed.hasVideo) {
    return { ok: false, code: "needs_review", reason: "invalid_mp4_no_video" };
  }
  if (
    probed.durationSeconds === null ||
    probed.durationSeconds + 0.05 < args.minDurationSeconds
  ) {
    return { ok: false, code: "needs_review", reason: "clip_too_short" };
  }
  const dir = await mkdtemp(join(tmpdir(), "fenrik-t2v-clip-"));
  const path = join(dir, "clip.mp4");
  try {
    await writeFile(path, args.buffer);
    const dims = await probeDimensions(path);
    if (!dims) {
      return { ok: false, code: "needs_review", reason: "invalid_mp4_probe" };
    }
    if (dims.width !== PORTRAIT_WIDTH || dims.height !== PORTRAIT_HEIGHT) {
      return {
        ok: false,
        code: "needs_review",
        reason: "portrait_resolution_mismatch",
      };
    }
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
  return { ok: true };
}
