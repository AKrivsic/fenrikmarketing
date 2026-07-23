import type { PipelineTelemetryStep } from "@/lib/ai/telemetry/types";
import { flattenTelemetryStepsWithHistory } from "@/lib/ai/telemetry/costRollup";
import { readTelemetrySteps } from "@/lib/ai/telemetry/formatAudit";
import { buildCostRollup, type CostRollup } from "@/lib/ai/telemetry/costRollup";

export type TelemetryStepSource =
  | "strategy"
  | "package"
  | "video_job"
  | "localization"
  | "failure";

/** One merged timeline row for admin review. */
export interface RunTelemetryStepView extends PipelineTelemetryStep {
  source: TelemetryStepSource;
  packageId: string | null;
  videoJobId: string | null;
  strategyId: string | null;
  contentItemId?: string | null;
}

export interface RunTelemetrySummary {
  /** Wall-clock run duration in ms (created → completed), or null if running. */
  totalRunDurationMs: number | null;
  /** Sum of recorded step durations. */
  totalRecordedDurationMs: number;
  /** Non–video-pipeline step duration sum. */
  aiDurationMs: number;
  /** Worker / media pipeline step duration sum. */
  videoPipelineDurationMs: number;
  /**
   * Sum of estimated_cost where present (AI text + metered media).
   * Kept as estimatedAiCostUsd for Review UI backwards compatibility.
   */
  estimatedAiCostUsd: number | null;
  /** Deterministic rollup over the same steps (no duplicated storage). */
  costRollup: CostRollup;
  stepCount: number;
  failedStepCount: number;
  retryCount: number;
  slowestStep: { name: string; durationMs: number } | null;
  slowestProvider: { provider: string; durationMs: number } | null;
  hasDetailedSteps: boolean;
}

