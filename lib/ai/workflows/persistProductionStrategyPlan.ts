import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentFormat, PlatformType } from "@/lib/supabase/types";
import { normalizeFunnelStage } from "@/lib/ai/types";
import type { ContentStrategyPlanOutput } from "@/lib/ai/schemas/contentStrategyPlan";
import { coerceFormat } from "@/lib/ai/workflows/shared";

export interface PersistProductionStrategyPlanArgs {
  supabase: SupabaseClient;
  projectId: string;
  productionRunId: string;
  goalType: string;
  plan: ContentStrategyPlanOutput;
  eligibleTrendIds: Set<string>;
  evergreenIds: Set<string>;
  platform: PlatformType;
  format: ContentFormat;
}

export async function persistProductionStrategyPlan(
  args: PersistProductionStrategyPlanArgs,
): Promise<{ strategyId: string; itemIds: string[] }> {
  const {
    supabase,
    projectId,
    productionRunId,
    goalType,
    plan,
    eligibleTrendIds,
    evergreenIds,
    platform,
    format,
  } = args;

  const { data: strategyRow, error: strategyErr } = await supabase
    .from("content_strategies")
    .insert({
      project_id: projectId,
      name: plan.theme || `Production run ${productionRunId.slice(0, 8)}`,
      objective: goalType,
      // Align with legacy production_run strategies (calendar metadata only).
      period_start: new Date().toISOString().slice(0, 10),
      period_end: null,
      strategy_brief: {
        source: "production_run",
        production_run_id: productionRunId,
        theme: plan.theme,
        funnel_distribution: plan.funnel_distribution,
      } as unknown as Record<string, unknown>,
    })
    .select("id")
    .single();
  if (strategyErr) throw strategyErr;
  const strategyId = strategyRow.id as string;

  try {
    const itemRows = plan.content_plan.map((item, index) => {
      const trendId =
        item.trend_id && eligibleTrendIds.has(item.trend_id)
          ? item.trend_id
          : null;
      const topicId =
        item.evergreen_topic_id && evergreenIds.has(item.evergreen_topic_id)
          ? item.evergreen_topic_id
          : null;
      return {
        strategy_id: strategyId,
        project_id: projectId,
        platform,
        format,
        funnel_stage: normalizeFunnelStage(item.funnel_stage),
        trend_id: trendId,
        topic_id: topicId,
        priority: item.priority ?? 3,
        brief: {
          topic: item.topic,
          angle: item.angle ?? null,
          source: "production_run",
          production_run_id: productionRunId,
          package_index: index,
        } as unknown as Record<string, unknown>,
      };
    });

    const { data: insertedItems, error: itemErr } = await supabase
      .from("content_strategy_items")
      .insert(itemRows)
      .select("id");
    if (itemErr) throw itemErr;

    return {
      strategyId,
      itemIds: (insertedItems ?? []).map((r) => r.id as string),
    };
  } catch (err) {
    await supabase.from("content_strategies").delete().eq("id", strategyId);
    throw err;
  }
}
