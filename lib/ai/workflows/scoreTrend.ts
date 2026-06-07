import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json, Project } from "@/lib/supabase/types";
import { getScoringProvider } from "@/lib/ai/index";
import {
  generateValidatedJson,
  type GenerateValidatedJsonResult,
} from "@/lib/ai/runWithRepair";
import {
  buildTrendRelevanceScoringPrompt,
  TREND_SCORING_SYSTEM,
} from "@/lib/ai/prompts/trendRelevanceScoring";
import {
  MIN_TREND_RELEVANCE,
  trendRelevanceScoreSchema,
  type TrendRelevanceScoreOutput,
} from "@/lib/ai/schemas/trendRelevanceScore";
import {
  loadProjectOrThrow,
  WorkflowError,
  type WorkflowResult,
} from "@/lib/ai/workflows/shared";
import { normalizeFunnelStage } from "@/lib/ai/types";

export interface ScoreTrendInput {
  projectId: string;
  trendId: string;
}

export interface TrendScoreData {
  trendId: string;
  eligible: boolean;
  score: TrendRelevanceScoreOutput;
}

export async function runScoreTrend(
  input: ScoreTrendInput,
): Promise<WorkflowResult<TrendScoreData>> {
  const { projectId, trendId } = input;
  if (!trendId) throw new WorkflowError("invalid_input", "trend_id is required");

  const supabase = await createSupabaseServerClient();
  const project = await loadProjectOrThrow(supabase, projectId);

  const { data: trend, error } = await supabase
    .from("trends")
    .select("id, title, source, signal_strength, metadata")
    .eq("id", trendId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw error;
  if (!trend) throw new WorkflowError("not_found", `trend ${trendId} not found`);

  const generated = await scoreTrendRelevance({
    project,
    title: trend.title as string,
    source: trend.source as string,
    signalStrength: trend.signal_strength as number,
  });

  if (!generated.ok) {
    return {
      ok: false,
      error: "generation_failed",
      validationErrors: generated.validationErrors,
      attempts: generated.attempts,
    };
  }

  const score = generated.value;
  const prevMetadata = (trend.metadata as Record<string, unknown> | null) ?? {};
  const metadata = {
    ...prevMetadata,
    relevance_score: score.relevance_score,
    relevance_rationale: score.rationale,
    // Normalize the AI label/value to the canonical DB funnel stage.
    recommended_funnel_stage: normalizeFunnelStage(
      score.recommended_funnel_stage,
    ),
    recommended_angle: score.recommended_angle ?? null,
    scored_at: new Date().toISOString(),
  } as unknown as Json;

  const { error: updErr } = await supabase
    .from("trends")
    .update({ metadata })
    .eq("id", trendId)
    .eq("project_id", projectId);
  if (updErr) throw updErr;

  return {
    ok: true,
    data: {
      trendId,
      eligible: score.relevance_score >= MIN_TREND_RELEVANCE,
      score,
    },
  };
}

// Pure AI relevance scoring for a single trend (no DB access). Shared by
// runScoreTrend (scoring an existing trend row) and the n8n trend-scan endpoint
// (scoring inbound candidates) so the prompt, provider routing and schema live
// in exactly one place.
export function scoreTrendRelevance(args: {
  project: Project;
  title: string;
  source: string;
  signalStrength?: number;
}): Promise<GenerateValidatedJsonResult<TrendRelevanceScoreOutput>> {
  return generateValidatedJson({
    textProvider: getScoringProvider(),
    system: TREND_SCORING_SYSTEM,
    prompt: buildTrendRelevanceScoringPrompt({
      project: args.project,
      trendTitle: args.title,
      trendSource: args.source,
      signalStrength: args.signalStrength ?? 1,
    }),
    validator: trendRelevanceScoreSchema,
  });
}
