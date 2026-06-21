import {
  vArray,
  vNonEmptyString,
  vObject,
  type Infer,
} from "@/lib/ai/validateAiOutput";
import {
  contentPlanItemSchema,
  funnelDistributionSchema,
} from "@/lib/ai/schemas/weeklyStrategy";

// Production run strategy plan — volume-driven, no calendar week fields.

export const contentStrategyPlanSchema = vObject({
  theme: vNonEmptyString(),
  funnel_distribution: funnelDistributionSchema,
  content_plan: vArray(contentPlanItemSchema, { min: 1 }),
});

export type ContentStrategyPlanOutput = Infer<typeof contentStrategyPlanSchema>;
