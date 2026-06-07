import {
  vFunnelStage,
  vNonEmptyString,
  vNumber,
  vObject,
  vOptional,
  vString,
  type Infer,
} from "@/lib/ai/validateAiOutput";

// Minimum score for a trend to be eligible for the weekly strategy.
export const MIN_TREND_RELEVANCE = 60;

export const trendRelevanceScoreSchema = vObject({
  relevance_score: vNumber({ min: 0, max: 100 }),
  rationale: vNonEmptyString(),
  recommended_funnel_stage: vOptional(vFunnelStage()),
  recommended_angle: vOptional(vString()),
});

export type TrendRelevanceScoreOutput = Infer<typeof trendRelevanceScoreSchema>;
