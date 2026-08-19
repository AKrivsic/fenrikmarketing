/**
 * Shared benchmark case for image-to-video (Round A).
 * Analogous to roundTSnapshot.ts (Round T) but for I2V.
 *
 * Atomically stores and locks the creative inputs that must be identical
 * across all I2V models in the same case: core_idea, motion_intent,
 * source_image_bucket, source_image_path, fingerprint.
 *
 * Uses migration 042: ai_media_benchmark_cases with unique (project_id, case_id).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { stableSerialize } from "@/lib/ai-media-benchmark/requestIntegrity";

export const BENCHMARK_CASE_CONFLICT = "benchmark_case_conflict";
export const BENCHMARK_CASE_INPUT_MISMATCH = "benchmark_case_input_mismatch";
export const BENCHMARK_CASE_MOTION_INTENT_LOCKED = "benchmark_case_motion_intent_locked";
export const BENCHMARK_CASE_IMAGE_LOCKED = "benchmark_case_image_locked";

export interface BenchmarkCase {
  id: string;
  projectId: string;
  caseId: string;
  coreIdea: string;
  motionIntent: string;
  sourceImageBucket: string;
  sourceImagePath: string;
  sourceImageSha256: string | null;
  sourceImageUuid: string | null;
  fingerprint: string;
  lockedByRunId: string | null;
  lockedByModel: string | null;
  createdAt: string;
}

/** DB row shape from ai_media_benchmark_cases table (042 + 043). */
export interface BenchmarkCaseRow {
  id: string;
  project_id: string;
  case_id: string;
  core_idea: string;
  motion_intent: string;
  source_image_bucket: string;
  source_image_path: string;
  source_image_sha256: string | null;
  source_image_uuid: string | null;
  fingerprint: string;
  locked_by_run_id: string | null;
  locked_by_model: string | null;
  created_at: string;
  updated_at: string;
}

export function benchmarkCaseFingerprint(candidate: {
  coreIdea: string;
  motionIntent: string;
  sourceImageBucket: string;
  sourceImagePath: string;
  /** SHA-256 hex of the source image bytes. Included in fingerprint when present. */
  sourceImageSha256?: string | null;
}): string {
  return stableSerialize({
    coreIdea: candidate.coreIdea,
    motionIntent: candidate.motionIntent,
    sourceImageBucket: candidate.sourceImageBucket,
    sourceImagePath: candidate.sourceImagePath,
    sourceImageSha256: candidate.sourceImageSha256 ?? null,
  });
}

function rowToCase(row: BenchmarkCaseRow): BenchmarkCase {
  return {
    id: row.id,
    projectId: row.project_id,
    caseId: row.case_id,
    coreIdea: row.core_idea,
    motionIntent: row.motion_intent,
    sourceImageBucket: row.source_image_bucket,
    sourceImagePath: row.source_image_path,
    sourceImageSha256: row.source_image_sha256 ?? null,
    sourceImageUuid: row.source_image_uuid ?? null,
    fingerprint: row.fingerprint,
    lockedByRunId: row.locked_by_run_id,
    lockedByModel: row.locked_by_model,
    createdAt: row.created_at,
  };
}

export async function loadBenchmarkCase(
  supabase: SupabaseClient,
  projectId: string,
  caseId: string,
): Promise<BenchmarkCase | null> {
  const { data, error } = await supabase
    .from("ai_media_benchmark_cases")
    .select("*")
    .eq("project_id", projectId)
    .eq("case_id", caseId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToCase(data as BenchmarkCaseRow) : null;
}

/**
 * Atomically create a benchmark case (the shared I2V creative brief).
 * Only one case per (project_id, case_id) can exist. On a unique conflict
 * the winning row is loaded. Throws if the winning row differs in
 * sourceImagePath or coreIdea.
 */
export async function acquireBenchmarkCase(
  supabase: SupabaseClient,
  projectId: string,
  caseId: string,
  candidate: {
    coreIdea: string;
    motionIntent: string;
    sourceImageBucket: string;
    sourceImagePath: string;
    sourceImageSha256?: string | null;
    sourceImageUuid?: string | null;
  },
): Promise<BenchmarkCase> {
  const fp = benchmarkCaseFingerprint({
    ...candidate,
    sourceImageSha256: candidate.sourceImageSha256 ?? null,
  });

  const { data, error } = await supabase
    .from("ai_media_benchmark_cases")
    .insert({
      project_id: projectId,
      case_id: caseId,
      core_idea: candidate.coreIdea,
      motion_intent: candidate.motionIntent,
      source_image_bucket: candidate.sourceImageBucket,
      source_image_path: candidate.sourceImagePath,
      source_image_sha256: candidate.sourceImageSha256 ?? null,
      source_image_uuid: candidate.sourceImageUuid ?? null,
      fingerprint: fp,
      locked_by_run_id: null,
      locked_by_model: null,
    })
    .select("*")
    .single();

  if (!error) {
    return rowToCase(data as BenchmarkCaseRow);
  }

  if (error.code === "23505") {
    const winner = await loadBenchmarkCase(supabase, projectId, caseId);
    if (!winner) throw new Error(BENCHMARK_CASE_CONFLICT);
    if (winner.fingerprint !== fp) {
      throw new Error(BENCHMARK_CASE_INPUT_MISMATCH);
    }
    return winner;
  }

  throw error;
}

/**
 * Resolve an existing benchmark case. Throws if not found.
 * Used by createVideoBenchmarkRun before the provider POST.
 */
export async function resolveBenchmarkCase(
  supabase: SupabaseClient,
  projectId: string,
  caseId: string,
): Promise<BenchmarkCase> {
  const existing = await loadBenchmarkCase(supabase, projectId, caseId);
  if (!existing) throw new Error("benchmark_case_not_found");
  return existing;
}

/** Update the case row to record which run first locked it (best-effort, after run insert). */
export async function setCaseLockedByRun(
  supabase: SupabaseClient,
  caseId: string,
  runId: string,
  model: string,
): Promise<void> {
  await supabase
    .from("ai_media_benchmark_cases")
    .update({ locked_by_run_id: runId, locked_by_model: model })
    .eq("id", caseId)
    .is("locked_by_run_id", null);
}
