import type { Project } from "@/lib/supabase/types";
import type { AntiRepetitionMemory, FunnelStage } from "@/lib/ai/types";
import type { CreativeDirectives } from "@/lib/ai/prompts/creativeDirectives";
import { buildSoftCreativeDirectiveBlock } from "@/lib/ai/prompts/creativeDirectives";
import {
  antiRepetitionBlock,
  constraintsBlock,
  projectBrainBlock,
  proofBlock,
  scenarioBlock,
  selectedPainPointBlock,
  type AntiRepetitionPromptOptions,
} from "@/lib/ai/prompts/context";
import { FUNNEL_STAGE_LABELS } from "@/lib/ai/types";
import { pipelineFingerprintMemoryBlock } from "@/lib/content-memory/pipelineFingerprint";
import {
  buildRegenerationInstructionBlock,
  type RegenerationContext,
} from "@/lib/content-pipeline/regeneration";

export const VIDEO_CONCEPT_SYSTEM =
  "You are a senior creative director. Invent or revise ONE video concept for a " +
  "short-form marketing video. Do not invent multiple candidates. Do not score or " +
  "rank. The concept must already be strong enough to produce without later " +
  "evaluation or repair. Return ONLY valid JSON.";

export interface VideoConceptPromptInput {
  project: Project;
  funnelStage: FunnelStage;
  topic: string;
  angle?: string | null;
  platform?: string | null;
  format?: string | null;
  memory?: AntiRepetitionMemory;
  packageIndex?: number | null;
  packageCount?: number | null;
  regeneration?: RegenerationContext | null;
  directives?: CreativeDirectives | null;
  /** Dominant pain point for this package. */
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

export function buildVideoConceptPrompt(input: VideoConceptPromptInput): string {
  const funnel = FUNNEL_STAGE_LABELS[input.funnelStage] ?? input.funnelStage;
  const diversity =
    input.packageIndex != null && input.packageCount != null
      ? `\nPACKAGE SLOT: ${input.packageIndex + 1} of ${input.packageCount} in this production run — make this concept distinct from siblings.`
      : "";
  const regenBlock = input.regeneration
    ? buildRegenerationInstructionBlock(input.regeneration)
    : "";
  const task = input.regeneration
    ? "TASK: Produce exactly ONE video concept for this regeneration (revise or replace per instruction)."
    : "TASK: Invent exactly ONE video concept.";
  const directiveBlock = input.directives
    ? buildSoftCreativeDirectiveBlock(input.directives)
    : "";
  const painBlock = selectedPainPointBlock(input.painPoint);
  const fingerprintBlock = pipelineFingerprintMemoryBlock(
    input.memory?.pipelineFingerprints ?? [],
  );

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
    fingerprintBlock,
    "",
    directiveBlock,
    "",
    "CONTENT STRATEGY ITEM:",
    `- funnel_stage: ${funnel}`,
    `- topic: ${input.topic}`,
    `- angle: ${input.angle?.trim() || "(none)"}`,
    `- platform: ${input.platform ?? "(unspecified)"}`,
    `- format: ${input.format ?? "(unspecified)"}`,
    diversity,
    "",
    regenBlock,
    "",
    constraintsBlock(input.project),
    "",
    "RULES:",
    "- Produce ONE concept only — no alternatives, no voting, no critique.",
    "- Ground the idea in Product Brain, Knowledge Base (proof/scenarios), Recent Memory, and this strategy item.",
    "- Keep the SELECTED PAIN POINT as the dominant problem when provided.",
    "- Creative Directive MODE is the default story shape — the concept must naturally reflect that mode;",
    "  never override product truth or Creative Safety.",
    "- PERSPECTIVE DIVERSITY: choose a concrete point of view that fits this angle (owner, employee,",
    "  customer, sales, support, founder, marketing, operations, first-time visitor, returning customer,",
    "  or invent another). Do not default every concept to the same POV.",
    "- NARRATIVE DIVERSITY: let the MODE (and this angle) choose the structure — observation, customer",
    "  experience, lesson, mistake, surprising fact, comparison, conversation, objection, misconception,",
    "  practical advice, thought experiment, or another invented structure. Do not default every concept",
    "  to Problem → Solution → CTA.",
    "- PRODUCT CONTEXT DIVERSITY: invent a specific situation where the product creates value for this",
    "  audience. Do not reuse the same recurring scene family when recent fingerprints already used it",
    "  (e.g. dark office + laptop + night analytics + silent website visitor), unless this strategy",
    "  angle truly requires that situation.",
    "- Avoid repeating recent hooks/topics/CTAs from memory (unless the instruction explicitly asks to keep wording).",
    "- Avoid repeating recent fingerprint ideas, visual worlds, and narrative mechanisms.",
    "- visual_direction must be concrete enough to later drive image generation.",
    "- character_style may be \"none\" when no recurring character is needed.",
    input.regeneration
      ? "- Honor the regeneration instruction for remain-vs-change (concept replace vs adjust)."
      : "",
    "",
    "Return JSON with keys:",
    "{",
    '  "title": string,',
    '  "core_idea": string,',
    '  "narrative_arc": string,',
    '  "emotional_tone": string,',
    '  "audience_insight": string,',
    '  "product_role": string,',
    '  "why_it_works": string,',
    '  "visual_direction": {',
    '    "art_direction": string,',
    '    "lighting": string,',
    '    "palette": string,',
    '    "environment": string,',
    '    "camera_style": string,',
    '    "character_style": string',
    "  }",
    "}",
  ]
    .filter((line) => line !== "")
    .join("\n");
}
