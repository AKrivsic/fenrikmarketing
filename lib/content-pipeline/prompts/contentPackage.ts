import type { Project } from "@/lib/supabase/types";
import type { AntiRepetitionMemory, FunnelStage } from "@/lib/ai/types";
import { FUNNEL_STAGE_LABELS } from "@/lib/ai/types";
import type { CreativeDirectives } from "@/lib/ai/prompts/creativeDirectives";
import { buildSoftCreativeDirectiveBlock } from "@/lib/ai/prompts/creativeDirectives";
import {
  antiRepetitionBlock,
  constraintsBlock,
  projectBrainBlock,
  proofBlock,
  scenarioBlock,
  selectedPainPointBlock,
  websiteLinkRulesBlock,
  type AntiRepetitionPromptOptions,
} from "@/lib/ai/prompts/context";
import {
  buildPlatformNativeWritingRulesBlock,
  buildPlatformStyleBlock,
} from "@/lib/ai/prompts/platformStyles";
import type { AssetRef } from "@/lib/assets/assetRef";
import type {
  OpeningImpact,
  VideoConcept,
  VisualIdentity,
} from "@/lib/content-pipeline/types";
import {
  buildRegenerationInstructionBlock,
  type RegenerationContext,
} from "@/lib/content-pipeline/regeneration";
import {
  buildContentPackagePlatformOutputsContractBlock,
  buildContentPackageVisualScenesBlock,
} from "@/lib/content-pipeline/prompts/contentPackageVisualScenes";
import {
  allowedCtaTypesForFunnelStage,
  buildContentPackageCtaContractBlock,
  buildContentPackageVoiceoverContractBlock,
  ctaRequirementForFunnelStage,
} from "@/lib/content-pipeline/prompts/contentPackageContract";

export function buildContentPackageSystem(requireVideo: boolean): string {
  return (
    "You are the Content Package generator for the production content pipeline. " +
    "Generate ONE complete content package as valid JSON in a single pass. " +
    "Do not propose alternatives. Do not leave fields for later repair. " +
    (requireVideo
      ? "This package REQUIRES a full video block, voiceover, and visual scenes/image prompts. "
      : "This package is text-oriented; include video fields only if natural. ") +
    "Honor Opening Impact exactly for the hook and opening spoken line. " +
    "Honor Visual Identity for all image prompts. Return ONLY JSON."
  );
}

export interface ContentPackagePromptInput {
  project: Project;
  funnelStage: FunnelStage;
  topic: string;
  angle?: string | null;
  platform?: string | null;
  format?: string | null;
  concept: VideoConcept;
  openingImpact: OpeningImpact;
  visualIdentity: VisualIdentity;
  availableAssets: AssetRef[];
  memory?: AntiRepetitionMemory;
  targetPlatforms: readonly string[];
  requireVideo: boolean;
  videoPlatforms?: readonly string[];
  variantCounts?: Record<string, number>;
  regeneration?: RegenerationContext | null;
  directives?: CreativeDirectives | null;
  painPoint?: string | null;
}

function assetsBlock(assets: AssetRef[]): string {
  if (assets.length === 0) return "AVAILABLE ASSETS: (none)";
  return [
    "AVAILABLE ASSETS:",
    ...assets.slice(0, 24).map((a) => {
      const bits = [
        `id=${a.id}`,
        `title=${a.title}`,
        `class=${a.asset_class}`,
        `media=${a.media_type}`,
      ];
      if (a.ai_description) bits.push(`desc=${a.ai_description.slice(0, 120)}`);
      return `- ${bits.join("; ")}`;
    }),
  ].join("\n");
}

