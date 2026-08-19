export const VOICE_SYNTHESIS_SUBMISSION_CLAIM_STALE_MS = 5 * 60 * 1000;

export const VOICE_SYNTHESIS_STORAGE_UPLOAD_MAX_ATTEMPTS = 3;

/** Allowed Supabase bucket for completed voiceover artifacts. */
export const VOICE_SYNTHESIS_AUDIO_BUCKET = "video-renders" as const;

export const VOICE_SYNTHESIS_STATUSES = [
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

export type VoiceSynthesisStatus = (typeof VOICE_SYNTHESIS_STATUSES)[number];

export function isVoiceSynthesisStatus(value: unknown): value is VoiceSynthesisStatus {
  return (
    typeof value === "string" &&
    (VOICE_SYNTHESIS_STATUSES as readonly string[]).includes(value)
  );
}

/** Terminal — never auto-POST again without new fingerprint / operator action. */
export function voiceSynthesisBlocksProviderPost(status: VoiceSynthesisStatus): boolean {
  return (
    status === "submission_unknown" ||
    status === "needs_review" ||
    status === "provider_rejected" ||
    status === "completed"
  );
}

/** Local retry allowed (no provider POST until claim from these). */
export function voiceSynthesisClaimEligible(status: VoiceSynthesisStatus): boolean {
  return status === "created" || status === "failed_pre_submission";
}
