import type { SupabaseClient } from "@supabase/supabase-js";
import {
  loadBrandVisualProfile,
  type BrandVisualProfile,
} from "@/lib/ai-media-benchmark/brandVisualProfile";
import { ROUND_A_DURATION_SECONDS, ROUND_A_PORTRAIT_RATIO } from "@/lib/ai-media-benchmark/catalog";
import { stableSerialize } from "@/lib/ai-media-benchmark/requestIntegrity";
import {
  assertSharedRoundTPrompt,
  composeTextToVideoPrompt,
  getTextToVideoSceneIdea,
} from "@/lib/ai-media-benchmark/textToVideoPrompt";
import {
  isTextToVideoBenchmarkSettings,
  type AiMediaBenchmarkRunRow,
} from "@/lib/ai-media-benchmark/types";

export const ROUND_T_CASE_SNAPSHOT_CONFLICT = "round_t_case_snapshot_conflict";
export const ROUND_T_SCENE_IDEA_LOCKED = "round_t_scene_idea_locked";

export interface RoundTCaseSnapshot {
  /** Row ID in ai_media_benchmark_round_t_cases. Null only from preview when DB not yet written. */
  caseSnapshotId: string | null;
  promptText: string;
  sceneIdeaId: string;
  sceneIdeaLabel: string;
  coreIdea: string;
  brandVisualProfile: BrandVisualProfile;
  durationSeconds: number;
  ratio: string;
  fingerprint: string;
  locked: boolean;
  lockedByModel: string | null;
  lockedByRunId: string | null;
  fromProjectData: boolean;
}

/** Row shape from ai_media_benchmark_round_t_cases table. */
export interface RoundTCaseRow {
  id: string;
  project_id: string;
  case_id: string;
  prompt_text: string;
  scene_idea_id: string;
  core_idea: string;
  brand_visual_profile: Record<string, unknown>;
  duration_seconds: number;
  ratio: string;
  fingerprint: string;
  locked_by_run_id: string | null;
  locked_by_model: string | null;
  created_at: string;
  updated_at: string;
}

function asProfile(value: unknown): BrandVisualProfile | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as BrandVisualProfile;
  if (typeof record.projectId !== "string") return null;
  if (typeof record.environment !== "string") return null;
  return record;
}

export function snapshotFingerprint(snapshot: {
  promptText: string;
  sceneIdeaId: string;
  coreIdea: string;
  brandVisualProfile: BrandVisualProfile;
  durationSeconds: number;
  ratio: string;
}): string {
  return stableSerialize({
    promptText: snapshot.promptText,
    sceneIdeaId: snapshot.sceneIdeaId,
    coreIdea: snapshot.coreIdea,
    brandVisualProfile: snapshot.brandVisualProfile,
    durationSeconds: snapshot.durationSeconds,
    ratio: snapshot.ratio,
  });
}

function snapshotFromOldRun(row: AiMediaBenchmarkRunRow): {
  promptText: string;
  sceneIdeaId: string;
  coreIdea: string;
  brandVisualProfile: BrandVisualProfile;
  durationSeconds: number;
  ratio: string;
} | null {
  const settings = row.settings ?? {};
  const promptText =
    typeof settings.promptText === "string" ? settings.promptText.trim() : "";
  const sceneIdeaId =
    typeof settings.sceneIdeaId === "string" ? settings.sceneIdeaId.trim() : "";
  const coreIdea = typeof settings.coreIdea === "string" ? settings.coreIdea.trim() : "";
  const profile = asProfile(settings.brandVisualProfile);
  const durationSeconds = Number(settings.durationSeconds ?? row.duration_seconds);
  const ratio = typeof settings.ratio === "string" ? settings.ratio.trim() : "";
  if (!promptText || !sceneIdeaId || !profile) return null;
  if (!Number.isFinite(durationSeconds) || !ratio) return null;
  return { promptText, sceneIdeaId, coreIdea, brandVisualProfile: profile, durationSeconds, ratio };
}

function caseRowToSnapshot(row: RoundTCaseRow): RoundTCaseSnapshot {
  const profile = asProfile(row.brand_visual_profile);
  if (!profile) throw new Error("round_t_case_invalid_profile");
  const idea = getTextToVideoSceneIdea(row.scene_idea_id);
  return {
    caseSnapshotId: row.id,
    promptText: row.prompt_text,
    sceneIdeaId: row.scene_idea_id,
    sceneIdeaLabel: idea.label,
    coreIdea: row.core_idea || idea.coreIdea,
    brandVisualProfile: profile,
    durationSeconds: Number(row.duration_seconds),
    ratio: row.ratio,
    fingerprint: row.fingerprint,
    locked: true,
    lockedByModel: row.locked_by_model,
    lockedByRunId: row.locked_by_run_id,
    fromProjectData: false,
  };
}

async function loadCaseRow(
  supabase: SupabaseClient,
  projectId: string,
  caseId: string,
): Promise<RoundTCaseRow | null> {
  const { data, error } = await supabase
    .from("ai_media_benchmark_round_t_cases")
    .select("*")
    .eq("project_id", projectId)
    .eq("case_id", caseId)
    .maybeSingle();
  if (error) throw error;
  return data ? (data as RoundTCaseRow) : null;
}

/**
 * Attempt to atomically insert the case snapshot.
 * Returns the winning row (either newly inserted or the already-existing one on 23505).
 * Throws `round_t_case_snapshot_conflict` only when old run-based snapshots conflict.
 */
