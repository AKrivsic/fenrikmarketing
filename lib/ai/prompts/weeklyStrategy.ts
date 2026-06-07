import type { Project } from "@/lib/supabase/types";
import { constraintsBlock, projectBrainBlock } from "@/lib/ai/prompts/context";
import type { ValidationIssue } from "@/lib/ai/validateAiOutput";

export interface ScoredTrend {
  id: string;
  title: string;
  relevance_score: number | null;
}

export interface EvergreenRef {
  id: string;
  title: string;
  pillar: string | null;
}

export interface WeeklyStrategyPromptInput {
  project: Project;
  weekStart: string;
  weekEnd: string;
  // Only trends with relevance_score >= 60 should be passed in.
  eligibleTrends: ScoredTrend[];
  evergreenTopics: EvergreenRef[];
}

export const WEEKLY_STRATEGY_SYSTEM =
  "You are the Content Strategy Layer for an AI Content Manager. You design a " +
  "coherent WEEKLY content strategy (never isolated posts). Funnel stages are " +
  "exactly: Awareness, Problem Aware, Solution Aware, Conversion. Balance the " +
  "funnel across these stages; it must never be Conversion-only. Every " +
  "content_plan item MUST have a funnel_stage. Every content_plan item MUST " +
  "have exactly one topic source: either evergreen_topic_id from the provided " +
  "evergreen list or trend_id from the eligible trends list. Never omit both. " +
  "Never invent UUIDs.";

function formatSourceLists(
  eligibleTrends: ScoredTrend[],
  evergreenTopics: EvergreenRef[],
): { trendsBlock: string; evergreenBlock: string } {
  return {
    trendsBlock: eligibleTrends.length
      ? eligibleTrends
          .map((t) => `- id=${t.id} score=${t.relevance_score ?? "?"} "${t.title}"`)
          .join("\n")
      : "(none)",
    evergreenBlock: evergreenTopics.length
      ? evergreenTopics
          .map((t) => `- id=${t.id} pillar=${t.pillar ?? "?"} "${t.title}"`)
          .join("\n")
      : "(none)",
  };
}

function topicSourceRules(
  eligibleTrends: ScoredTrend[],
  evergreenTopics: EvergreenRef[],
): string {
  const hasTrends = eligibleTrends.length > 0;
  const hasEvergreen = evergreenTopics.length > 0;
  if (!hasTrends && !hasEvergreen) {
    return (
      "TOPIC SOURCE: No eligible trends or evergreen topics were provided — " +
      "you cannot produce a valid content_plan."
    );
  }
  const lines = [
    "TOPIC SOURCE (mandatory for EVERY content_plan item):",
    "- Each item MUST include exactly one source: evergreen_topic_id OR trend_id (never both empty).",
    "- Use ONLY UUIDs from the ELIGIBLE TRENDS and EVERGREEN TOPICS lists below; never invent IDs.",
    "- Reuse the same evergreen_topic_id across multiple items when it fits; still set the field on every item.",
    "- Never create source-less items.",
  ];
  if (hasEvergreen && !hasTrends) {
    lines.push("- Eligible trends are (none): every item MUST set evergreen_topic_id from the evergreen list.");
  } else if (hasTrends && !hasEvergreen) {
    lines.push("- Evergreen topics are (none): every item MUST set trend_id from the eligible trends list.");
  }
  return lines.join("\n");
}

export function buildWeeklyStrategyExpectedShape(
  weekStart: string,
  weekEnd: string,
  eligibleTrends: ScoredTrend[],
  evergreenTopics: EvergreenRef[],
): string {
  const { trendsBlock, evergreenBlock } = formatSourceLists(
    eligibleTrends,
    evergreenTopics,
  );
  return [
    `Weekly strategy JSON. week_start=${weekStart}, week_end=${weekEnd}.`,
    "",
    topicSourceRules(eligibleTrends, evergreenTopics),
    "",
    "ALLOWED trend_id values:",
    trendsBlock,
    "",
    "ALLOWED evergreen_topic_id values:",
    evergreenBlock,
    "",
    "Each content_plan[] entry must include funnel_stage and exactly one of trend_id or evergreen_topic_id from the allowed lists.",
  ].join("\n");
}

export function buildWeeklyStrategyRetryAppend(
  issues: ValidationIssue[],
  eligibleTrends: ScoredTrend[],
  evergreenTopics: EvergreenRef[],
): string {
  const { trendsBlock, evergreenBlock } = formatSourceLists(
    eligibleTrends,
    evergreenTopics,
  );
  return [
    "",
    "RETRY — fix the previous output. Validation failed:",
    issues.map((i) => `- ${i.path}: ${i.message}`).join("\n"),
    "",
    topicSourceRules(eligibleTrends, evergreenTopics),
    "",
    "ALLOWED trend_id values:",
    trendsBlock,
    "",
    "ALLOWED evergreen_topic_id values:",
    evergreenBlock,
    "",
    "Return the full corrected weekly strategy JSON.",
  ].join("\n");
}

export function buildWeeklyStrategyPrompt(
  input: WeeklyStrategyPromptInput,
): string {
  const { project, weekStart, weekEnd, eligibleTrends, evergreenTopics } = input;
  const { trendsBlock, evergreenBlock } = formatSourceLists(
    eligibleTrends,
    evergreenTopics,
  );

  return [
    projectBrainBlock(project),
    "",
    constraintsBlock(project),
    "",
    `WEEK: ${weekStart} -> ${weekEnd}`,
    "",
    "ELIGIBLE TRENDS (relevance_score >= 60; only reference these trend_id values):",
    trendsBlock,
    "",
    "EVERGREEN TOPICS (reference by evergreen_topic_id):",
    evergreenBlock,
    "",
    topicSourceRules(eligibleTrends, evergreenTopics),
    "",
    "TASK: Produce a weekly strategy as JSON with this exact shape:",
    `{
  "week_start": "${weekStart}",
  "week_end": "${weekEnd}",
  "theme": "string",
  "funnel_distribution": { "Awareness": number, "Problem Aware": number, "Solution Aware": number, "Conversion": number },
  "content_plan": [
    {
      "day": "string",
      "platform": "instagram|facebook|linkedin|tiktok|youtube|blog|email",
      "format": "post|story|reel|short|carousel|article|email",
      "funnel_stage": "Awareness|Problem Aware|Solution Aware|Conversion",
      "topic": "string",
      "angle": "string",
      "priority": 1,
      "trend_id": "uuid from ELIGIBLE TRENDS when used",
      "evergreen_topic_id": "uuid from EVERGREEN TOPICS when used"
    }
  ]
}`,
    "Rules: funnel_distribution must not be Conversion-only. Every content_plan " +
      "item must set exactly one of trend_id or evergreen_topic_id using only " +
      "IDs from the lists above.",
  ].join("\n");
}
