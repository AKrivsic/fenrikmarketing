import {
  vArray,
  vEnum,
  vFunnelStage,
  vNonEmptyString,
  vNumber,
  vObject,
  vOptional,
  vString,
  type Infer,
  type ValidationIssue,
  type Validator,
} from "@/lib/ai/validateAiOutput";

const PLATFORMS = [
  "instagram",
  "facebook",
  "linkedin",
  "tiktok",
  "youtube",
  "blog",
  "email",
] as const;

const FORMATS = [
  "post",
  "story",
  "reel",
  "short",
  "carousel",
  "article",
  "email",
] as const;

export const contentPlanItemSchema = vObject({
  platform: vEnum(PLATFORMS),
  format: vEnum(FORMATS),
  // Accepts human label or DB value; normalized to canonical at persist time.
  funnel_stage: vFunnelStage(),
  topic: vNonEmptyString(),
  angle: vOptional(vString()),
  day: vOptional(vString()),
  priority: vOptional(vNumber({ min: 1, max: 5 })),
  trend_id: vOptional(vString()),
  evergreen_topic_id: vOptional(vString()),
});

// Loose numeric map keyed by funnel stage (human label or DB value). Keys are
// normalized by the guardrails; values must be numbers.
export const funnelDistributionSchema: Validator<Record<string, number>> = (
  value,
  path = "$",
) => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return [{ path, message: "expected object" }];
  }
  const issues: ValidationIssue[] = [];
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry !== "number" || Number.isNaN(entry)) {
      issues.push({ path: `${path}.${key}`, message: "expected number" });
    }
  }
  return issues;
};

export const weeklyStrategySchema = vObject({
  week_start: vNonEmptyString(),
  week_end: vNonEmptyString(),
  theme: vNonEmptyString(),
  funnel_distribution: funnelDistributionSchema,
  content_plan: vArray(contentPlanItemSchema, { min: 1 }),
});

export type WeeklyStrategyOutput = Infer<typeof weeklyStrategySchema>;
export type ContentPlanItem = Infer<typeof contentPlanItemSchema>;