async function acquireCaseSnapshot(
  supabase: SupabaseClient,
  projectId: string,
  caseId: string,
  candidate: {
    promptText: string;
    sceneIdeaId: string;
    coreIdea: string;
    brandVisualProfile: BrandVisualProfile;
    durationSeconds: number;
    ratio: string;
  },
): Promise<{ row: RoundTCaseRow; won: boolean }> {
  const fp = snapshotFingerprint(candidate);
  const { data, error } = await supabase
    .from("ai_media_benchmark_round_t_cases")
    .insert({
      project_id: projectId,
      case_id: caseId,
      prompt_text: candidate.promptText,
      scene_idea_id: candidate.sceneIdeaId,
      core_idea: candidate.coreIdea,
      brand_visual_profile: candidate.brandVisualProfile,
      duration_seconds: candidate.durationSeconds,
      ratio: candidate.ratio,
      fingerprint: fp,
      locked_by_run_id: null,
      locked_by_model: null,
    })
    .select("*")
    .single();

  if (!error) {
    return { row: data as RoundTCaseRow, won: true };
  }

  if (error.code === "23505") {
    // Unique conflict: another concurrent request already inserted.
    const winner = await loadCaseRow(supabase, projectId, caseId);
    if (!winner) throw new Error("round_t_case_snapshot_conflict");
    return { row: winner, won: false };
  }

  throw error;
}

/**
 * Migrate snapshot from old run-based data into the new case table.
 * Only called when the case table is empty but old T2V runs exist.
 * Throws `round_t_case_snapshot_conflict` when old runs have divergent snapshots.
 */
async function migrateFromOldRuns(
  supabase: SupabaseClient,
  projectId: string,
  caseId: string,
): Promise<{
  promptText: string;
  sceneIdeaId: string;
  coreIdea: string;
  brandVisualProfile: BrandVisualProfile;
  durationSeconds: number;
  ratio: string;
} | null> {
  const { data, error } = await supabase
    .from("ai_media_benchmark_runs")
    .select("*")
    .eq("project_id", projectId)
    .eq("case_id", caseId)
    .eq("test_type", "video")
    .order("created_at", { ascending: true })
    .limit(50);
  if (error) throw error;

  const rows = ((data ?? []) as AiMediaBenchmarkRunRow[]).filter((r) =>
    isTextToVideoBenchmarkSettings(r.settings),
  );
  if (rows.length === 0) return null;

  const extracted = rows.map(snapshotFromOldRun).filter(Boolean) as NonNullable<
    ReturnType<typeof snapshotFromOldRun>
  >[];
  if (extracted.length === 0) return null;

  const fingerprints = new Set(extracted.map((s) => snapshotFingerprint(s)));
  if (fingerprints.size > 1) throw new Error(ROUND_T_CASE_SNAPSHOT_CONFLICT);

  return extracted[0]!;
}

export async function resolveRoundTCaseSnapshot(args: {
  supabase: SupabaseClient;
  projectId: string;
  caseId: string;
  requestedSceneIdeaId?: string | null;
  /** When true, a different sceneIdeaId compared to the locked snapshot throws round_t_scene_idea_locked. */
  rejectMismatchedSceneIdea?: boolean;
}): Promise<RoundTCaseSnapshot> {
  // 1. Check if an authoritative case snapshot already exists.
  const existing = await loadCaseRow(args.supabase, args.projectId, args.caseId);
  if (existing) {
    return _snapshotFromLockedRow(existing, args.requestedSceneIdeaId, args.rejectMismatchedSceneIdea);
  }

  // 2. No case row yet — check old T2V runs (migration path from 12D data).
  const oldCandidate = await migrateFromOldRuns(args.supabase, args.projectId, args.caseId);

  // 3. Build candidate: either from old run data or fresh from project.
  let candidate: {
    promptText: string;
    sceneIdeaId: string;
    coreIdea: string;
    brandVisualProfile: BrandVisualProfile;
    durationSeconds: number;
    ratio: string;
  };

  if (oldCandidate) {
    candidate = oldCandidate;
  } else {
    const idea = getTextToVideoSceneIdea(args.requestedSceneIdeaId);
    const profile = await loadBrandVisualProfile(args.supabase, args.projectId);
    const promptText = composeTextToVideoPrompt({ idea, profile });
    assertSharedRoundTPrompt(promptText);
    candidate = {
      promptText,
      sceneIdeaId: idea.id,
      coreIdea: idea.coreIdea,
      brandVisualProfile: profile,
      durationSeconds: ROUND_A_DURATION_SECONDS,
      ratio: ROUND_A_PORTRAIT_RATIO,
    };
  }

  // 4. Atomically insert — only one winner per (project_id, case_id).
  const { row } = await acquireCaseSnapshot(
    args.supabase,
    args.projectId,
    args.caseId,
    candidate,
  );

  // 5. Use the winning row (might differ from our candidate on conflict).
  return _snapshotFromLockedRow(row, args.requestedSceneIdeaId, args.rejectMismatchedSceneIdea);
}

function _snapshotFromLockedRow(
  row: RoundTCaseRow,
  requestedSceneIdeaId?: string | null,
  rejectMismatch?: boolean,
): RoundTCaseSnapshot {
  const requested = requestedSceneIdeaId?.trim();
  if (requested && requested !== row.scene_idea_id && rejectMismatch) {
    throw new Error(ROUND_T_SCENE_IDEA_LOCKED);
  }
  return caseRowToSnapshot(row);
}

/** Update the case row to record which run first locked it (called after run insert). */
export async function setCaseSnapshotLockedByRun(
  supabase: SupabaseClient,
  caseSnapshotId: string,
  runId: string,
  model: string,
): Promise<void> {
  await supabase
    .from("ai_media_benchmark_round_t_cases")
    .update({ locked_by_run_id: runId, locked_by_model: model })
    .eq("id", caseSnapshotId)
    .is("locked_by_run_id", null);
}
