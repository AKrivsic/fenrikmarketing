/**
 * Phase 6G — bounded failure telemetry (no prompts / full responses).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

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
}

function truncate(value: string | null | undefined, max = 500): string | null {
  if (!value) return null;
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export async function persistPackageGenerationFailureTelemetry(
  supabase: SupabaseClient,
  snap: FailureTelemetrySnapshot,
): Promise<void> {
  const row = {
    production_run_id: snap.productionRunId ?? null,
    production_run_item_id: snap.productionRunItemId ?? null,
    project_id: snap.projectId,
    strategy_item_id: snap.strategyItemId ?? null,
    owner_token: snap.ownerToken ?? null,
    phase: snap.phase ?? null,
    provider: snap.provider ?? null,
    model: snap.model ?? null,
    attempt_count: snap.attemptCount ?? 0,
    duration_ms: snap.durationMs ?? null,
    input_tokens: snap.inputTokens ?? null,
    output_tokens: snap.outputTokens ?? null,
    estimated_cost_usd: snap.estimatedCostUsd ?? null,
    error_truncated: truncate(snap.errorTruncated),
    terminal_classification: snap.terminalClassification ?? null,
  };

  const { error } = await supabase
    .from("production_run_item_failure_telemetry")
    .insert(row);
  if (error) {
    // Best-effort: never fail the generation path on telemetry insert.
    console.warn(
      "[failure-telemetry] insert failed",
      error.message,
    );
  }

  if (snap.productionRunItemId) {
    const bounded = {
      phase: row.phase,
      provider: row.provider,
      model: row.model,
      attempt_count: row.attempt_count,
      duration_ms: row.duration_ms,
      error_truncated: row.error_truncated,
      terminal_classification: row.terminal_classification,
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
