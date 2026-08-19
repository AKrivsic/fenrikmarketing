import { spawn } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import {
  TEXT_TO_VIDEO_ASSEMBLY_DELIVERY_HEIGHT,
  TEXT_TO_VIDEO_ASSEMBLY_DELIVERY_WIDTH,
} from "@/lib/text-to-video/textToVideoAssemblyConstants";

function ffprobeBin(): string {
  return process.env.FFPROBE_PATH ?? "ffprobe";
}

async function ffprobeJson(filePath: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let stdout = "";
    const child = spawn(
      ffprobeBin(),
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration:stream=codec_type,width,height",
        "-of",
        "json",
        filePath,
      ],
      { stdio: ["ignore", "pipe", "ignore"] },
    );
    child.stdout.on("data", (c: Buffer) => {
      stdout += c.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) reject(new Error("ffprobe_failed"));
      else resolve(JSON.parse(stdout) as Record<string, unknown>);
    });
  });
}

export async function validateTextToVideoFinalMp4(args: {
  mp4Path: string;
  expectedDurationSeconds: number;
  durationToleranceSeconds?: number;
}): Promise<void> {
  await access(args.mp4Path);
  const probed = await ffprobeJson(args.mp4Path);
  const streams = (probed.streams as { codec_type?: string; width?: number; height?: number }[]) ?? [];
  const hasVideo = streams.some((s) => s.codec_type === "video");
  const hasAudio = streams.some((s) => s.codec_type === "audio");
  if (!hasVideo || !hasAudio) {
    throw new Error("final_mp4_missing_av_stream");
  }
  const video = streams.find((s) => s.codec_type === "video");
  if (
    video?.width !== TEXT_TO_VIDEO_ASSEMBLY_DELIVERY_WIDTH ||
    video?.height !== TEXT_TO_VIDEO_ASSEMBLY_DELIVERY_HEIGHT
  ) {
    throw new Error("final_mp4_resolution_invalid");
  }
  const format = probed.format as { duration?: string } | undefined;
  const dur = format?.duration ? Number(format.duration) : NaN;
  const tol = args.durationToleranceSeconds ?? 1.5;
  if (!Number.isFinite(dur) || Math.abs(dur - args.expectedDurationSeconds) > tol) {
    throw new Error("final_mp4_duration_invalid");
  }
}

export async function validateTextToVideoThumbnail(args: {
  thumbnailPath: string;
}): Promise<void> {
  await access(args.thumbnailPath);
  const buf = await readFile(args.thumbnailPath);
  if (buf.length < 256) throw new Error("thumbnail_empty");
}

export function validateTextToVideoSrtContent(args: {
  srt: string | undefined;
  approvedVoiceover: string;
}): void {
  if (!args.srt?.trim()) return;
  const lower = args.srt.toLowerCase();
  if (lower.includes("<break") || lower.includes("[pause")) {
    throw new Error("srt_contains_tags");
  }
  const normVo = args.approvedVoiceover.replace(/\s+/g, " ").trim().toLowerCase();
  const words = normVo.split(/\s+/).filter((w) => w.length > 3);
  const hit = words.some((w) => args.srt!.toLowerCase().includes(w));
  if (!hit && normVo.length > 8) {
    throw new Error("srt_voiceover_mismatch");
  }
}