export interface RunTelemetryView {
  productionRunId: string;
  summary: RunTelemetrySummary;
  steps: RunTelemetryStepView[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readProductionRunId(generationTelemetry: unknown): string | null {
  const root = asRecord(generationTelemetry);
  if (!root) return null;
  return typeof root.production_run_id === "string"
    ? root.production_run_id
    : null;
}

/** Classify worker/media steps vs package/strategy AI steps. */
export function isVideoPipelineStep(
  step: Pick<PipelineTelemetryStep, "provider" | "step_name">,
  source: TelemetryStepSource,
): boolean {
  if (source === "video_job") return true;
  const p = (step.provider ?? "").toLowerCase();
  if (p === "video" || p === "image" || p === "tts" || p === "whisper") {
    return true;
  }
  const n = step.step_name.toLowerCase();
  return (
    n.includes("video render") ||
    n.includes("image generation") ||
    n === "tts" ||
    n.includes("whisper")
  );
}

function providerLabel(provider: string | null): string {
  const p = (provider ?? "unknown").trim() || "unknown";
  return p;
}

export function buildRunTelemetrySummary(
  steps: readonly RunTelemetryStepView[],
  totalRunDurationMs: number | null,
): RunTelemetrySummary {
  let totalRecordedDurationMs = 0;
  let aiDurationMs = 0;
  let videoPipelineDurationMs = 0;
  let failedStepCount = 0;
  let retryCount = 0;

  let slowestStep: RunTelemetrySummary["slowestStep"] = null;
  const providerMs = new Map<string, number>();
  const costRollup = buildCostRollup(steps);

  for (const step of steps) {
    const ms = Number.isFinite(step.duration_ms) ? step.duration_ms : 0;
    totalRecordedDurationMs += ms;
    if (isVideoPipelineStep(step, step.source)) {
      videoPipelineDurationMs += ms;
    } else {
      aiDurationMs += ms;
    }
    if (!step.success) failedStepCount += 1;
    if (step.retry_count > 0) retryCount += step.retry_count;
    if (!slowestStep || ms > slowestStep.durationMs) {
      slowestStep = { name: step.step_name, durationMs: ms };
    }
    const label = providerLabel(step.provider);
    providerMs.set(label, (providerMs.get(label) ?? 0) + ms);
  }

  let slowestProvider: RunTelemetrySummary["slowestProvider"] = null;
  for (const [provider, durationMs] of providerMs) {
    if (!slowestProvider || durationMs > slowestProvider.durationMs) {
      slowestProvider = { provider, durationMs };
    }
  }

  return {
    totalRunDurationMs,
    totalRecordedDurationMs,
    aiDurationMs,
    videoPipelineDurationMs,
    estimatedAiCostUsd: costRollup.estimatedCostUsd,
    costRollup,
    stepCount: steps.length,
    failedStepCount,
    retryCount,
    slowestStep,
    slowestProvider,
    hasDetailedSteps: steps.length > 0,
  };
}

export function sortTelemetryStepsChronologically(
  steps: readonly RunTelemetryStepView[],
): RunTelemetryStepView[] {
  return [...steps].sort((a, b) => {
    const ta = Date.parse(a.started_at);
    const tb = Date.parse(b.started_at);
    const aOk = Number.isFinite(ta);
    const bOk = Number.isFinite(tb);
    if (aOk && bOk && ta !== tb) return ta - tb;
    if (aOk && !bOk) return -1;
    if (!aOk && bOk) return 1;
    return a.step_name.localeCompare(b.step_name);
  });
}

export function filterStepsForProductionRun(
  steps: readonly PipelineTelemetryStep[],
  args: {
    productionRunId: string;
    generationTelemetry: unknown;
    /** When telemetry lacks production_run_id, keep if relationship already scoped. */
    relationshipScoped: boolean;
  },
): PipelineTelemetryStep[] {
  const nestedRunId = readProductionRunId(args.generationTelemetry);
  if (nestedRunId && nestedRunId !== args.productionRunId) {
    return [];
  }
  if (!nestedRunId && !args.relationshipScoped) {
    return [];
  }
  return [...steps];
}

function pushFilteredSteps(args: {
  merged: RunTelemetryStepView[];
  productionRunId: string;
  generationTelemetry: unknown;
  relationshipScoped: boolean;
  /** When true, include history[] steps for lifetime package cost. */
  includeHistory: boolean;
  source: TelemetryStepSource;
  packageId: string | null;
  videoJobId: string | null;
  strategyId: string | null;
  contentItemId?: string | null;
}): void {
  const raw = args.includeHistory
    ? flattenTelemetryStepsWithHistory(args.generationTelemetry)
    : readTelemetrySteps(args.generationTelemetry);
  const steps = filterStepsForProductionRun(raw, {
    productionRunId: args.productionRunId,
    generationTelemetry: args.generationTelemetry,
    relationshipScoped: args.relationshipScoped,
  });
  for (const step of steps) {
    args.merged.push({
      ...step,
      source: args.source,
      packageId: args.packageId,
      videoJobId: args.videoJobId,
      strategyId: args.strategyId,
      contentItemId: args.contentItemId ?? null,
    });
  }
}

export function mergeRunTelemetrySteps(args: {
  productionRunId: string;
  totalRunDurationMs: number | null;
  strategyDocs: ReadonlyArray<{
    strategyId: string;
    generationTelemetry: unknown;
  }>;
  packageDocs: ReadonlyArray<{
    packageId: string;
    generationTelemetry: unknown;
  }>;
  videoJobDocs: ReadonlyArray<{
    videoJobId: string;
    packageId: string | null;
    generationTelemetry: unknown;
  }>;
  localizationDocs?: ReadonlyArray<{
    contentItemId: string;
    packageId: string | null;
    generationTelemetry: unknown;
  }>;
  failureDocs?: ReadonlyArray<{
    packageId?: string | null;
    strategyId?: string | null;
    generationTelemetry: unknown;
  }>;
}): RunTelemetryView {
  const merged: RunTelemetryStepView[] = [];

  for (const doc of args.strategyDocs) {
    pushFilteredSteps({
      merged,
      productionRunId: args.productionRunId,
      generationTelemetry: doc.generationTelemetry,
      relationshipScoped: true,
      includeHistory: false,
      source: "strategy",
      packageId: null,
      videoJobId: null,
      strategyId: doc.strategyId,
    });
  }

  for (const doc of args.packageDocs) {
    pushFilteredSteps({
      merged,
      productionRunId: args.productionRunId,
      generationTelemetry: doc.generationTelemetry,
      relationshipScoped: true,
      includeHistory: true,
      source: "package",
      packageId: doc.packageId,
      videoJobId: null,
      strategyId: null,
    });
  }

  for (const doc of args.localizationDocs ?? []) {
    pushFilteredSteps({
      merged,
      productionRunId: args.productionRunId,
      generationTelemetry: doc.generationTelemetry,
      relationshipScoped: true,
      includeHistory: false,
      source: "localization",
      packageId: doc.packageId,
      videoJobId: null,
      strategyId: null,
      contentItemId: doc.contentItemId,
    });
  }

  for (const doc of args.videoJobDocs) {
    pushFilteredSteps({
      merged,
      productionRunId: args.productionRunId,
      generationTelemetry: doc.generationTelemetry,
      relationshipScoped: true,
      includeHistory: false,
      source: "video_job",
      packageId: doc.packageId,
      videoJobId: doc.videoJobId,
      strategyId: null,
    });
  }

  for (const doc of args.failureDocs ?? []) {
    pushFilteredSteps({
      merged,
      productionRunId: args.productionRunId,
      generationTelemetry: doc.generationTelemetry,
      relationshipScoped: true,
      includeHistory: false,
      source: "failure",
      packageId: doc.packageId ?? null,
      videoJobId: null,
      strategyId: doc.strategyId ?? null,
    });
  }

  const steps = sortTelemetryStepsChronologically(merged);
  return {
    productionRunId: args.productionRunId,
    summary: buildRunTelemetrySummary(steps, args.totalRunDurationMs),
    steps,
  };
}

/** Package-level cost rollup from brief + related video job telemetries. */
export function rollupPackageCost(args: {
  packageBrief: unknown;
  videoJobOutputs?: unknown[];
  localizationMetadatas?: unknown[];
}): CostRollup {
  const brief = asRecord(args.packageBrief);
  const pg = asRecord(brief?.presentation_generation);
  const steps: PipelineTelemetryStep[] = [
    ...flattenTelemetryStepsWithHistory(pg?.generation_telemetry),
  ];
  for (const meta of args.localizationMetadatas ?? []) {
    const m = asRecord(meta);
    steps.push(...readTelemetrySteps(m?.generation_telemetry));
  }
  for (const output of args.videoJobOutputs ?? []) {
    const out = asRecord(output);
    const debug = asRecord(out?.debug);
    steps.push(...readTelemetrySteps(debug?.generation_telemetry));
  }
  return buildCostRollup(steps);
}
