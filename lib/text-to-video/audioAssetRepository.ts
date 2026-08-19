import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json } from "@/lib/supabase/types";
import {
  AUDIO_ASSET_SUBMISSION_CLAIM_STALE_MS,
  type AudioAssetStatus,
  isAudioAssetStatus,
  audioAssetClaimEligible,
} from "@/lib/text-to-video/audioAssetConstants";

export type AudioAssetRow = Record<string, unknown> & {
  id: string;
  status: AudioAssetStatus;
  input_fingerprint: string;
  synthesis_input: Json;
  submission_claim_owner: string | null;
  submission_claimed_at: string | null;
  asset_kind: string;
  scope_key: string;
  audio_bucket: string | null;
  audio_path: string | null;
  estimated_cost_usd?: number | null;
};

export class AudioAssetInputIntegrityError extends Error {
  readonly code = "audio_asset_input_integrity_mismatch" as const;
}

export class AudioAssetLeaseLostError extends Error {
  readonly code = "audio_asset_claim_lost" as const;
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  return (error as { code?: string }).code === "23505";
}

function nowIso(now?: () => Date): string {
  return (now ?? (() => new Date()))().toISOString();
}

export function storedAudioAssetInputsMatch(
  stored: unknown,
  expected: Record<string, unknown>,
): boolean {
  return JSON.stringify(stored) === JSON.stringify(expected);
}

export function isAudioAssetClaimStale(
  row: AudioAssetRow,
  now?: () => Date,
): boolean {
  if (!row.submission_claimed_at || !row.submission_claim_owner) return false;
  const claimedAt = Date.parse(row.submission_claimed_at);
  if (!Number.isFinite(claimedAt)) return false;
  const t = (now ?? (() => new Date()))().getTime();
  return t - claimedAt >= AUDIO_ASSET_SUBMISSION_CLAIM_STALE_MS;
}

export async function loadAudioAsset(
  supabase: SupabaseClient,
  id: string,
): Promise<AudioAssetRow> {
  const { data, error } = await supabase
    .from("text_to_video_audio_assets")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("audio_asset_not_found");
  const row = data as AudioAssetRow;
  if (!isAudioAssetStatus(row.status)) {
    throw new Error("audio_asset_invalid_status");
  }
  return row;
}

export async function listAudioAssetsForPackageJob(
  supabase: SupabaseClient,
  args: { projectId: string; packageId: string; videoJobId: string },
): Promise<AudioAssetRow[]> {
  const { data, error } = await supabase
    .from("text_to_video_audio_assets")
    .select("*")
    .eq("project_id", args.projectId)
    .eq("content_package_id", args.packageId)
    .eq("video_job_id", args.videoJobId);
  if (error) throw error;
  const rows: AudioAssetRow[] = [];
  for (const raw of data ?? []) {
    const row = raw as AudioAssetRow;
    if (!isAudioAssetStatus(row.status)) continue;
    rows.push(row);
  }
  return rows;
}

