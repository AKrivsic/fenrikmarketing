export const AUDIO_ASSET_KINDS = ["sound_effect", "music"] as const;
export type AudioAssetKind = (typeof AUDIO_ASSET_KINDS)[number];

export const AUDIO_ASSET_STATUSES = [
  "created",
  "submitting",
  "response_received",
  "completed",
  "failed_pre_submission",
  "submission_unknown",
  "artifact_recovery_required",
  "needs_review",
  "provider_rejected",
] as const;

export type AudioAssetStatus = (typeof AUDIO_ASSET_STATUSES)[number];

export const ELEVEN_SFX_MODEL = "eleven_text_to_sound_v2" as const;
export const ELEVEN_MUSIC_MODEL = "music_v1" as const;

export const AUDIO_ASSET_SUBMISSION_CLAIM_STALE_MS = 5 * 60 * 1000;

export function isAudioAssetStatus(v: string): v is AudioAssetStatus {
  return (AUDIO_ASSET_STATUSES as readonly string[]).includes(v);
}

export function audioAssetClaimEligible(status: AudioAssetStatus): boolean {
  return (
    status === "created" ||
    status === "failed_pre_submission" ||
    status === "provider_rejected"
  );
}
