import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json } from "@/lib/supabase/types";
import { storedSynthesisInputsMatch } from "@/lib/elevenlabs/v3VoiceDirection";
import {
  VOICE_SYNTHESIS_SUBMISSION_CLAIM_STALE_MS,
  type VoiceSynthesisStatus,
  isVoiceSynthesisStatus,
  voiceSynthesisClaimEligible,
} from "@/lib/text-to-video/voiceSynthesisConstants";

export type VoiceSynthesisRow = Record<string, unknown> & {
  id: string;
  status: VoiceSynthesisStatus;
  synthesis_fingerprint: string;
  synthesis_input: Json;
  submission_claim_owner: string | null;
  submission_claimed_at: string | null;
};

export class VoiceSynthesisLeaseLostError extends Error {
  readonly code = "synthesis_claim_lost" as const;
}

export class VoiceSynthesisInputIntegrityError extends Error {
  readonly code = "synthesis_input_integrity_mismatch" as const;
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  return (error as { code?: string }).code === "23505";
}

function nowIso(now?: () => Date): string {
  return (now ?? (() => new Date()))().toISOString();
}

export function isSubmissionClaimStaleRow(
  row: VoiceSynthesisRow,
  now?: () => Date,
): boolean {
  if (!row.submission_claimed_at || !row.submission_claim_owner) return false;
  const claimedAt = Date.parse(row.submission_claimed_at);
  if (!Number.isFinite(claimedAt)) return false;
  const t = (now ?? (() => new Date()))().getTime();
  return t - claimedAt >= VOICE_SYNTHESIS_SUBMISSION_CLAIM_STALE_MS;
}

export async function loadVoiceSynthesisAttempt(
  supabase: SupabaseClient,
  id: string,
): Promise<VoiceSynthesisRow> {
  const { data, error } = await supabase
    .from("text_to_video_voice_syntheses")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("synthesis_attempt_not_found");
  const row = data as VoiceSynthesisRow;
  if (!isVoiceSynthesisStatus(row.status)) {
    throw new Error("synthesis_invalid_status");
  }
  return row;
}

export async function loadOrCreateVoiceSynthesisAttempt(
  supabase: SupabaseClient,
  args: {
    projectId: string;
    packageId: string;
    fingerprint: string;
    voiceoverRevisionId: string;
    voiceId: string;
    modelId: string;
    outputFormat: string;
    estimatedCostUsd: number;
    synthesisInput: Record<string, unknown>;
  },
): Promise<VoiceSynthesisRow> {
  const { data: existing, error: loadErr } = await supabase
    .from("text_to_video_voice_syntheses")
    .select("*")
    .eq("project_id", args.projectId)
    .eq("content_package_id", args.packageId)
    .eq("synthesis_fingerprint", args.fingerprint)
    .maybeSingle();
  if (loadErr) throw loadErr;
  if (existing) {
    const row = existing as VoiceSynthesisRow;
    if (
      !storedSynthesisInputsMatch(row.synthesis_input, args.synthesisInput)
    ) {
      throw new VoiceSynthesisInputIntegrityError(
        "synthesis_fingerprint_input_mismatch",
      );
    }
    return row;
  }
  const { data: inserted, error: insErr } = await supabase
    .from("text_to_video_voice_syntheses")
    .insert({
      project_id: args.projectId,
      content_package_id: args.packageId,
      synthesis_fingerprint: args.fingerprint,
      voiceover_revision_id: args.voiceoverRevisionId,
      model_id: args.modelId,
      voice_id: args.voiceId,
      output_format: args.outputFormat,
      estimated_cost_usd: args.estimatedCostUsd,
      synthesis_input: args.synthesisInput as Json,
      status: "created",
    })
    .select("*")
    .single();
  if (!insErr && inserted) {
    return inserted as VoiceSynthesisRow;
  }
  if (isUniqueViolation(insErr)) {
    const { data: winner, error: winErr } = await supabase
      .from("text_to_video_voice_syntheses")
      .select("*")
      .eq("project_id", args.projectId)
      .eq("content_package_id", args.packageId)
      .eq("synthesis_fingerprint", args.fingerprint)
      .maybeSingle();
    if (winErr) throw winErr;
    if (!winner) throw insErr;
    const row = winner as VoiceSynthesisRow;
    if (
      !storedSynthesisInputsMatch(row.synthesis_input, args.synthesisInput)
    ) {
      throw new VoiceSynthesisInputIntegrityError(
        "synthesis_fingerprint_input_mismatch",
      );
    }
    return row;
  }
  throw insErr;
}

async function markStaleSubmissionUnknown(
  supabase: SupabaseClient,
  row: VoiceSynthesisRow,
  now?: () => Date,
): Promise<VoiceSynthesisRow> {
  let query = supabase
    .from("text_to_video_voice_syntheses")
    .update({
      status: "submission_unknown",
      error_code: "submission_claim_stale",
      error_message:
        "Submission claim expired without durable provider outcome — manual review required.",
      submission_claim_owner: null,
      submission_claimed_at: null,
      updated_at: nowIso(now),
    })
    .eq("id", row.id)
    .in("status", ["submitting", "response_received"])
    .is("audio_path", null);
  if (row.submission_claim_owner && row.submission_claimed_at) {
    query = query
      .eq("submission_claim_owner", row.submission_claim_owner)
      .eq("submission_claimed_at", row.submission_claimed_at);
  }
  const { data, error } = await query.select("*").maybeSingle();
  if (error) throw error;
  if (data) return data as VoiceSynthesisRow;
  return loadVoiceSynthesisAttempt(supabase, row.id);
}

