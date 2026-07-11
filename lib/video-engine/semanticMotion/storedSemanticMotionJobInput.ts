import type { SupabaseClient } from "@supabase/supabase-js";
import type { StoredSemanticMotionBeat } from "@/lib/video-engine/storyboard";
import { coerceMotionType } from "@/lib/video-engine/storyboard";
import {
  parseMotionIntent,
  parseMotionIntensity,
  SEMANTIC_MOTION_VERSION,
} from "@/lib/video-engine/semanticMotion/motionIntent";

export const STORED_SEMANTIC_MOTION_INPUT_KEY = "stored_semantic_motion";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function normalizeStoredBeat(
  raw: Record<string, unknown>,
): StoredSemanticMotionBeat | null {
  const beat_id = asString(raw["beat_id"]);
  const motion_primitive = coerceMotionType(raw["motion_primitive"]);
  if (!beat_id) return null;

  const motion_intent = parseMotionIntent(raw["motion_intent"]);
  const motion_intensity = parseMotionIntensity(raw["motion_intensity"]);
  const motion_version =
    asString(raw["motion_version"]) ?? SEMANTIC_MOTION_VERSION;

  return {
    beat_id,
    motion_primitive,
    ...(motion_intent ? { motion_intent } : {}),
    ...(motion_intensity ? { motion_intensity } : {}),
    motion_version,
  };
}

/** Reads semantic motion beats from `video_jobs.output.render_spec.metadata`. */
export function extractSemanticMotionBeatsFromJobOutput(
  output: unknown,
): StoredSemanticMotionBeat[] | null {
  const root = asRecord(output);
  if (!root) return null;
  const renderSpec = asRecord(root["render_spec"]);
  if (!renderSpec) return null;
  const metadata = asRecord(renderSpec["metadata"]);
  if (!metadata) return null;
  const semantic = asRecord(metadata["semantic_motion"]);
  if (!semantic) return null;
  const beatsRaw = semantic["beats"];
  if (!Array.isArray(beatsRaw) || beatsRaw.length === 0) return null;

  const beats: StoredSemanticMotionBeat[] = [];
  for (const entry of beatsRaw) {
    const row = asRecord(entry);
    if (!row) continue;
    const normalized = normalizeStoredBeat(row);
    if (normalized) beats.push(normalized);
  }
  return beats.length > 0 ? beats : null;
}

/** Parses `stored_semantic_motion` from a worker job input blob. */
export function parseStoredSemanticMotionFromJobInput(
  input: Record<string, unknown>,
): StoredSemanticMotionBeat[] | undefined {
  const raw = input[STORED_SEMANTIC_MOTION_INPUT_KEY];
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const beats: StoredSemanticMotionBeat[] = [];
  for (const entry of raw) {
    const row = asRecord(entry);
    if (!row) continue;
    const normalized = normalizeStoredBeat(row);
    if (normalized) beats.push(normalized);
  }
  return beats.length > 0 ? beats : undefined;
}

/**
 * Copies semantic motion from a source job's render_spec output into
 * `stored_semantic_motion` on the next job input. Invalid metadata is ignored.
 */
export function mergeStoredSemanticMotionFromSourceOutput(args: {
  jobInput: Record<string, unknown>;
  sourceJobOutput: unknown | null | undefined;
}): Record<string, unknown> {
  const beats = extractSemanticMotionBeatsFromJobOutput(args.sourceJobOutput);
  if (!beats) return args.jobInput;
  return {
    ...args.jobInput,
    [STORED_SEMANTIC_MOTION_INPUT_KEY]: beats,
  };
}

/** Prefer the given output; otherwise newest completed job with semantic motion. */
export async function resolveSourceJobOutputForSemanticMotion(
  supabase: SupabaseClient,
  args: {
    projectId: string;
    contentItemId: string;
    primaryOutput: unknown;
  },
): Promise<unknown | null> {
  if (extractSemanticMotionBeatsFromJobOutput(args.primaryOutput)) {
    return args.primaryOutput;
  }

  const { data: jobRows, error } = await supabase
    .from("video_jobs")
    .select("output")
    .eq("project_id", args.projectId)
    .eq("content_item_id", args.contentItemId)
    .eq("status", "completed")
    .order("created_at", { ascending: false });
  if (error) throw error;

  for (const job of jobRows ?? []) {
    const output = (job as { output: unknown }).output;
    if (extractSemanticMotionBeatsFromJobOutput(output)) return output;
  }
  return null;
}

/**
 * Single entry for follow-up jobs: merge motion from source output when present.
 */
export function applySemanticMotionPreservationFromSourceJob(args: {
  jobInput: Record<string, unknown>;
  sourceJobOutput: unknown | null | undefined;
}): Record<string, unknown> {
  return mergeStoredSemanticMotionFromSourceOutput(args);
}
