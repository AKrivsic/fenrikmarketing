import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { probeVideoBuffer } from "@/lib/scene-video-attempts/probeOutput";
import {
  buildTextToVideoTrimmedClipPath,
  TEXT_TO_VIDEO_TRIM_BUCKET,
} from "@/lib/text-to-video/textToVideoReelBridge";
import { validateTextToVideoSceneClipBuffer } from "@/lib/text-to-video/validateSceneClip";

export async function uploadOrReuseTrimmedSceneClip(args: {
  supabase: SupabaseClient;
  projectId: string;
  videoJobId: string;
  sceneId: string;
  executionFingerprint: string;
  requestFingerprint: string;
  requiredTrimSeconds: number;
  providerDurationSeconds: number;
  trimmedBuffer: Buffer;
}): Promise<{ bucket: string; path: string; sha256: string }> {
  const path = buildTextToVideoTrimmedClipPath({
    projectId: args.projectId,
    videoJobId: args.videoJobId,
    sceneId: args.sceneId,
    executionFingerprint: args.executionFingerprint,
    requestFingerprint: args.requestFingerprint,
    requiredTrimSeconds: args.requiredTrimSeconds,
  });
  const bucket = TEXT_TO_VIDEO_TRIM_BUCKET;

  const { data: existingBlob, error: dlErr } = await args.supabase.storage
    .from(bucket)
    .download(path);
  if (!dlErr && existingBlob) {
    const buf = Buffer.from(await existingBlob.arrayBuffer());
    const valid = await validateTextToVideoSceneClipBuffer({
      buffer: buf,
      minDurationSeconds: args.requiredTrimSeconds,
      providerDurationSeconds: args.providerDurationSeconds,
    });
    if (valid.ok) {
      const probed = await probeVideoBuffer(buf);
      if (
        probed.durationSeconds !== null &&
        probed.durationSeconds + 0.08 >= args.requiredTrimSeconds
      ) {
        const sha256 = createHashHex(buf);
        return { bucket, path, sha256 };
      }
    }
  }

  const validNew = await validateTextToVideoSceneClipBuffer({
    buffer: args.trimmedBuffer,
    minDurationSeconds: args.requiredTrimSeconds,
    providerDurationSeconds: args.providerDurationSeconds,
  });
  if (!validNew.ok) {
    throw new Error(`trimmed_clip_invalid:${validNew.reason}`);
  }

  const { error: upErr } = await args.supabase.storage
    .from(bucket)
    .upload(path, args.trimmedBuffer, {
      contentType: "video/mp4",
      upsert: false,
    });
  if (upErr) {
    if (
      upErr.message?.includes("already exists") ||
      upErr.message?.includes("Duplicate")
    ) {
      const { data: blob2, error: dl2 } = await args.supabase.storage
        .from(bucket)
        .download(path);
      if (!dl2 && blob2) {
        const buf = Buffer.from(await blob2.arrayBuffer());
        return { bucket, path, sha256: createHashHex(buf) };
      }
    }
    throw new Error("trim_upload_failed");
  }
  return {
    bucket,
    path,
    sha256: createHashHex(args.trimmedBuffer),
  };
}

function createHashHex(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}
