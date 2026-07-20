import type { PipelineTelemetryStep } from "@/lib/ai/telemetry/types";
import { readTelemetrySteps } from "@/lib/ai/telemetry/formatAudit";

export type TelemetryStepSource = "strategy" | "package" | "video_job";

/** One merged timeline row for admin review. */
export interface RunTelemetryStepView extends PipelineTelemetryStep {
  source: TelemetryStepSource;
  packageId: string | null;
  videoJobId: string | null;
  strategyId: string | null;
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
  /** Sum of estimated_cost where present. */
  estimatedAiCostUsd: number | null;
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
  let costSum = 0;
  let costPresent = false;

  let slowestStep: RunTelemetrySummary["slowestStep"] = null;
  const providerMs = new Map<string, number>();

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
    if (typeof step.estimated_cost === "number" && Number.isFinite(step.estimated_cost)) {
      costSum += step.estimated_cost;
      costPresent = true;
    }
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
    estimatedAiCostUsd: costPresent ? costSum : null,
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
}): RunTelemetryView {
  const merged: RunTelemetryStepView[] = [];

  for (const doc of args.strategyDocs) {
    const raw = readTelemetrySteps(doc.generationTelemetry);
    const steps = filterStepsForProductionRun(raw, {
      productionRunId: args.productionRunId,
      generationTelemetry: doc.generationTelemetry,
      relationshipScoped: true,
    });
    for (const step of steps) {
      merged.push({
        ...step,
        source: "strategy",
        packageId: null,
        videoJobId: null,
        strategyId: doc.strategyId,
      });
    }
  }

  for (const doc of args.packageDocs) {
    const raw = readTelemetrySteps(doc.generationTelemetry);
    const steps = filterStepsForProductionRun(raw, {
      productionRunId: args.productionRunId,
      generationTelemetry: doc.generationTelemetry,
      relationshipScoped: true,
    });
    for (const step of steps) {
      merged.push({
        ...step,
        source: "package",
        packageId: doc.packageId,
        videoJobId: null,
        strategyId: null,
      });
    }
  }

  for (const doc of args.videoJobDocs) {
    const raw = readTelemetrySteps(doc.generationTelemetry);
    const steps = filterStepsForProductionRun(raw, {
      productionRunId: args.productionRunId,
      generationTelemetry: doc.generationTelemetry,
      relationshipScoped: true,
    });
    for (const step of steps) {
      merged.push({
        ...step,
        source: "video_job",
        packageId: doc.packageId,
        videoJobId: doc.videoJobId,
        strategyId: null,
      });
    }
  }

  const steps = sortTelemetryStepsChronologically(merged);
  return {
    productionRunId: args.productionRunId,
    summary: buildRunTelemetrySummary(steps, args.totalRunDurationMs),
    steps,
  };
}