function variantCountsBlock(
  counts: Record<string, number> | undefined,
): string {
  if (!counts) return "";
  const lines = Object.entries(counts)
    .filter(([, n]) => n > 1)
    .map(([p, n]) => {
      if (p === "x") {
        return `- x: ${n} distinct caption_variants AND ${n} title_variants; ALSO set caption = caption_variants[0]`;
      }
      return `- ${p}: ${n} distinct caption_variants; ALSO set caption = caption_variants[0]`;
    });
  if (lines.length === 0) return "";
  return [
    "VARIANT COUNTS (produce this many distinct variants):",
    ...lines,
    "CRITICAL: caption_variants never replace caption. Every platform still needs caption (use caption_variants[0]).",
    "LinkedIn with variants → caption + caption_variants. X with variants → caption + caption_variants + title_variants.",
  ].join("\n");
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

export function buildContentPackagePrompt(
  input: ContentPackagePromptInput,
): string {
  const funnel = FUNNEL_STAGE_LABELS[input.funnelStage] ?? input.funnelStage;
  const platforms = input.targetPlatforms;
  const regenBlock = input.regeneration
    ? buildRegenerationInstructionBlock(input.regeneration)
    : "";
  const task = input.regeneration
    ? "TASK: Produce ONE complete regenerated content package JSON (honor remain-vs-change from the instruction)."
    : "TASK: Produce ONE complete content package JSON.";
  const directiveBlock = input.directives
    ? buildSoftCreativeDirectiveBlock(input.directives)
    : "";
  const painBlock = selectedPainPointBlock(input.painPoint);
  const allowedCtaTypes = allowedCtaTypesForFunnelStage({
    funnelStage: input.funnelStage,
    goalType: input.project.goal_type,
  });
  const ctaRequired =
    ctaRequirementForFunnelStage(input.funnelStage) === "required_business";
  const ctaBlock = buildContentPackageCtaContractBlock({
    goalType: input.project.goal_type,
    funnelStage: input.funnelStage,
    allowedCtaTypes,
    ctaRequired,
  });
  const voiceoverBlock = buildContentPackageVoiceoverContractBlock({
    ctaRequired,
  });

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
    websiteLinkRulesBlock(input.project),
    "",
    directiveBlock,
    "",
    "CONTENT STRATEGY ITEM:",
    `- funnel_stage: ${funnel}`,
    `- topic: ${input.topic}`,
    `- angle: ${input.angle?.trim() || "(none)"}`,
    `- platform: ${input.platform ?? "(unspecified)"}`,
    `- format: ${input.format ?? "(unspecified)"}`,
    "",
    regenBlock,
    "",
    "VIDEO CONCEPT (authoritative story idea):",
    JSON.stringify(input.concept, null, 2),
    "",
    "OPENING IMPACT (authoritative cold open — MUST use):",
    `- first_image → scene 1 / first image_prompt`,
    `- first_spoken_sentence → hook AND first spoken line of voiceover_text`,
    `- emotion: ${input.openingImpact.emotion}`,
    `- pacing: ${input.openingImpact.pacing}`,
    `- attention_pattern: ${input.openingImpact.attention_pattern}`,
    `- first_spoken_sentence: ${input.openingImpact.first_spoken_sentence}`,
    `- first_image: ${input.openingImpact.first_image}`,
    "",
    "VISUAL IDENTITY (authoritative look — apply to ALL image prompts):",
    JSON.stringify(input.visualIdentity, null, 2),
    "",
    assetsBlock(input.availableAssets),
    "",
    variantCountsBlock(input.variantCounts),
    "",
    buildPlatformNativeWritingRulesBlock(),
    buildPlatformStyleBlock(platforms),
    "",
    constraintsBlock(input.project),
    "",
    "HARD RULES:",
    `- funnel_stage must be exactly "${funnel}" (or the canonical label matching the strategy item).`,
    "- hook MUST equal Opening Impact first_spoken_sentence (same language).",
    "- voiceover_text MUST begin with that same first spoken sentence.",
    "- Keep the SELECTED PAIN POINT as the dominant problem throughout the script when provided.",
    "- Prefer Creative Directive mode beats / voice when they improve storytelling — soft guidance only.",
    "- Do not invent product claims outside Product Brain / proof.",
    input.requireVideo
      ? "- Require video.concept, video.script, voiceover_text, subtitles, and 3–5 visual_scenes (legacy IMAGE preferred)."
      : "- Video block optional for text-only packages.",
    "- platform_outputs must include every required platform listed below.",
    `- Required platforms: ${platforms.join(", ")}`,
    input.videoPlatforms && input.videoPlatforms.length > 0
      ? `- Video platforms (shared video): ${input.videoPlatforms.join(", ")}`
      : "",
    "",
    voiceoverBlock,
    "",
    ctaBlock,
    "",
    buildContentPackagePlatformOutputsContractBlock(),
    "",
    "OTHER FIELD TYPES:",
    '- video.duration_seconds must be a string when present (e.g. "24").',
    "- asset_usage is optional; when present each entry is { asset_id: string, used_as: string, modify?: string }.",
    "- asset_usage[].used_as must be a string.",
    "- youtube caption: Shorts-native — hard maximum 55 words (guardrails reject longer).",
    "- x caption: hard maximum 280 characters (guardrails reject longer).",
    "",
    buildContentPackageVisualScenesBlock({ requireVideo: input.requireVideo }),
    "",
    "Return a single JSON object matching the content package schema:",
    "{",
    '  "title": string,',
    '  "funnel_stage": string,',
    '  "hook": string,',
    '  "voiceover_text": string (40–70 words preferred; max 80),',
    '  "subtitles": string,',
    ctaRequired
      ? `  "cta": { "type": one of [${allowedCtaTypes.join(", ")}], "text": string },`
      : `  "cta": null OR { "type": one of [${allowedCtaTypes.join(", ")}], "text": string },`,
    '  "video": { "concept": string, "script": string, "duration_seconds": string },',
    '  "platform_outputs": { "<platform>": { "caption": string, "cta"?: string|null, "hashtags": string[], "format": string, "caption_variants"?: string[], "title_variants"?: string[] } },',
    '  "hashtags": string[],',
    '  "image_prompts": string[],',
    '  "visual_scenes": [ { "source": "ai", "image_prompt": "string" }, ... ],',
    '  "asset_usage": [ { "asset_id": "string", "used_as": "string" } ],',
    '  "scenario": optional string',
    "}",
    "Remember: if caption_variants is present, caption MUST equal caption_variants[0].",
  ]
    .filter((line) => line !== "")
    .join("\n");
}
