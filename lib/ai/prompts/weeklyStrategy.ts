import type { Project } from "@/lib/supabase/types";
import {
  antiRepetitionBlock,
  constraintsBlock,
  projectBrainBlock,
  proofBlock,
  scenarioBlock,
} from "@/lib/ai/prompts/context";
import type { AntiRepetitionMemory } from "@/lib/ai/types";
import {
  intensityLabel,
  projectContentControls,
  summarizePlatformTargets,
} from "@/lib/projects/contentControls";
import type { ValidationIssue } from "@/lib/ai/validateAiOutput";
import { PLATFORM_OPTIONS } from "@/lib/projects/fieldOptions";

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
  // Phase 2E — recent hooks/topics/CTAs/scenarios to avoid repeating.
  memory?: AntiRepetitionMemory;
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

// Allowed platforms for this project's plan: projects.platforms when set,
// otherwise the full platform list (backwards compatibility with projects that
// never configured platforms). Returned as the lowercase enum values.
function allowedPlatforms(project: Project): string[] {
  return project.platforms.length > 0
    ? [...project.platforms]
    : [...PLATFORM_OPTIONS];
}

// Content volume + funnel-mix guidance derived from the project's Content
// Controls (stored in publishing_rules). Falls back to safe defaults.
//
// Platform Targets V2: when the project has per-platform weekly targets, those
// drive the volume guidance (total + per-platform counts with content type).
// These are TARGETS the planner should TRY to match — not a hard guarantee —
// so the wording stays explicitly soft.
function controlsBlock(project: Project): string {
  const controls = projectContentControls(project);
  const platforms = allowedPlatforms(project);
  const mix = controls.funnelMix;
  const targets = summarizePlatformTargets(controls, project.platforms);

  const lines = ["CONTENT CONTROLS (respect these project settings):"];

  if (targets.activeEntries.length > 0 && targets.totalOutputs > 0) {
    lines.push(
      `- VOLUME (PLATFORM TARGETS): aim for about ${targets.totalOutputs} content_plan items this week in total ` +
        `(${targets.videoOutputs} video + ${targets.textOutputs} text). These are TARGETS — try to match them; an exact count is NOT required.`,
    );
    lines.push("- PER-PLATFORM WEEKLY TARGETS (platform → target count, content type):");
    for (const entry of targets.activeEntries) {
      lines.push(
        `  - ${entry.platform}: ${entry.target} ${
          entry.contentType === "video" ? "video" : "text"
        } item(s)`,
      );
    }
    lines.push(
      "- Distribute content_plan items so each platform's item count roughly matches its target (more items for higher targets). Every item's platform MUST be one of the active platforms below.",
    );
  } else {
    lines.push(
      `- VOLUME: plan about ${controls.postsPerWeek} content_plan items this week (intensity: ${intensityLabel(controls.postsPerWeek)}).`,
    );
  }

  lines.push(
    `- PLATFORMS: use ONLY these platforms for every content_plan item: ${platforms.join(", ")}.`,
    `- TARGET FUNNEL MIX (approximate %): Awareness ${mix.awareness}, Problem Aware ${mix.problem_aware}, Solution Aware ${mix.solution_aware}, Conversion ${mix.conversion}.`,
  );
  return lines.join("\n");
}

export function buildWeeklyStrategyPrompt(
  input: WeeklyStrategyPromptInput,
): string {
  const { project, weekStart, weekEnd, eligibleTrends, evergreenTopics } = input;
  const { trendsBlock, evergreenBlock } = formatSourceLists(
    eligibleTrends,
    evergreenTopics,
  );
  const proof = proofBlock(project);
  const scenarios = scenarioBlock(project);
  const memory = input.memory ? antiRepetitionBlock(input.memory) : "";
  const platforms = allowedPlatforms(project);
  const controls = projectContentControls(project);
  const targets = summarizePlatformTargets(controls, project.platforms);
  const volumeRule =
    targets.activeEntries.length > 0 && targets.totalOutputs > 0
      ? `Aim for about ${targets.totalOutputs} content_plan items distributed across platforms to roughly match the per-platform targets above (this is a TARGET; exact match not required).`
      : `Aim for about ${controls.postsPerWeek} content_plan items.`;

  return [
    projectBrainBlock(project),
    "",
    constraintsBlock(project),
    ...(proof ? ["", proof] : []),
    ...(scenarios ? ["", scenarios] : []),
    ...(memory ? ["", memory] : []),
    "",
    controlsBlock(project),
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
      "platform": "${platforms.join("|")}",
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
    "Rules: funnel_distribution must not be Conversion-only. Use ONLY the " +
      `allowed platforms (${platforms.join(", ")}). ${volumeRule} ` +
      "Every content_plan item must set exactly one of trend_id or " +
      "evergreen_topic_id using only IDs from the lists above.",
  ].join("\n");
}
