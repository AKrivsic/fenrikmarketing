import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildTextToVideoVoiceSynthesisPath,
  STORAGE_BUCKETS,
} from "@/lib/api/storage";
import { probeAudioBufferDurationSeconds } from "@/lib/audio/probeAudioDuration";
import { VOICE_SYNTHESIS_STORAGE_UPLOAD_MAX_ATTEMPTS } from "@/lib/text-to-video/voiceSynthesisConstants";
import type { AudioAssetKind } from "@/lib/text-to-video/audioAssetConstants";

const ALLOWED_BUCKET = STORAGE_BUCKETS.videoRenders;
const MAX_SFX_BYTES = 4 * 1024 * 1024;
const MAX_MUSIC_BYTES = 8 * 1024 * 1024;

export function assertAllowedAudioAssetBucket(bucket: string): void {
  if (bucket !== ALLOWED_BUCKET) {
    throw new Error("audio_asset_bucket_not_allowed");
  }
}

export function expectedAudioAssetStoragePath(
  projectId: string,
  packageId: string,
  assetKind: AudioAssetKind,
  inputFingerprint: string,
  ext: string,
): string {
  return buildTextToVideoVoiceSynthesisPath(
    projectId,
    packageId,
    `${assetKind}_${inputFingerprint.slice(0, 24)}`,
    ext,
  );
}

export function maxBytesForAudioAssetKind(kind: AudioAssetKind): number {
  return kind === "music" ? MAX_MUSIC_BYTES : MAX_SFX_BYTES;
}

export async function downloadAudioAssetArtifact(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  maxBytes: number,
): Promise<Buffer> {
  assertAllowedAudioAssetBucket(bucket);
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) throw new Error("audio_asset_download_failed");
  const buf = Buffer.from(await data.arrayBuffer());
  if (buf.length < 128 || buf.length > maxBytes) {
    throw new Error("audio_asset_size_invalid");
  }
  return buf;
}

export async function verifyAudioAssetBuffer(args: {
  audio: Buffer;
  assetKind: AudioAssetKind;
  expectedDurationSeconds: number;
  loopExpected?: boolean;
}): Promise<number> {
  const duration = await probeAudioBufferDurationSeconds(args.audio);
  if (!Number.isFinite(duration) || duration <= 0.1) {
    throw new Error("audio_asset_no_duration");
  }
  const tol = args.assetKind === "sound_effect" ? 1.25 : 2.5;
  if (Math.abs(duration - args.expectedDurationSeconds) > tol) {
    if (args.assetKind === "music" && args.loopExpected && duration >= 1) {
      return duration;
    }
    throw new Error("audio_asset_duration_mismatch");
  }
  return duration;
}

export async function uploadAudioAssetWithRetries(
  supabase: SupabaseClient,
  path: string,
  audio: Buffer,
  maxAttempts = VOICE_SYNTHESIS_STORAGE_UPLOAD_MAX_ATTEMPTS,
): Promise<void> {
  assertAllowedAudioAssetBucket(ALLOWED_BUCKET);
  let lastErr: string | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { error } = await supabase.storage
      .from(ALLOWED_BUCKET)
      .upload(path, audio, { contentType: "audio/mpeg", upsert: false });
    if (!error) return;
    if (
      error.message?.includes("already exists") ||
      error.message?.includes("Duplicate")
    ) {
      return;
    }
    lastErr = error.message;
  }
  throw new Error(lastErr ?? "audio_asset_upload_failed");
}

export async function adoptExistingAudioAssetIfPresent(
  supabase: SupabaseClient,
  args: {
    path: string;
    assetKind: AudioAssetKind;
    expectedDurationSeconds: number;
    loopExpected?: boolean;
  },
): Promise<{ audio: Buffer; duration: number } | null> {
  try {
    const audio = await downloadAudioAssetArtifact(
      supabase,
      ALLOWED_BUCKET,
      args.path,
      maxBytesForAudioAssetKind(args.assetKind),
    );
    const duration = await verifyAudioAssetBuffer({
      audio,
      assetKind: args.assetKind,
      expectedDurationSeconds: args.expectedDurationSeconds,
      loopExpected: args.loopExpected,
    });
    return { audio, duration };
  } catch {
    return null;
  }
}
