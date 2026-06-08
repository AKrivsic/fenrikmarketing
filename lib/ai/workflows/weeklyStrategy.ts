import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ContentFormat, PlatformType } from "@/lib/supabase/types";
import { getStrategyProvider } from "@/lib/ai/index";
import { generateValidatedJson } from "@/lib/ai/runWithRepair";
import {
  buildWeeklyStrategyExpectedShape,
  buildWeeklyStrategyPrompt,
  buildWeeklyStrategyRetryAppend,
  WEEKLY_STRATEGY_SYSTEM,
  type EvergreenRef,
  type ScoredTrend,
} from "@/lib/ai/prompts/weeklyStrategy";
import {
  weeklyStrategySchema,
  type WeeklyStrategyOutput,
} from "@/lib/ai/schemas/weeklyStrategy";
import { MIN_TREND_RELEVANCE } from "@/lib/ai/schemas/trendRelevanceScore";
import {
  checkWeeklyStrategyGuardrails,
  checkWeeklyStrategySources,
} from "@/lib/ai/guardrails";
import { normalizeFunnelStage } from "@/lib/ai/types";
import {
  coerceFormat,
  loadProjectOrThrow,
  WorkflowError,
  type WorkflowResult,
} from "@/lib/ai/workflows/shared";
import { ensureScenarioPool } from "@/lib/ai/workflows/generateScenarios";
import { buildAntiRepetitionMemory } from "@/lib/ai/workflows/antiRepetitionMemory";

export interface RunWeeklyStrategyInput {
  projectId: string;
  weekStart: string;
  weekEnd: string;
}

export interface WeeklyStrategyData {
  strategyId: string;
  strategy: WeeklyStrategyOutput;
  itemIds: string[];
  // Set when the result is an EXISTING strategy returned by the idempotence
  // guard instead of a freshly generated one (no AI was run).
  reused?: boolean;
}

