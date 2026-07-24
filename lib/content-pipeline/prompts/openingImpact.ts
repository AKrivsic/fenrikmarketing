import type { Project } from "@/lib/supabase/types";
import type { AntiRepetitionMemory } from "@/lib/ai/types";
import type { CreativeDirectives } from "@/lib/ai/prompts/creativeDirectives";
import { buildSoftOpeningDirectiveBlock } from "@/lib/ai/prompts/creativeDirectives";
import {
  antiRepetitionBlock,
  constraintsBlock,
  projectBrainBlock,
  proofBlock,
  scenarioBlock,
  selectedPainPointBlock,
  type AntiRepetitionPromptOptions,
} from "@/lib/ai/prompts/context";
import type { VideoConcept } from "@/lib/content-pipeline/types";
import {
  buildRegenerationInstructionBlock,
  type RegenerationContext,
} from "@/lib/content-pipeline/regeneration";

export const OPENING_IMPACT_SYSTEM =
  "You design the opening 1–2 seconds of a short marketing video. Optimize for " +
  "immediate attention with specificity, curiosity, conflict, and product truth. " +
  "Return ONLY valid JSON. Never invent product facts.";

export interface OpeningImpactPromptInput {
  project: Project;
  concept: VideoConcept;
  topic: string;
  angle?: string | null;
  memory?: AntiRepetitionMemory;
  regeneration?: RegenerationContext | null;
  directives?: CreativeDirectives | null;
  painPoint?: string | null;
}

function antiRepOptsFromRegen(
  regen: RegenerationContext | null | undefined,
): AntiRepetitionPromptOptions {
  if (!regen) return {};
  return {
    keepHook: regen.keepHook,
    keepConcept: regen.keepConcept,
    keepWording: regen.keepWording,
  };
}

export function buildOpeningImpactPrompt(
  input: OpeningImpactPromptInput,
): string {
  const regenBlock = input.regeneration
    ? buildRegenerationInstructionBlock(input.regeneration)
    : "";
  const task = input.regeneration
    ? "TASK: Design Opening Impact for this regeneration (revise opening per instruction; keep concept when instruction is opening-only)."
    : "TASK: Design Opening Impact for this single video concept.";
  const directiveBlock = input.directives
    ? buildSoftOpeningDirectiveBlock(input.directives)
    : "";
  const painBlock = selectedPainPointBlock(input.painPoint);
  const vd = input.concept.visual_direction;

  return [
    task,
    "",
    projectBrainBlock(input.project),
    "",
    proofBlock(input.project),
    "",
    scenarioBlock(input.project),
    "",
    painBlock,
    "",
    input.memory
      ? antiRepetitionBlock(input.memory, antiRepOptsFromRegen(input.regeneration))
      : "",
    "",
    directiveBlock,
    "",
    "VIDEO CONCEPT:",
    `- title: ${input.concept.title}`,
    `- core_idea: ${input.concept.core_idea}`,
    `- narrative_arc: ${input.concept.narrative_arc}`,
    `- emotional_tone: ${input.concept.emotional_tone}`,
    `- audience_insight: ${input.concept.audience_insight}`,
    `- product_role: ${input.concept.product_role}`,
    "",
    "VISUAL WORLD (stay inside this world for first_image):",
    `- art_direction: ${vd.art_direction}`,
    `- lighting: ${vd.lighting}`,
    `- palette: ${vd.palette}`,
    `- environment: ${vd.environment}`,
    `- camera_style: ${vd.camera_style}`,
    `- character_style: ${vd.character_style}`,
    "",
    `TOPIC: ${input.topic}`,
    `ANGLE: ${input.angle?.trim() || "(none)"}`,
    "",
    regenBlock,
    "",
    constraintsBlock(input.project),
    "",
    "OPENING QUALITY (optimize for all four):",
    "- SPECIFICITY: concrete person/object/moment — not abstract business talk.",
    "- CURIOSITY: make the viewer need the next second; leave a gap the video pays off.",
    "- CONFLICT: imply stakes tied to the selected pain point / core_idea.",
    "- PRODUCT TRUTH: opening must be honest to Product Brain / proof; never invent claims.",
    "",
    "AVOID:",
    "- Generic curiosity hooks (\"What if I told you…\", \"Nobody talks about…\", \"The secret is…\").",
    "- Generic business language (synergy, leverage, optimize, unlock growth).",
    "- Clickbait that the concept cannot pay off.",
    "",
    "RULES:",
    "- first_spoken_sentence MUST be in the project language and must NOT match recent hooks in memory (unless instruction says keep the hook).",
    "- first_image is a concrete visual description inside the Visual World (no on-image text/URLs).",
    "- emotion / pacing / attention_pattern describe how the opening grabs attention.",
    "- Do not write the full script — only the opening impact.",
    "- Prefer relevant proof/scenarios when they sharpen specificity; do not force them.",
    input.regeneration
      ? "- If the instruction is opening-focused, redesign the opening even when the concept is unchanged."
      : "",
    "",
    "Return JSON with keys:",
    "{",
    '  "first_image": string,',
    '  "first_spoken_sentence": string,',
    '  "emotion": string,',
    '  "pacing": string,',
    '  "attention_pattern": string',
    "}",
  ]
    .filter((line) => line !== "")
    .join("\n");
}
