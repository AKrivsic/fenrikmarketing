import type { Project } from "@/lib/supabase/types";
import {
  antiRepetitionBlock,
  constraintsBlock,
  painPointFirstBlock,
  projectBrainBlock,
  proofBlock,
  scenarioBlock,
} from "@/lib/ai/prompts/context";
import {
  type EvergreenRef,
  type ScoredTrend,
} from "@/lib/ai/prompts/weeklyStrategy";
import type { AntiRepetitionMemory } from "@/lib/ai/types";
import type { ProjectCreativeMemory } from "@/lib/content-memory/projectCreativeMemory";
import { creativeMemoryPromptBlock } from "@/lib/content-memory/projectCreativeMemory";
import { projectContentControls } from "@/lib/projects/contentControls";
import { serviceMixBlock } from "@/lib/projects/serviceMix";
import type { ValidationIssue } from "@/lib/ai/validateAiOutput";

export const PRODUCTION_STRATEGY_SYSTEM =
  "You are the Content Strategy Layer for an AI Content Manager. You invent a set of " +
  "INDEPENDENT content PACKAGE opportunities for a production run (each item is one " +
  "video package concept — NOT a calendar week plan, and NOT variations of one master " +
  "theme). Your only jobs: distribute generated videos across the batch, invent distinct " +
  "ideas per item, maintain funnel balance, maintain tone balance, and maximize content " +
  "diversity. Funnel stages are exactly: Awareness, Problem Aware, Solution Aware, " +
  "Conversion. Balance the funnel across these stages; it must never be Conversion-only. " +
  "Every content_plan item MUST have a funnel_stage. Prefer evergreen_topic_id or " +
  "trend_id when those lists provide IDs; eligible trends are optional bonus context " +
  "only. When both lists are empty, derive topics from the Product Brain and omit " +
  "trend_id and evergreen_topic_id. Never invent UUIDs.";

export interface ProductionStrategyPromptInput {
  project: Project;
  packageCount: number;
  eligibleTrends: ScoredTrend[];
  evergreenTopics: EvergreenRef[];
  memory?: AntiRepetitionMemory;
  creativeMemory?: ProjectCreativeMemory;
  /** Creative Core v2 rolling originality window (replaces legacy creative memory block). */
  strategyOriginalityHistoryBlock?: string;
  // Primary persistable platform label for the JSON shape hint (one shared video per package).
  primaryPlatform: string;
}

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
      "TOPIC SOURCE: Eligible trends and evergreen topics are (none). Trends are " +
      "optional — do NOT wait for trends. Derive each content_plan item topic and " +
      "angle from the Product Brain (product_is, pain_points, strengths, audience, " +
      "recent content memory). Omit trend_id and evergreen_topic_id on every item."
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
    lines.push(
      "- Eligible trends are (none): every item MUST set evergreen_topic_id from the evergreen list.",
    );
  } else if (hasTrends && !hasEvergreen) {
    lines.push(
      "- Evergreen topics are (none): prefer trend_id when it fits; otherwise derive topic from Product Brain and omit both IDs.",
    );
  } else if (hasTrends && hasEvergreen) {
    lines.push(
      "- Trends are optional bonus context; evergreen topics are the primary library when both exist.",
    );
  }
  return lines.join("\n");
}

function productionFunnelMixBlock(project: Project): string {
  const controls = projectContentControls(project);
  const mix = controls.funnelMix;
  return [
    "CONTENT CONTROLS (funnel mix for this production run):",
    `- TARGET FUNNEL MIX (approximate %): Awareness ${mix.awareness}, Problem Aware ${mix.problem_aware}, Solution Aware ${mix.solution_aware}, Conversion ${mix.conversion}.`,
    "- Distribute funnel_stage across content_plan items to approximate this mix.",
  ].join("\n");
}

export function buildProductionStrategyExpectedShape(
  packageCount: number,
  eligibleTrends: ScoredTrend[],
  evergreenTopics: EvergreenRef[],
): string {
  const { trendsBlock, evergreenBlock } = formatSourceLists(
    eligibleTrends,
    evergreenTopics,
  );
  return [
    `Production strategy plan JSON. Exactly ${packageCount} content_plan items required.`,
    "",
    topicSourceRules(eligibleTrends, evergreenTopics),
    "",
    "ALLOWED trend_id values:",
    trendsBlock,
    "",
    "ALLOWED evergreen_topic_id values:",
    evergreenBlock,
    "",
    "Each content_plan[] entry must include funnel_stage. Set trend_id and/or " +
      "evergreen_topic_id only when using IDs from the allowed lists; otherwise " +
      "omit both and use Product Brain topics.",
  ].join("\n");
}

export function buildProductionStrategyRetryAppend(
  issues: ValidationIssue[],
  packageCount: number,
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
    `You MUST return exactly ${packageCount} content_plan items.`,
    "",
    topicSourceRules(eligibleTrends, evergreenTopics),
    "",
    "ALLOWED trend_id values:",
    trendsBlock,
    "",
    "ALLOWED evergreen_topic_id values:",
    evergreenBlock,
    "",
    "Return the full corrected production strategy JSON.",
  ].join("\n");
}

