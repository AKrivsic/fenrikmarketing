/**
 * Deterministic cost rollups over existing pipeline telemetry steps.
 *
 * ## Historical cost immutability (invariant)
 *
 * Rollups MUST sum stored `steps[].estimated_cost` only.
 * Never import estimateTokenCostUsd / estimateImageCostUsd / rate constants here.
 * Pricing-table changes must not alter package / video / run historical totals.
 *
 * `PRICING_VERSION` is used only when writing a NEW superseding telemetry document
 * (regenerate), not when reading historical costs.
 */

import { buildGenerationTelemetryDocument } from "@/lib/ai/telemetry/persist";
import { PRICING_VERSION } from "@/lib/ai/telemetry/cost";
import { readTelemetrySteps } from "@/lib/ai/telemetry/formatAudit";
import type {
  GenerationTelemetryDocument,
  GenerationTelemetryHistoryEntry,
  PipelineTelemetryStep,
} from "@/lib/ai/telemetry/types";

export interface CostRollup {
  estimatedCostUsd: number | null;
  stepCount: number;
  costedStepCount: number;
  promptTokens: number;
  completionTokens: number;
  byProvider: Record<string, number>;
  byStepName: Record<string, number>;
}

function addCost(
  map: Record<string, number>,
  key: string,
  cost: number,
): void {
  map[key] = (map[key] ?? 0) + cost;
}

/**
 * Sum stored estimated_cost across steps.
 * Historical invariant: never recompute from tokens or current rates.
 */
export function sumEstimatedCostUsd(
  steps: readonly PipelineTelemetryStep[],
): number | null {
  let sum = 0;
  let present = false;
  for (const step of steps) {
    if (typeof step.estimated_cost === "number" && Number.isFinite(step.estimated_cost)) {
      sum += step.estimated_cost;
      present = true;
    }
  }
  return present ? Math.round(sum * 1_000_000) / 1_000_000 : null;
}

/** Roll up stored estimated_cost only (no pricing table reads). */
export function buildCostRollup(
  steps: readonly PipelineTelemetryStep[],
): CostRollup {
  let promptTokens = 0;
  let completionTokens = 0;
  let costedStepCount = 0;
  const byProvider: Record<string, number> = {};
  const byStepName: Record<string, number> = {};

  for (const step of steps) {
    if (typeof step.prompt_tokens === "number") promptTokens += step.prompt_tokens;
    if (typeof step.completion_tokens === "number") {
      completionTokens += step.completion_tokens;
    }
    if (
      typeof step.estimated_cost === "number" &&
      Number.isFinite(step.estimated_cost)
    ) {
      costedStepCount += 1;
      addCost(byProvider, (step.provider ?? "unknown").trim() || "unknown", step.estimated_cost);
      addCost(byStepName, step.step_name, step.estimated_cost);
    }
  }

  return {
    estimatedCostUsd: sumEstimatedCostUsd(steps),
    stepCount: steps.length,
    costedStepCount,
    promptTokens,
    completionTokens,
    byProvider,
    byStepName,
  };
}

/** Flatten live steps + optional history entries (lifetime cost from stored $). */
export function flattenTelemetryStepsWithHistory(
  generationTelemetry: unknown,
): PipelineTelemetryStep[] {
  const live = readTelemetrySteps(generationTelemetry);
  const root =
    generationTelemetry &&
    typeof generationTelemetry === "object" &&
    !Array.isArray(generationTelemetry)
      ? (generationTelemetry as Record<string, unknown>)
      : null;
  const history = Array.isArray(root?.history)
    ? (root!.history as GenerationTelemetryHistoryEntry[])
    : [];
  const historical: PipelineTelemetryStep[] = [];
  for (const entry of history) {
    if (!entry || typeof entry !== "object") continue;
    historical.push(...readTelemetrySteps(entry.document));
  }
  return [...historical, ...live];
}

/**
 * Preserve prior live telemetry as a history entry, then attach a new document.
 * Prior documents (and their estimated_cost values) are copied verbatim — never repriced.
 */
export function supersedeGenerationTelemetry(args: {
  previous: unknown;
  nextSteps: readonly PipelineTelemetryStep[];
  legacy?: Record<string, unknown>;
  reason?: "regenerate" | "superseded";
}): GenerationTelemetryDocument & Record<string, unknown> {
  const previousRoot =
    args.previous &&
    typeof args.previous === "object" &&
    !Array.isArray(args.previous)
      ? (args.previous as Record<string, unknown>)
      : null;

  const priorHistory = Array.isArray(previousRoot?.history)
    ? ([...(previousRoot!.history as GenerationTelemetryHistoryEntry[])])
    : [];

  if (previousRoot && Array.isArray(previousRoot.steps) && previousRoot.steps.length > 0) {
    const { history: _drop, ...withoutHistory } = previousRoot;
    priorHistory.push({
      captured_at: new Date().toISOString(),
      reason: args.reason ?? "superseded",
      document: withoutHistory,
    });
  }

  const legacy = {
    ...(args.legacy ?? {}),
    ...(previousRoot
      ? {
          strategy_item_id: previousRoot.strategy_item_id,
          production_run_id: previousRoot.production_run_id,
        }
      : {}),
    // Informational only for the NEW document; history entries keep their own.
    pricing_version: PRICING_VERSION,
  };

  const doc = buildGenerationTelemetryDocument({
    legacy,
    steps: args.nextSteps,
  });

  return {
    ...doc,
    history: priorHistory,
  };
}

/** Package cost from persisted brief telemetry (stored estimated_cost only). */
export function packageCostFromBrief(packageBrief: unknown): CostRollup {
  const brief =
    packageBrief && typeof packageBrief === "object" && !Array.isArray(packageBrief)
      ? (packageBrief as Record<string, unknown>)
      : null;
  const pg =
    brief?.presentation_generation &&
    typeof brief.presentation_generation === "object" &&
    !Array.isArray(brief.presentation_generation)
      ? (brief.presentation_generation as Record<string, unknown>)
      : null;
  return buildCostRollup(
    flattenTelemetryStepsWithHistory(pg?.generation_telemetry),
  );
}

/** Video job cost from persisted output.debug telemetry (stored estimated_cost only). */
export function videoJobCostFromOutput(output: unknown): CostRollup {
  const out =
    output && typeof output === "object" && !Array.isArray(output)
      ? (output as Record<string, unknown>)
      : null;
  const debug =
    out?.debug && typeof out.debug === "object" && !Array.isArray(out.debug)
      ? (out.debug as Record<string, unknown>)
      : null;
  return buildCostRollup(readTelemetrySteps(debug?.generation_telemetry));
}
