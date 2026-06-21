import type { SupabaseClient } from "@supabase/supabase-js";
import type { Project } from "@/lib/supabase/types";
import type { AntiRepetitionMemory } from "@/lib/ai/types";
import {
  type EvergreenRef,
  type ScoredTrend,
} from "@/lib/ai/prompts/weeklyStrategy";
import { MIN_TREND_RELEVANCE } from "@/lib/ai/schemas/trendRelevanceScore";
import { buildAntiRepetitionMemory } from "@/lib/ai/workflows/antiRepetitionMemory";
import { loadProjectOrThrow } from "@/lib/ai/workflows/shared";

export interface StrategyPlanningContext {
  project: Project;
  eligibleTrends: ScoredTrend[];
  eligibleTrendIds: Set<string>;
  evergreenTopics: EvergreenRef[];
  evergreenIds: Set<string>;
  trendScores: Record<string, number | null | undefined>;
  memory: AntiRepetitionMemory;
  allowProductBrainTopics: boolean;
}

function readScore(metadata: unknown): number | null {
  if (metadata && typeof metadata === "object") {
    const score = (metadata as Record<string, unknown>)["relevance_score"];
    if (typeof score === "number") return score;
  }
  return null;
}

export async function loadStrategyPlanningContext(
  supabase: SupabaseClient,
  projectId: string,
): Promise<StrategyPlanningContext> {
  const project = await loadProjectOrThrow(supabase, projectId);

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

  const trendScores: Record<string, number | null | undefined> = {};
  for (const t of scoredTrends) {
    trendScores[t.id] = t.relevance_score;
  }

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

  const memory = await buildAntiRepetitionMemory(supabase, projectId);

  const allowProductBrainTopics =
    eligibleTrends.length === 0 && evergreenTopics.length === 0;

  return {
    project,
    eligibleTrends,
    eligibleTrendIds,
    evergreenTopics,
    evergreenIds,
    trendScores,
    memory,
    allowProductBrainTopics,
  };
}