export async function loadOrCreateAudioAsset(
  supabase: SupabaseClient,
  args: {
    projectId: string;
    packageId: string;
    videoJobId: string | null;
    assetKind: "sound_effect" | "music";
    scopeKey: string;
    fingerprint: string;
    modelId: string;
    prompt: string;
    durationSeconds: number;
    estimatedCostUsd: number;
    synthesisInput: Record<string, unknown>;
  },
): Promise<AudioAssetRow> {
  const { data: existing, error: loadErr } = await supabase
    .from("text_to_video_audio_assets")
    .select("*")
    .eq("project_id", args.projectId)
    .eq("content_package_id", args.packageId)
    .eq("asset_kind", args.assetKind)
    .eq("scope_key", args.scopeKey)
    .eq("input_fingerprint", args.fingerprint)
    .maybeSingle();
  if (loadErr) throw loadErr;
  if (existing) {
    const row = existing as AudioAssetRow;
    if (!storedAudioAssetInputsMatch(row.synthesis_input, args.synthesisInput)) {
      throw new AudioAssetInputIntegrityError();
    }
    return row;
  }
  const { data: inserted, error: insErr } = await supabase
    .from("text_to_video_audio_assets")
    .insert({
      project_id: args.projectId,
      content_package_id: args.packageId,
      video_job_id: args.videoJobId,
      asset_kind: args.assetKind,
      scope_key: args.scopeKey,
      input_fingerprint: args.fingerprint,
      model_id: args.modelId,
      prompt: args.prompt,
      duration_seconds: args.durationSeconds,
      estimated_cost_usd: args.estimatedCostUsd,
      synthesis_input: args.synthesisInput as Json,
      status: "created",
    })
    .select("*")
    .single();
  if (!insErr && inserted) return inserted as AudioAssetRow;
  if (isUniqueViolation(insErr)) {
    const { data: winner, error: winErr } = await supabase
      .from("text_to_video_audio_assets")
      .select("*")
      .eq("project_id", args.projectId)
      .eq("content_package_id", args.packageId)
      .eq("asset_kind", args.assetKind)
      .eq("scope_key", args.scopeKey)
      .eq("input_fingerprint", args.fingerprint)
      .maybeSingle();
    if (winErr) throw winErr;
    if (!winner) throw insErr;
    const row = winner as AudioAssetRow;
    if (!storedAudioAssetInputsMatch(row.synthesis_input, args.synthesisInput)) {
      throw new AudioAssetInputIntegrityError();
    }
    return row;
  }
  throw insErr;
}