export function buildProductionStrategyPrompt(
  input: ProductionStrategyPromptInput,
): string {
  const {
    project,
    packageCount,
    eligibleTrends,
    evergreenTopics,
    primaryPlatform,
  } = input;
  const { trendsBlock, evergreenBlock } = formatSourceLists(
    eligibleTrends,
    evergreenTopics,
  );
  const painPointFirst = painPointFirstBlock(project);
  const proof = proofBlock(project);
  const scenarios = scenarioBlock(project);
  const serviceMix = serviceMixBlock(project);
  const memory = input.memory ? antiRepetitionBlock(input.memory) : "";
  const creativeMem =
    input.strategyOriginalityHistoryBlock?.trim()
      ? input.strategyOriginalityHistoryBlock.trim()
      : input.creativeMemory
        ? creativeMemoryPromptBlock(input.creativeMemory)
        : "";

  const productBrainOnly =
    eligibleTrends.length === 0 && evergreenTopics.length === 0;
  const sourceRule = productBrainOnly
    ? "Every content_plan item must have topic + angle from Product Brain; omit trend_id and evergreen_topic_id."
    : "Set trend_id and/or evergreen_topic_id when using list IDs; trends are optional bonus when evergreen topics exist.";

  return [
    projectBrainBlock(project),
    "",
    constraintsBlock(project),
    ...(painPointFirst ? ["", painPointFirst] : []),
    ...(proof ? ["", proof] : []),
    ...(scenarios ? ["", scenarios] : []),
    ...(serviceMix ? ["", serviceMix] : []),
    ...(memory ? ["", memory] : []),
    ...(creativeMem ? ["", creativeMem] : []),
    "",
    productionFunnelMixBlock(project),
    "",
    `PRODUCTION RUN CONTENT STRATEGY: plan exactly ${packageCount} content_plan items.`,
    "Responsibilities ONLY: invent distinct package opportunities, funnel balance, tone balance, content diversity.",
    "This is NOT a weekly calendar strategy.",
    "Each item is ONE independent package concept (one video). Platform outputs for " +
      "multiple surfaces are generated later from the run config — do not create " +
      "duplicate items per platform.",
    "",
    "INDEPENDENT ITEMS (mandatory — anti-convergence):",
    '- "theme" is a short run LABEL only (batch name). It must NOT become a shared narrative',
    "  that every item expands. Do NOT invent one master story and then write variations of it.",
    `- Produce ${packageCount} independent content opportunities — not ${packageCount} riffs on one scene.`,
    "- Each item still follows Product Brain, audience, funnel balance, and the run objective,",
    "  but must NOT inherit one common plot, setting, or point of view from siblings.",
    "- Across items, deliberately vary: point of view, concrete situation/setting, narrative",
    "  mechanism (how the idea is told), and opening situation.",
    "- packageCount=1 still requires a NEW situation versus prior production runs. Intra-run",
    "  diversity being a no-op does NOT allow repeating last run's pain, scenario family, or visual motif.",
    "- Do not reuse the last pain point when unused pain points exist.",
    "- A different character in the same situation is NOT a new story.",
    "- A paraphrase of the same topic or hook is NOT a new topic.",
    "- Changing only the hook or POV is not enough — change the world, conflict, payoff, and dominant prop.",
    "- Bad: outsider checks a silent company profile (candidate / new hire / client / tab) rewritten N times.",
    "- Good: N distinct situations where the product creates value for this audience.",
    "",
    "ELIGIBLE TRENDS (optional bonus; relevance_score >= 60; only use these trend_id values when relevant):",
    trendsBlock,
    "",
    "EVERGREEN TOPICS (reference by evergreen_topic_id):",
    evergreenBlock,
    "",
    topicSourceRules(eligibleTrends, evergreenTopics),
    "",
    "TASK: Produce a production strategy plan as JSON with this exact shape:",
    `{
  "theme": "string — run label only, NOT a shared storyline for all items",
  "funnel_distribution": { "Awareness": number, "Problem Aware": number, "Solution Aware": number, "Conversion": number },
  "content_plan": [
    {
      "platform": "${primaryPlatform}",
      "format": "reel|post|short",
      "funnel_stage": "Awareness|Problem Aware|Solution Aware|Conversion",
      "topic": "string — independent idea for this item",
      "angle": "string — distinct situation / POV / mechanism vs sibling items",
      "pain_point": "string — copy one PROJECT PAIN POINT (or closest) this item anchors to",
      "priority": 1,
      "trend_id": "uuid from ELIGIBLE TRENDS when used",
      "evergreen_topic_id": "uuid from EVERGREEN TOPICS when used"
    }
  ]
}`,
    `Rules: content_plan MUST contain exactly ${packageCount} items (not fewer, not more). ` +
      "funnel_distribution must not be Conversion-only. " +
      `Set platform to "${primaryPlatform}" on every item. ${sourceRule}` +
      (painPointFirst
        ? " Every item MUST set pain_point to one real project pain point (verbatim or close paraphrase) " +
            "and the topic MUST anchor to it (see PAIN POINT FIRST): " +
            "~80% directly tied to one explicit pain point, ~20% supporting details that still " +
            "connect to a pain point. Same pain_point across items is allowed only when angle/situation differ."
        : ""),
  ].join("\n");
}
