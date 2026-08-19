import {
  AI_MEDIA_BENCHMARK_GENERATION_MODE_IMAGE_TO_VIDEO,
  AI_MEDIA_BENCHMARK_GENERATION_MODE_TEXT_TO_VIDEO,
  isTextToVideoBenchmarkSettings,
  type AiMediaBenchmarkRunRow,
  type AiMediaBenchmarkTestType,
} from "@/lib/ai-media-benchmark/types";

export const BENCHMARK_REQUEST_INPUT_MISMATCH = "benchmark_request_input_mismatch";

export type PaidBenchmarkGenerationMode =
  | typeof AI_MEDIA_BENCHMARK_GENERATION_MODE_TEXT_TO_VIDEO
  | typeof AI_MEDIA_BENCHMARK_GENERATION_MODE_IMAGE_TO_VIDEO
  | "voice"
  | "sound";

/**
 * Canonical paid-create identity for Benchmark Lab runs.
 * Same client_request_id may reuse a row only when this matches exactly.
 */
export interface CanonicalPaidBenchmarkInput {
  projectId: string | null;
  testType: AiMediaBenchmarkTestType;
  generationMode: PaidBenchmarkGenerationMode;
  provider: string;
  model: string;
  caseId: string;
  durationSeconds: number | null;
  ratio: string | null;
  generateAudio: boolean | null;
  promptText: string | null;
  sceneIdeaId: string | null;
  brandVisualProfile: unknown;
  estimatedCostUsd: number | null;
  estimatedCredits: number | null;
  maxCostUsd: number | null;
  sourceVideoJobId: string | null;
  sourceSceneId: string | null;
  sourceImageBucket: string | null;
  sourceImagePath: string | null;
  voiceCandidateId: string | null;
  voiceText: string | null;
  soundCandidateId: string | null;
  soundPrompt: string | null;
  soundDurationSeconds: number | null;
}

export function stableSerialize(value: unknown): string {
  if (value === undefined || value === null) return "null";
  if (typeof value === "number") {
    return Number.isFinite(value) ? JSON.stringify(value) : "null";
  }
  if (typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(String(value));
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "boolean") return null;
  if (value === undefined || value === null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  return null;
}

function settingsOf(row: AiMediaBenchmarkRunRow): Record<string, unknown> {
  return row.settings && typeof row.settings === "object" && !Array.isArray(row.settings)
    ? row.settings
    : {};
}

export function generationModeOfRow(row: AiMediaBenchmarkRunRow): PaidBenchmarkGenerationMode {
  if (row.test_type === "voice") return "voice";
  if (row.test_type === "sound") return "sound";
  if (isTextToVideoBenchmarkSettings(row.settings)) {
    return AI_MEDIA_BENCHMARK_GENERATION_MODE_TEXT_TO_VIDEO;
  }
  return AI_MEDIA_BENCHMARK_GENERATION_MODE_IMAGE_TO_VIDEO;
}

export function canonicalPaidInputFromRow(
  row: AiMediaBenchmarkRunRow,
): CanonicalPaidBenchmarkInput {
  const settings = settingsOf(row);
  const generationMode = generationModeOfRow(row);
  const promptText =
    generationMode === "voice"
      ? asTrimmedString(settings.text)
      : generationMode === "sound"
        ? asTrimmedString(settings.promptText)
        : generationMode === AI_MEDIA_BENCHMARK_GENERATION_MODE_TEXT_TO_VIDEO
          ? asTrimmedString(settings.promptText)
          : asTrimmedString(settings.motionPrompt);
  const durationSeconds = asFiniteNumber(settings.durationSeconds);
  return {
    projectId: row.project_id,
    testType: row.test_type,
    generationMode,
    provider: row.provider,
    model: row.model,
    caseId: row.case_id,
    durationSeconds:
      durationSeconds ??
      (generationMode === "voice" ? null : asFiniteNumber(row.duration_seconds)),
    ratio: asTrimmedString(settings.ratio),
    generateAudio:
      asBoolean(settings.generateAudio) ??
      (generationMode === "voice" || generationMode === "sound"
        ? true
        : typeof row.output_contains_audio === "boolean"
          ? row.output_contains_audio
          : null),
    promptText,
    sceneIdeaId: asTrimmedString(settings.sceneIdeaId),
    brandVisualProfile: settings.brandVisualProfile ?? null,
    estimatedCostUsd:
      asFiniteNumber(settings.estimatedCostUsd) ?? asFiniteNumber(row.estimated_cost_usd),
    estimatedCredits:
      asFiniteNumber(settings.estimatedCredits) ?? asFiniteNumber(row.estimated_credits),
    maxCostUsd: asFiniteNumber(settings.maxCostUsd),
    sourceVideoJobId: row.source_video_job_id,
    sourceSceneId: row.source_scene_id,
    sourceImageBucket: row.source_image_bucket,
    sourceImagePath: row.source_image_path,
    voiceCandidateId:
      generationMode === "voice" ? asTrimmedString(settings.candidateId) : null,
    voiceText: generationMode === "voice" ? asTrimmedString(settings.text) : null,
    soundCandidateId:
      generationMode === "sound" ? asTrimmedString(settings.candidateId) : null,
    soundPrompt: generationMode === "sound" ? asTrimmedString(settings.promptText) : null,
    soundDurationSeconds:
      generationMode === "sound" ? asFiniteNumber(settings.durationSeconds) : null,
  };
}

function fieldEqual(left: unknown, right: unknown): boolean {
  const ln = asFiniteNumber(left);
  const rn = asFiniteNumber(right);
  if (ln !== null || rn !== null) {
    if (left === null || left === undefined) {
      return right === null || right === undefined;
    }
    if (right === null || right === undefined) {
      return left === null || left === undefined;
    }
    if (ln !== null && rn !== null) return ln === rn;
  }
  return stableSerialize(left ?? null) === stableSerialize(right ?? null);
}

export function paidBenchmarkInputsMatch(
  stored: CanonicalPaidBenchmarkInput,
  incoming: CanonicalPaidBenchmarkInput,
): boolean {
  const keys = Object.keys(incoming) as Array<keyof CanonicalPaidBenchmarkInput>;
  return keys.every((key) => fieldEqual(stored[key], incoming[key]));
}

export function assertPaidBenchmarkRequestMatches(
  row: AiMediaBenchmarkRunRow,
  incoming: CanonicalPaidBenchmarkInput,
): void {
  if (!paidBenchmarkInputsMatch(canonicalPaidInputFromRow(row), incoming)) {
    throw new Error(BENCHMARK_REQUEST_INPUT_MISMATCH);
  }
}