async function markStaleAudioSubmissionUnknown(
  supabase: SupabaseClient,
  row: AudioAssetRow,
  now?: () => Date,
): Promise<AudioAssetRow> {
  let query = supabase
    .from("text_to_video_audio_assets")
    .update({
      status: "submission_unknown",
      error_code: "submission_claim_stale",
      error_message:
        "Audio submission claim expired without durable provider outcome.",
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
  if (data) return data as AudioAssetRow;
  return loadAudioAsset(supabase, row.id);
}

export async function resolveAudioAssetRowForSubmit(
  supabase: SupabaseClient,
  row: AudioAssetRow,
  now?: () => Date,
): Promise<AudioAssetRow> {
  if (
    (row.status === "submitting" || row.status === "response_received") &&
    !row.audio_path &&
    isAudioAssetClaimStale(row, now)
  ) {
    return markStaleAudioSubmissionUnknown(supabase, row, now);
  }
  return row;
}

export async function claimAudioAssetSubmission(
  supabase: SupabaseClient,
  row: AudioAssetRow,
  owner: string,
  now?: () => Date,
): Promise<AudioAssetRow | null> {
  const current = await resolveAudioAssetRowForSubmit(
    supabase,
    await loadAudioAsset(supabase, row.id),
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
    if (isAudioAssetClaimStale(current, now)) {
      await markStaleAudioSubmissionUnknown(supabase, current, now);
      return null;
    }
    if (current.submission_claim_owner === owner) return current;
    return null;
  }
  if (!audioAssetClaimEligible(current.status)) return null;
  const ts = nowIso(now);
  const { data, error } = await supabase
    .from("text_to_video_audio_assets")
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
  return data ? (data as AudioAssetRow) : null;
}

export async function markOwnedAudioAssetUpdate(
  supabase: SupabaseClient,
  args: {
    id: string;
    owner: string;
    expectedStatus: AudioAssetStatus | AudioAssetStatus[];
    patch: Record<string, unknown>;
    now?: () => Date;
  },
): Promise<AudioAssetRow> {
  const expected = Array.isArray(args.expectedStatus)
    ? args.expectedStatus
    : [args.expectedStatus];
  const { data, error } = await supabase
    .from("text_to_video_audio_assets")
    .update({ ...args.patch, updated_at: nowIso(args.now) })
    .eq("id", args.id)
    .eq("submission_claim_owner", args.owner)
    .in("status", expected)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AudioAssetLeaseLostError();
  return data as AudioAssetRow;
}

export async function markAudioAssetResponseReceived(
  supabase: SupabaseClient,
  args: { rowId: string; owner: string; now?: () => Date },
): Promise<AudioAssetRow> {
  return markOwnedAudioAssetUpdate(supabase, {
    id: args.rowId,
    owner: args.owner,
    expectedStatus: "submitting",
    patch: { status: "response_received" },
    now: args.now,
  });
}

export async function markAudioAssetCompleted(
  supabase: SupabaseClient,
  args: {
    rowId: string;
    owner: string;
    bucket: string;
    path: string;
    durationSeconds: number;
    now?: () => Date;
  },
): Promise<AudioAssetRow> {
  return markOwnedAudioAssetUpdate(supabase, {
    id: args.rowId,
    owner: args.owner,
    expectedStatus: ["submitting", "response_received"],
    patch: {
      status: "completed",
      audio_bucket: args.bucket,
      audio_path: args.path,
      audio_duration_seconds: args.durationSeconds,
      submission_claim_owner: null,
      submission_claimed_at: null,
      error_code: null,
      error_message: null,
    },
    now: args.now,
  });
}

export async function markAudioAssetSubmissionUnknownOwned(
  supabase: SupabaseClient,
  args: { rowId: string; owner: string; code: string; now?: () => Date },
): Promise<void> {
  await markOwnedAudioAssetUpdate(supabase, {
    id: args.rowId,
    owner: args.owner,
    expectedStatus: ["submitting", "response_received"],
    patch: {
      status: "submission_unknown",
      error_code: args.code,
      submission_claim_owner: null,
      submission_claimed_at: null,
    },
    now: args.now,
  }).catch(() => undefined);
}

export async function markAudioAssetFailedPreSubmission(
  supabase: SupabaseClient,
  args: { rowId: string; code: string; message?: string; now?: () => Date },
): Promise<void> {
  const { error } = await supabase
    .from("text_to_video_audio_assets")
    .update({
      status: "failed_pre_submission",
      error_code: args.code,
      error_message: args.message?.slice(0, 1000) ?? null,
      submission_claim_owner: null,
      submission_claimed_at: null,
      updated_at: nowIso(args.now),
    })
    .eq("id", args.rowId)
    .in("status", ["created", "failed_pre_submission"]);
  if (error) throw error;
}

export async function markAudioAssetProviderRejectedOwned(
  supabase: SupabaseClient,
  args: { rowId: string; owner: string; code: string; now?: () => Date },
): Promise<void> {
  await markOwnedAudioAssetUpdate(supabase, {
    id: args.rowId,
    owner: args.owner,
    expectedStatus: "submitting",
    patch: {
      status: "provider_rejected",
      error_code: args.code,
      submission_claim_owner: null,
      submission_claimed_at: null,
    },
    now: args.now,
  }).catch(() => undefined);
}

export async function markAudioAssetArtifactRecoveryRequired(
  supabase: SupabaseClient,
  args: { rowId: string; owner: string; code: string; now?: () => Date },
): Promise<void> {
  await markOwnedAudioAssetUpdate(supabase, {
    id: args.rowId,
    owner: args.owner,
    expectedStatus: "response_received",
    patch: {
      status: "artifact_recovery_required",
      error_code: args.code,
      submission_claim_owner: null,
      submission_claimed_at: null,
    },
    now: args.now,
  }).catch(() => undefined);
}

export async function markAudioAssetNeedsReviewCompletedArtifact(
  supabase: SupabaseClient,
  args: { rowId: string; code: string; now?: () => Date },
): Promise<void> {
  await supabase
    .from("text_to_video_audio_assets")
    .update({
      status: "needs_review",
      error_code: args.code,
      updated_at: nowIso(args.now),
    })
    .eq("id", args.rowId)
    .eq("status", "completed");
}