export async function runWeeklyStrategy(
  input: RunWeeklyStrategyInput,
  // Optional injected client. Frontend/RLS callers omit it (cookie-bound server
  // client); automation (n8n) callers pass the service-role admin client so the
  // same business logic runs without a user session.
  client?: SupabaseClient,
): Promise<WorkflowResult<WeeklyStrategyData>> {
  const { projectId, weekStart, weekEnd } = input;
  if (!weekStart || !weekEnd) {
    throw new WorkflowError("invalid_input", "week_start and week_end are required");
  }

  const supabase: SupabaseClient = client ?? (await createSupabaseServerClient());

  // Idempotence guard (C1). At most ONE weekly strategy per (project, week).
  // If a strategy already exists for this week_start, return it instead of
  // running the (~90s) AI strategy + insert again. This runs BEFORE
  // ensureScenarioPool and the AI call, so a duplicate webhook delivery / n8n
  // retry / re-trigger is a safe no-op with no extra AI cost and no second
  // content_strategies row.
  const existingStrategy = await loadExistingStrategyData(
    supabase,
    projectId,
    weekStart,
  );
  if (existingStrategy) {
    return { ok: true, data: existingStrategy };
  }

  // Task 4 — top the Scenario Pool back up before planning if it has dropped
  // below the minimum. Runs before the project is loaded so the strategy prompt
  // (via scenarioBlock) sees the freshly persisted scenarios. Never throws and
  // no-ops when the pool is already sufficient.
  await ensureScenarioPool(projectId);

  const project = await loadProjectOrThrow(supabase, projectId);

  // Trend Engine: only trends scored >= 60 are eligible for the strategy.
  const { data: trendRows, error: trendErr } = await supabase
    .from("trends")
    .select("id, title, metadata")
    .eq("project_id", projectId);
  if (trendErr) throw trendErr;

  const scoredTrends: ScoredTrend[] = (trendRows ?? []).map((t) => ({
    id: t.id as string,
    title: t.title as string,
    relevance_score: readScore(t.metadata),
  }));
  const eligibleTrends = scoredTrends.filter(
    (t) => (t.relevance_score ?? 0) >= MIN_TREND_RELEVANCE,
  );
  const eligibleTrendIds = new Set(eligibleTrends.map((t) => t.id));

  // Trend score lookup (all trends, incl. ineligible) reused for the
  // post-output source guardrails — no extra DB query.
  const trendScores: Record<string, number | null | undefined> = {};
  for (const t of scoredTrends) {
    trendScores[t.id] = t.relevance_score;
  }

  // Evergreen Library.
  const { data: topicRows, error: topicErr } = await supabase
    .from("evergreen_topics")
    .select("id, title, pillar")
    .eq("project_id", projectId);
  if (topicErr) throw topicErr;
  const evergreenTopics: EvergreenRef[] = (topicRows ?? []).map((t) => ({
    id: t.id as string,
    title: t.title as string,
    pillar: (t.pillar as string | null) ?? null,
  }));
  const evergreenIds = new Set(evergreenTopics.map((t) => t.id));

  // Phase 2E — recent hooks/topics/CTAs/scenarios fed into the strategy prompt
  // so the plan avoids repeating prior themes/angles.
  const memory = await buildAntiRepetitionMemory(supabase, projectId);

  const strategyPrompt = buildWeeklyStrategyPrompt({
    project,
    weekStart,
    weekEnd,
    eligibleTrends,
    evergreenTopics,
    memory,
  });
  const strategyExpectedShape = buildWeeklyStrategyExpectedShape(
    weekStart,
    weekEnd,
    eligibleTrends,
    evergreenTopics,
  );

  const generated = await generateValidatedJson({
    textProvider: getStrategyProvider(),
    system: WEEKLY_STRATEGY_SYSTEM,
    prompt: strategyPrompt,
    validator: weeklyStrategySchema,
    expectedShape: strategyExpectedShape,
    repairGuardrailFailures: true,
    retryPromptAppend: ({ issues }) =>
      buildWeeklyStrategyRetryAppend(issues, eligibleTrends, evergreenTopics),
    // Basic strategy guardrails + source/platform/trend-score guardrails run
    // inside the generation runner, so a source failure marks the output
    // invalid, triggers repair/retry, and on final failure yields
    // generation_failed without ever persisting the strategy.
    guardrails: (value) => [
      ...checkWeeklyStrategyGuardrails(value),
      ...checkWeeklyStrategySources(value, { trendScores }),
    ],
  });

  if (!generated.ok) {
    return {
      ok: false,
      error: "generation_failed",
      validationErrors: generated.validationErrors,
      attempts: generated.attempts,
    };
  }

  const strategy = generated.value;

  // Persist the weekly strategy header (period_start/period_end map to the
  // requested week boundaries).
  const { data: strategyRow, error: insErr } = await supabase
    .from("content_strategies")
    .insert({
      project_id: projectId,
      name: strategy.theme || `Weekly ${weekStart} - ${weekEnd}`,
      objective: project.goal_type,
      period_start: weekStart,
      period_end: weekEnd,
      strategy_brief: strategy as unknown as Record<string, unknown>,
    })
    .select("id")
    .single();
  if (insErr) throw insErr;
  const strategyId = strategyRow.id as string;

  // Persist plan items. funnel_stage lives in brief (no dedicated column).
  const itemRows = strategy.content_plan.map((item) => {
    const trendId =
      item.trend_id && eligibleTrendIds.has(item.trend_id) ? item.trend_id : null;
    const topicId =
      item.evergreen_topic_id && evergreenIds.has(item.evergreen_topic_id)
        ? item.evergreen_topic_id
        : null;
    return {
      strategy_id: strategyId,
      project_id: projectId,
      platform: item.platform as PlatformType,
      format: coerceFormat(item.format, "post") as ContentFormat,
      // funnel_stage is a first-class column (migration 008); normalize the
      // AI label/value to the canonical DB value (migration 009).
      funnel_stage: normalizeFunnelStage(item.funnel_stage),
      trend_id: trendId,
      topic_id: topicId,
      priority: item.priority ?? 3,
      brief: {
        topic: item.topic,
        angle: item.angle ?? null,
        day: item.day ?? null,
      },
    };
  });

  const { data: insertedItems, error: itemErr } = await supabase
    .from("content_strategy_items")
    .insert(itemRows)
    .select("id");
  if (itemErr) throw itemErr;

  return {
    ok: true,
    data: {
      strategyId,
      strategy,
      itemIds: (insertedItems ?? []).map((r) => r.id as string),
    },
  };
}

// Idempotence lookup: the existing weekly strategy for (project, week_start),
// if any. strategy_brief stores the full WeeklyStrategyOutput verbatim, so it
// is read back as the `strategy` payload. When duplicate rows already exist
// (legacy data), the OLDEST is treated as canonical for a deterministic result.
async function loadExistingStrategyData(
  supabase: SupabaseClient,
  projectId: string,
  weekStart: string,
): Promise<WeeklyStrategyData | null> {
  const { data: strategyRow, error } = await supabase
    .from("content_strategies")
    .select("id, strategy_brief")
    .eq("project_id", projectId)
    .eq("period_start", weekStart)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!strategyRow) return null;

  const strategyId = strategyRow.id as string;
  const { data: items, error: itemErr } = await supabase
    .from("content_strategy_items")
    .select("id")
    .eq("project_id", projectId)
    .eq("strategy_id", strategyId);
  if (itemErr) throw itemErr;

  return {
    strategyId,
    strategy: (strategyRow.strategy_brief ?? {}) as unknown as WeeklyStrategyOutput,
    itemIds: (items ?? []).map((r) => r.id as string),
    reused: true,
  };
}

function readScore(metadata: unknown): number | null {
  if (metadata && typeof metadata === "object") {
    const score = (metadata as Record<string, unknown>)["relevance_score"];
    if (typeof score === "number") return score;
  }
  return null;
}
