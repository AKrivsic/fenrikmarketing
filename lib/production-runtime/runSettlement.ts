/**
 * Phase 6G — terminal run settlement + counter recompute helpers.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProductionRunStatus } from "@/lib/supabase/types";
import { runtimeLog } from "@/lib/production-runtime/runtimeLog";

export interface SettleTerminalResult {
  runId: string;
  status: ProductionRunStatus;
  settledOpenItems: number;
  counters: {
    requested_total: number;
    generated_total: number;
    failed_total: number;
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function recomputeProductionRunCounters(
  supabase: SupabaseClient,
  runId: string,
): Promise<{
  requested_total: number;
  generated_total: number;
  failed_total: number;
}> {
  const { data, error } = await supabase.rpc(
    "recompute_production_run_counters",
    { p_run_id: runId },
  );
  if (error) throw error;
  const row = asRecord(data);
  return {
    requested_total: Number(row.requested_total ?? 0),
    generated_total: Number(row.generated_total ?? 0),
    failed_total: Number(row.failed_total ?? 0),
  };
}

/**
 * Atomically settle open child items, recompute counters, then write terminal
 * parent status. Prefer this over a bare status update for failed/cancelled.
 */
export async function settleProductionRunTerminal(
  supabase: SupabaseClient,
  args: {
    runId: string;
    status: "completed" | "failed" | "cancelled";
    errorMessage?: string | null;
    itemErrorMessage?: string | null;
  },
): Promise<SettleTerminalResult> {
  const { data, error } = await supabase.rpc("settle_production_run_terminal", {
    p_run_id: args.runId,
    p_status: args.status,
    p_error_message: args.errorMessage ?? null,
    p_item_error_message: args.itemErrorMessage ?? null,
  });
  if (error) throw error;
  const row = asRecord(data);
  const counters = asRecord(row.counters);
  runtimeLog("info", {
    event: "production_run_status_transition",
    production_run_id: args.runId,
    outcome: args.status,
    detail: `settled_open_items=${Number(row.settled_open_items ?? 0)}`,
  });
  return {
    runId: args.runId,
    status: args.status,
    settledOpenItems: Number(row.settled_open_items ?? 0),
    counters: {
      requested_total: Number(counters.requested_total ?? 0),
      generated_total: Number(counters.generated_total ?? 0),
      failed_total: Number(counters.failed_total ?? 0),
    },
  };
}

/** Recompute counters from items in application memory (tests / fallback). */
export function computeCountersFromItems(
  items: Array<{ status: string }>,
): {
  requested_total: number;
  generated_total: number;
  failed_total: number;
} {
  return {
    requested_total: items.length,
    generated_total: items.filter((i) => i.status === "completed").length,
    failed_total: items.filter((i) => i.status === "failed").length,
  };
}
