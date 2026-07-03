import type { SupabaseClient } from "@supabase/supabase-js";
import { WorkflowError } from "@/lib/ai/workflows/shared";

export const MISSING_WEEKLY_STRATEGY_CODE = "missing_weekly_strategy" as const;

export function missingWeeklyStrategyResponse(): Response {
  return Response.json(
    { success: false, code: MISSING_WEEKLY_STRATEGY_CODE },
    { status: 422 },
  );
}

export class MissingWeeklyStrategyError extends Error {
  readonly code = MISSING_WEEKLY_STRATEGY_CODE;

  constructor(message = "No content strategy for the requested week") {
    super(message);
    this.name = "MissingWeeklyStrategyError";
  }
}

export async function loadWeeklyStrategyIdForWeek(
  supabase: SupabaseClient,
  projectId: string,
  weekStart: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("content_strategies")
    .select("id")
    .eq("project_id", projectId)
    .eq("period_start", weekStart)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? (data.id as string) : null;
}

export async function assertWeeklyStrategyForWeek(
  supabase: SupabaseClient,
  projectId: string,
  weekStart: string,
): Promise<string> {
  const strategyId = await loadWeeklyStrategyIdForWeek(
    supabase,
    projectId,
    weekStart,
  );
  if (!strategyId) {
    throw new MissingWeeklyStrategyError();
  }
  return strategyId;
}

function readProductionRunId(brief: unknown): string | null {
  if (!brief || typeof brief !== "object" || Array.isArray(brief)) return null;
  const value = (brief as Record<string, unknown>)["production_run_id"];
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** True when n8n should skip generating another package for this strategy item. */
export async function isProductionRunCancelledForStrategyItem(
  supabase: SupabaseClient,
  projectId: string,
  strategyItemId: string,
): Promise<boolean> {
  const { data: itemRow, error: itemErr } = await supabase
    .from("content_strategy_items")
    .select("brief")
    .eq("id", strategyItemId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (itemErr) throw itemErr;
  if (!itemRow) return false;

  const runId = readProductionRunId(itemRow.brief);
  if (!runId) return false;

  const { data: runRow, error: runErr } = await supabase
    .from("production_runs")
    .select("status")
    .eq("id", runId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (runErr) throw runErr;
  return runRow?.status === "cancelled";
}

// Weekly Prepare flow: strategy for week_start must exist and the item must
// belong to it. Production-run items (brief.production_run_id) skip this gate.
export async function assertGenerateContentPackagePreconditions(
  supabase: SupabaseClient,
  args: {
    projectId: string;
    strategyItemId: string;
    weekStart?: string;
  },
): Promise<void> {
  const { data: itemRow, error: itemErr } = await supabase
    .from("content_strategy_items")
    .select("id, strategy_id, brief")
    .eq("id", args.strategyItemId)
    .eq("project_id", args.projectId)
    .maybeSingle();
  if (itemErr) throw itemErr;
  if (!itemRow) {
    throw new WorkflowError(
      "not_found",
      `strategy item ${args.strategyItemId} not found in project ${args.projectId}`,
    );
  }

  if (readProductionRunId(itemRow.brief)) {
    return;
  }

  if (!args.weekStart) {
    throw new MissingWeeklyStrategyError(
      "week_start is required for weekly content package generation",
    );
  }

  const weeklyStrategyId = await assertWeeklyStrategyForWeek(
    supabase,
    args.projectId,
    args.weekStart,
  );
  if ((itemRow.strategy_id as string) !== weeklyStrategyId) {
    throw new MissingWeeklyStrategyError(
      "strategy item does not belong to the weekly strategy for week_start",
    );
  }
}
