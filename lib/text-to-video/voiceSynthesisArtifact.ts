import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildTextToVideoVoiceSynthesisPath,
  STORAGE_BUCKETS,
} from "@/lib/api/storage";
import {
  assertAcceptableVoiceoverDuration,
  probeAudioBufferDurationSeconds,
} from "@/lib/audio/probeAudioDuration";
import { VOICE_SYNTHESIS_STORAGE_UPLOAD_MAX_ATTEMPTS } from "@/lib/text-to-video/voiceSynthesisConstants";

const ALLOWED_BUCKET = STORAGE_BUCKETS.videoRenders;

export function expectedVoiceSynthesisAudioPath(
  projectId: string,
  packageId: string,
  fingerprint: string,
): string {
  return buildTextToVideoVoiceSynthesisPath(
    projectId,
    packageId,
    fingerprint,
    "voiceover.mp3",
  );
}

export function assertAllowedVoiceBucket(bucket: string): void {
  if (bucket !== ALLOWED_BUCKET) {
    throw new Error("voice_audio_bucket_not_allowed");
  }
}

export async function downloadVoiceArtifact(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
): Promise<Buffer> {
  assertAllowedVoiceBucket(bucket);
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) {
    throw new Error("voice_audio_download_failed");
  }
  const buf = Buffer.from(await data.arrayBuffer());
  if (buf.length < 128) {
    throw new Error("voice_audio_empty");
  }
  return buf;
}

export async function verifyVoiceArtifactBuffer(
  audio: Buffer,
  expectedDurationSeconds?: number,
  probeDuration: (b: Buffer) => Promise<number> = probeAudioBufferDurationSeconds,
): Promise<number> {
  const duration = await probeDuration(audio);
  assertAcceptableVoiceoverDuration(duration);
  if (
    expectedDurationSeconds !== undefined &&
    Number.isFinite(expectedDurationSeconds) &&
    Math.abs(duration - expectedDurationSeconds) > 1.5
  ) {
    throw new Error("voice_audio_duration_metadata_mismatch");
  }
  return duration;
}

export async function uploadVoiceArtifactWithRetries(
  supabase: SupabaseClient,
  path: string,
  audio: Buffer,
  maxAttempts = VOICE_SYNTHESIS_STORAGE_UPLOAD_MAX_ATTEMPTS,
): Promise<void> {
  assertAllowedVoiceBucket(ALLOWED_BUCKET);
  let lastErr: string | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { error } = await supabase.storage
      .from(ALLOWED_BUCKET)
      .upload(path, audio, { contentType: "audio/mpeg", upsert: false });
    if (!error) return;
    if (error.message?.includes("already exists") || error.message?.includes("Duplicate")) {
      const existing = await downloadVoiceArtifact(supabase, ALLOWED_BUCKET, path);
      await verifyVoiceArtifactBuffer(existing);
      return;
    }
    lastErr = error.message;
  }
  throw new Error(lastErr ?? "storage_upload_failed");
}

export async function adoptExistingVoiceArtifactIfPresent(
  supabase: SupabaseClient,
  path: string,
  expectedDurationSeconds?: number,
  probeDuration?: (b: Buffer) => Promise<number>,
): Promise<{ audio: Buffer; duration: number } | null> {
  try {
    const audio = await downloadVoiceArtifact(supabase, ALLOWED_BUCKET, path);
    const duration = await verifyVoiceArtifactBuffer(
      audio,
      expectedDurationSeconds,
      probeDuration,
    );
    return { audio, duration };
  } catch {
    return null;
  }
}
