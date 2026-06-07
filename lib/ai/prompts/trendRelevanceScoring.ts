import type { Project } from "@/lib/supabase/types";
import { projectBrainBlock } from "@/lib/ai/prompts/context";

export interface TrendScoringPromptInput {
  project: Project;
  trendTitle: string;
  trendSource: string;
  signalStrength: number;
}

export const TREND_SCORING_SYSTEM =
  "You score how relevant a trend is for a specific project on a 0-100 scale. " +
  "Be strict: a trend is only worth using when it clearly fits the audience, " +
  "product and goal. Trends below 60 should not enter the weekly strategy.";

export function buildTrendRelevanceScoringPrompt(
  input: TrendScoringPromptInput,
): string {
  const { project, trendTitle, trendSource, signalStrength } = input;

  return [
    projectBrainBlock(project),
    "",
    "TREND TO SCORE:",
    `- title: "${trendTitle}"`,
    `- source: ${trendSource}`,
    `- signal_strength (1-10): ${signalStrength}`,
    "",
    "TASK: Return JSON with this exact shape:",
    `{
  "relevance_score": 0,
  "rationale": "string",
  "recommended_funnel_stage": "Awareness|Problem Aware|Solution Aware|Conversion",
  "recommended_angle": "string"
}`,
    "relevance_score is an integer 0-100. Output JSON only.",
  ].join("\n");
}
