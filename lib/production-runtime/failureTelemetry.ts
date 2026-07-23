/**
 * Phase 6G — bounded failure telemetry (no prompts / full responses).
 * Extended for cost accounting: estimated_cost_usd + generation_telemetry steps.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { buildGenerationTelemetryDocument } from "@/lib/ai/telemetry/persist";
import { sumEstimatedCostUsd } from "@/lib/ai/telemetry/costRollup";
import { getTelemetryCollector } from "@/lib/ai/telemetry/collector";
import type { PipelineTelemetryStep } from "@/lib/ai/telemetry/types";
import { PRICING_VERSION } from "@/lib/ai/telemetry/cost";

export interface FailureTelemetrySnapshot {
  productionRunId?: string | null;
  productionRunItemId?: string | null;
  projectId: string;
  strategyItemId?: string | null;
  ownerToken?: string | null;
  phase?: string | null;
  provider?: string | null;
  model?: string | null;
  attemptCount?: number;
  durationMs?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  estimatedCostUsd?: number | null;
  errorTruncated?: string | null;
  terminalClassification?: string | null;
  /** Pipeline steps already paid for before failure (compact). */
  steps?: readonly PipelineTelemetryStep[] | null;
}

function truncate(value: string | null | undefined, max = 500): string | null {
  if (!value) return null;
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function summarizeSteps(steps: readonly PipelineTelemetryStep[]): {
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number | null;
  durationMs: number;
  provider: string | null;
  model: string | null;
} {
  let inputTokens = 0;
  let outputTokens = 0;
  let durationMs = 0;
  let provider: string | null = null;
  let model: string | null = null;
  for (const step of steps) {
    if (typeof step.prompt_tokens === "number") inputTokens += step.prompt_tokens;
    if (typeof step.completion_tokens === "number") {
      outputTokens += step.completion_tokens;
    }
    if (typeof step.duration_ms === "number") durationMs += step.duration_ms;
    if (!provider && step.provider) provider = String(step.provider);
    if (!model && step.model) model = String(step.model);
  }
  return {
    inputTokens,
    outputTokens,
    estimatedCostUsd: sumEstimatedCostUsd(steps),
    durationMs,
    provider,
    model,
  };
}

export async function persistPackageGenerationFailureTelemetry(
  supabase: SupabaseClient,
  snap: FailureTelemetrySnapshot,
): Promise<void> {
  const steps = snap.steps ?? [];
  const fromSteps = steps.length > 0 ? summarizeSteps(steps) : null;
  const generationTelemetry =
    steps.length > 0
      ? buildGenerationTelemetryDocument({
          legacy: {
            strategy_item_id: snap.strategyItemId ?? null,
            production_run_id: snap.productionRunId ?? null,
            pricing_version: PRICING_VERSION,
            terminal: true,
          },
          steps,
        })
      : null;

  const row = {
    production_run_id: snap.productionRunId ?? null,
    production_run_item_id: snap.productionRunItemId ?? null,
    project_id: snap.projectId,
    strategy_item_id: snap.strategyItemId ?? null,
    owner_token: snap.ownerToken ?? null,
    phase: snap.phase ?? null,
    provider: snap.provider ?? fromSteps?.provider ?? null,
    model: snap.model ?? fromSteps?.model ?? null,
    attempt_count: snap.attemptCount ?? 0,
    duration_ms: snap.durationMs ?? fromSteps?.durationMs ?? null,
    input_tokens: snap.inputTokens ?? fromSteps?.inputTokens ?? null,
    output_tokens: snap.outputTokens ?? fromSteps?.outputTokens ?? null,
    estimated_cost_usd:
      snap.estimatedCostUsd ?? fromSteps?.estimatedCostUsd ?? null,
    error_truncated: truncate(snap.errorTruncated),
    terminal_classification: snap.terminalClassification ?? null,
    generation_telemetry: generationTelemetry,
  };

  const { error } = await supabase
    .from("production_run_item_failure_telemetry")
    .insert(row);
  if (error) {
    // Best-effort: never fail the generation path on telemetry insert.
    // Pre-migration DBs may lack generation_telemetry — retry without it.
    if (String(error.message).includes("generation_telemetry")) {
      const { generation_telemetry: _drop, ...withoutSteps } = row;
      const retry = await supabase
        .from("production_run_item_failure_telemetry")
        .insert(withoutSteps);
      if (retry.error) {
        console.warn("[failure-telemetry] insert failed", retry.error.message);
      }
    } else {
      console.warn("[failure-telemetry] insert failed", error.message);
    }
  }

  if (snap.productionRunItemId) {
    const bounded = {
      phase: row.phase,
      provider: row.provider,
      model: row.model,
      attempt_count: row.attempt_count,
      duration_ms: row.duration_ms,
      estimated_cost_usd: row.estimated_cost_usd,
      input_tokens: row.input_tokens,
      output_tokens: row.output_tokens,
      step_count: steps.length,
      error_truncated: row.error_truncated,
      terminal_classification: row.terminal_classification,
      generation_telemetry: generationTelemetry,
      captured_at: new Date().toISOString(),
    };
    await supabase
      .from("production_run_items")
      .update({ failure_telemetry: bounded })
      .eq("id", snap.productionRunItemId)
      .then(({ error: e }) => {
        if (e) console.warn("[failure-telemetry] item patch failed", e.message);
      });
  }
}

/**
 * Snapshot the active collector and persist failure cost telemetry.
 * Safe no-op when no collector / no steps.
 */
export async function persistActiveCollectorFailureTelemetry(
  supabase: SupabaseClient,
  args: {
    projectId: string;
    strategyItemId?: string | null;
    productionRunId?: string | null;
    productionRunItemId?: string | null;
    ownerToken?: string | null;
    phase: string;
    errorTruncated?: string | null;
    terminalClassification?: string | null;
    attemptCount?: number;
  },
): Promise<void> {
  const steps = getTelemetryCollector()?.snapshot() ?? [];
  if (steps.length === 0 && !args.errorTruncated) return;
  await persistPackageGenerationFailureTelemetry(supabase, {
    projectId: args.projectId,
    strategyItemId: args.strategyItemId,
    productionRunId: args.productionRunId,
    productionRunItemId: args.productionRunItemId,
    ownerToken: args.ownerToken,
    phase: args.phase,
    attemptCount: args.attemptCount ?? steps.length,
    errorTruncated: args.errorTruncated,
    terminalClassification: args.terminalClassification,
    steps,
  });
}

/** Resolve production_run_items.id for a strategy item within a run. */
export async function lookupProductionRunItemId(
  supabase: SupabaseClient,
  args: { productionRunId: string; strategyItemId: string },
): Promise<string | null> {
  const { data, error } = await supabase
    .from("production_run_items")
    .select("id")
    .eq("production_run_id", args.productionRunId)
    .eq("strategy_item_id", args.strategyItemId)
    .maybeSingle();
  if (error) {
    console.warn("[failure-telemetry] run item lookup failed", error.message);
    return null;
  }
  return typeof data?.id === "string" ? data.id : null;
}
