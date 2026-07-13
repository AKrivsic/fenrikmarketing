import type { SupabaseClient } from "@supabase/supabase-js";
import {
  compactFingerprintSummary,
  fingerprintFromPackageBrief,
  type CreativeFingerprint,
} from "@/lib/series/creativeFingerprints";

export interface SeriesCreativeContext {
  fingerprints: CreativeFingerprint[];
  typedCtaInCurrentRun: number;
  typedCtaInWeeklyStrategy: number;
  recentCtaCompositionIds: string[];
  recentHooks: string[];
  recentCreativeModes: string[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readTopicFromStrategyBrief(brief: unknown): string | null {
  const rec = asRecord(brief);
  const topic = rec?.topic;
  return typeof topic === "string" && topic.trim() ? topic.trim() : null;
}

export async function loadSeriesCreativeContext(args: {
  supabase: SupabaseClient;
  projectId: string;
  weeklyStrategyId?: string | null;
  productionRunId?: string | null;
  excludePackageId?: string | null;
  limit?: number;
}): Promise<SeriesCreativeContext> {
  const limit = args.limit ?? 12;
  const { data: rows, error } = await args.supabase
    .from("content_packages")
    .select("id, package_brief, strategy_item_id, weekly_strategy_id, created_at")
    .eq("project_id", args.projectId)
    .order("created_at", { ascending: false })
    .limit(limit + 5);
  if (error || !rows) {
    return emptyContext();
  }

  const strategyItemIds = Array.from(
    new Set(
      rows
        .map((r) => r.strategy_item_id as string | null)
        .filter((id): id is string => !!id),
    ),
  );
  const topicByStrategyItem = new Map<string, string>();
  const runIdByStrategyItem = new Map<string, string>();
  if (strategyItemIds.length > 0) {
    const { data: strategyRows } = await args.supabase
      .from("content_strategy_items")
      .select("id, brief")
      .in("id", strategyItemIds);
    for (const s of strategyRows ?? []) {
      const id = s.id as string;
      const brief = s.brief;
      const topic = readTopicFromStrategyBrief(brief);
      if (topic) topicByStrategyItem.set(id, topic);
      const runId = asRecord(brief)?.production_run_id;
      if (typeof runId === "string" && runId.trim()) {
        runIdByStrategyItem.set(id, runId.trim());
      }
    }
  }

  const fingerprints: CreativeFingerprint[] = [];
  let typedCtaInCurrentRun = 0;
  let typedCtaInWeeklyStrategy = 0;
  const recentCtaCompositionIds: string[] = [];
  const recentHooks: string[] = [];
  const recentCreativeModes: string[] = [];

  for (const row of rows) {
    const packageId = row.id as string;
    if (args.excludePackageId && packageId === args.excludePackageId) continue;
    const brief = (row.package_brief ?? {}) as Record<string, unknown>;
    const strategyItemId = row.strategy_item_id as string | null;
    const runIdInBrief = strategyItemId
      ? runIdByStrategyItem.get(strategyItemId)
      : undefined;
    const weeklyId = row.weekly_strategy_id as string | null;

    const fp = fingerprintFromPackageBrief({
      packageId,
      brief,
      topic: strategyItemId
        ? topicByStrategyItem.get(strategyItemId) ?? null
        : null,
    });
    if (fingerprints.length < limit) fingerprints.push(fp);

    if (fp.typed_cta) {
      if (
        args.productionRunId &&
        typeof runIdInBrief === "string" &&
        runIdInBrief === args.productionRunId
      ) {
        typedCtaInCurrentRun++;
      }
      if (
        args.weeklyStrategyId &&
        weeklyId === args.weeklyStrategyId
      ) {
        typedCtaInWeeklyStrategy++;
      }
      if (fp.cta_composition_id) {
        recentCtaCompositionIds.push(fp.cta_composition_id);
      }
    }
    if (fp.hook) recentHooks.push(fp.hook);
    if (fp.creative_mode) recentCreativeModes.push(fp.creative_mode);
  }

  return {
    fingerprints,
    typedCtaInCurrentRun,
    typedCtaInWeeklyStrategy,
    recentCtaCompositionIds: recentCtaCompositionIds.slice(0, 8),
    recentHooks: recentHooks.slice(0, 8),
    recentCreativeModes: recentCreativeModes.slice(0, 8),
  };
}

function emptyContext(): SeriesCreativeContext {
  return {
    fingerprints: [],
    typedCtaInCurrentRun: 0,
    typedCtaInWeeklyStrategy: 0,
    recentCtaCompositionIds: [],
    recentHooks: [],
    recentCreativeModes: [],
  };
}

export function seriesContextSummariesForLog(
  ctx: SeriesCreativeContext,
): Record<string, unknown>[] {
  return ctx.fingerprints.slice(0, 6).map(compactFingerprintSummary);
}