export async function resolveVoiceSynthesisRowForSubmit(
  supabase: SupabaseClient,
  row: VoiceSynthesisRow,
  now?: () => Date,
): Promise<VoiceSynthesisRow> {
  if (
    (row.status === "submitting" || row.status === "response_received") &&
    !row.audio_path &&
    isSubmissionClaimStaleRow(row, now)
  ) {
    return markStaleSubmissionUnknown(supabase, row, now);
  }
  return row;
}

export async function claimVoiceSynthesisSubmission(
  supabase: SupabaseClient,
  row: VoiceSynthesisRow,
  owner: string,
  now?: () => Date,
): Promise<VoiceSynthesisRow | null> {
  const current = await resolveVoiceSynthesisRowForSubmit(
    supabase,
    await loadVoiceSynthesisAttempt(supabase, row.id),
    now,
  );
  if (current.status === "completed") return null;
  if (
    current.status === "submission_unknown" ||
    current.status === "needs_review" ||
    current.status === "provider_rejected" ||
    current.status === "artifact_recovery_required"
  ) {
    return null;
  }

  if (
    current.status === "submitting" ||
    current.status === "response_received"
  ) {
    if (isSubmissionClaimStaleRow(current, now)) {
      await markStaleSubmissionUnknown(supabase, current, now);
      return null;
    }
    if (current.submission_claim_owner === owner) {
      return current;
    }
    return null;
  }

  if (!voiceSynthesisClaimEligible(current.status)) {
    return null;
  }

  const ts = nowIso(now);
  const { data, error } = await supabase
    .from("text_to_video_voice_syntheses")
    .update({
      status: "submitting",
      submission_claim_owner: owner,
      submission_claimed_at: ts,
      updated_at: ts,
    })
    .eq("id", current.id)
    .eq("status", current.status)
    .is("submission_claim_owner", null)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? (data as VoiceSynthesisRow) : null;
}

export async function markOwnedVoiceSynthesisUpdate(
  supabase: SupabaseClient,
  args: {
    id: string;
    owner: string;
    expectedStatus: VoiceSynthesisStatus | VoiceSynthesisStatus[];
    patch: Record<string, unknown>;
    now?: () => Date;
  },
): Promise<VoiceSynthesisRow> {
  const expected = Array.isArray(args.expectedStatus)
    ? args.expectedStatus
    : [args.expectedStatus];
  const { data, error } = await supabase
    .from("text_to_video_voice_syntheses")
    .update({
      ...args.patch,
      updated_at: nowIso(args.now),
    })
    .eq("id", args.id)
    .eq("submission_claim_owner", args.owner)
    .in("status", expected)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new VoiceSynthesisLeaseLostError();
  return data as VoiceSynthesisRow;
}

export async function markOwnedVoiceSynthesisTerminal(
  supabase: SupabaseClient,
  args: {
    id: string;
    owner: string;
    status: VoiceSynthesisStatus;
    errorCode?: string | null;
    errorMessage?: string | null;
    now?: () => Date;
  },
): Promise<VoiceSynthesisRow> {
  const clearClaim =
    args.status !== "submitting" && args.status !== "response_received";
  return markOwnedVoiceSynthesisUpdate(supabase, {
    id: args.id,
    owner: args.owner,
    expectedStatus: ["submitting", "response_received"],
    patch: {
      status: args.status,
      error_code: args.errorCode ?? null,
      error_message: args.errorMessage?.slice(0, 1000) ?? null,
      ...(clearClaim
        ? {
            submission_claim_owner: null,
            submission_claimed_at: null,
          }
        : {}),
    },
    now: args.now,
  });
}

export async function markPreSubmissionFailed(
  supabase: SupabaseClient,
  id: string,
  errorCode: string,
  errorMessage: string,
  now?: () => Date,
): Promise<void> {
  const { error } = await supabase
    .from("text_to_video_voice_syntheses")
    .update({
      status: "failed_pre_submission",
      error_code: errorCode,
      error_message: errorMessage.slice(0, 1000),
      submission_claim_owner: null,
      submission_claimed_at: null,
      updated_at: nowIso(now),
    })
    .eq("id", id)
    .in("status", ["created", "failed_pre_submission"]);
  if (error) throw error;
}

export async function markSubmissionUnknownOwned(
  supabase: SupabaseClient,
  id: string,
  owner: string,
  errorCode: string,
  now?: () => Date,
): Promise<void> {
  const { data, error } = await supabase
    .from("text_to_video_voice_syntheses")
    .update({
      status: "submission_unknown",
      error_code: errorCode,
      submission_claim_owner: null,
      submission_claimed_at: null,
      updated_at: nowIso(now),
    })
    .eq("id", id)
    .eq("submission_claim_owner", owner)
    .in("status", ["submitting", "response_received"])
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) {
    throw new VoiceSynthesisLeaseLostError();
  }
}

/** @deprecated Prefer markSubmissionUnknownOwned for post-claim provider failures. */
export async function markSubmissionUnknownUnowned(
  supabase: SupabaseClient,
  id: string,
  errorCode: string,
  now?: () => Date,
): Promise<void> {
  const { data, error } = await supabase
    .from("text_to_video_voice_syntheses")
    .update({
      status: "submission_unknown",
      error_code: errorCode,
      submission_claim_owner: null,
      submission_claimed_at: null,
      updated_at: nowIso(now),
    })
    .eq("id", id)
    .in("status", ["submitting", "response_received"])
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) {
    throw new VoiceSynthesisLeaseLostError();
  }
}
