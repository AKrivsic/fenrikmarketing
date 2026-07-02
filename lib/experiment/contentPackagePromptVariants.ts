/**
 * Prompt variants for local content-package experiments (read-only, no DB).
 */
import type { GenerateContentPackagePromptInput } from "@/lib/ai/prompts/generateContentPackage";
import {
  buildGenerateContentPackagePrompt,
  buildGeneratePackageSystem,
} from "@/lib/ai/prompts/generateContentPackage";
import {
  buildCreativeDirectiveBlock,
  type CreativeDirectives,
  VOICE_PERSONAS,
} from "@/lib/ai/prompts/creativeDirectives";

export type PromptVariantId = "A" | "B" | "C" | "D";

export interface BuiltVariantPrompt {
  variant: PromptVariantId;
  system: string;
  user: string;
}

const SECTION_MARKERS: { id: string; prefix: string }[] = [
  { id: "brain", prefix: "PROJECT BRAIN:" },
  { id: "constraints", prefix: "HARD CONSTRAINTS:" },
  { id: "pain", prefix: "PAIN POINT FIRST" },
  { id: "proof", prefix: "PROOF POOL" },
  { id: "scenario", prefix: "SCENARIO POOL" },
  { id: "website", prefix: "WEBSITE / LINK RULES" },
  { id: "memory", prefix: "ANTI-REPETITION MEMORY" },
  { id: "recentAsset", prefix: "RECENT ASSET USAGE" },
  { id: "funnelAsset", prefix: "FUNNEL ASSET POLICY" },
  { id: "coverage", prefix: "PACKAGE ASSET COVERAGE" },
  { id: "strategy", prefix: "STRATEGY ITEM:" },
  { id: "creative", prefix: "CREATIVE DIRECTIVE" },
  { id: "diversity", prefix: "PACKAGE DIVERSITY" },
  { id: "attention", prefix: "ATTENTION FIRST" },
  { id: "quality", prefix: "CONTENT QUALITY" },
  { id: "hook", prefix: "HOOK V2" },
  { id: "visual", prefix: "VISUAL BEATS:" },
  { id: "assets", prefix: "AVAILABLE ASSETS" },
  { id: "smartAsset", prefix: "SMART ASSET USAGE RULES" },
  { id: "assetLibrary", prefix: "ASSET LIBRARY RULES:" },
  { id: "sample", prefix: "SAMPLE PACKAGE RULES" },
  { id: "platform", prefix: "PLATFORM STYLES" },
  { id: "task", prefix: "TASK: Produce ONE content package" },
];

function splitPromptSections(full: string): Map<string, string> {
  const hits: { id: string; index: number }[] = [];
  for (const { id, prefix } of SECTION_MARKERS) {
    const index = full.indexOf(prefix);
    if (index >= 0) hits.push({ id, index });
  }
  hits.sort((a, b) => a.index - b.index);
  const map = new Map<string, string>();
  for (let i = 0; i < hits.length; i++) {
    const start = hits[i].index;
    const end = i + 1 < hits.length ? hits[i + 1].index : full.length;
    map.set(hits[i].id, full.slice(start, end).trim());
  }
  return map;
}

function joinSections(sections: Map<string, string>, order: string[]): string {
  const parts: string[] = [];
  for (const id of order) {
    const block = sections.get(id);
    if (block) parts.push(block);
  }
  return parts.join("\n\n");
}

const MODE_PERSONA_ALIGN: Record<string, string> = {
  standard: "expert",
  story: "insider",
  shock: "annoyed_operator",
  contrarian: "annoyed_operator",
  myth_buster: "expert",
  humor: "witty_friend",
  mistake: "annoyed_operator",
  comparison: "expert",
  micro_case: "reporter",
  observation: "reporter",
};

function alignDirectivesForVariantD(
  directives: CreativeDirectives,
): CreativeDirectives {
  const personaId = MODE_PERSONA_ALIGN[directives.mode.id] ?? directives.persona.id;
  const persona =
    VOICE_PERSONAS.find((p) => p.id === personaId) ?? directives.persona;
  return { ...directives, persona };
}

function buildCreativeDirectiveBlockVariantD(
  directives: CreativeDirectives,
): string {
  const aligned = alignDirectivesForVariantD(directives);
  const base = buildCreativeDirectiveBlock(aligned);
  const safetyIdx = base.indexOf("CREATIVE SAFETY");
  if (safetyIdx < 0) return base;
  const head = base.slice(0, safetyIdx).trimEnd();
  return [
    head,
    "CREATIVE SAFETY (minimal — keep copy bold within facts):",
    "- Never lie, invent metrics, or use forbidden_claims / product_is_not.",
    "- When MODE energy (humor, shock, contrarian) conflicts with a calm persona, follow MODE for hook and voiceover.",
    "- Pay off curiosity in the content; no clickbait you cannot deliver.",
  ].join("\n");
}

function buildVariantDUserPrompt(
  input: GenerateContentPackagePromptInput,
): string {
  if (!input.directives) {
    return buildGenerateContentPackagePrompt(input);
  }
  const full = buildGenerateContentPackagePrompt(input);
  const sections = splitPromptSections(full);
  const creativeBlock = buildCreativeDirectiveBlockVariantD(input.directives);
  sections.set("creative", creativeBlock);
  const order = [
    "brain",
    "constraints",
    "pain",
    "proof",
    "scenario",
    "website",
    "memory",
    "recentAsset",
    "funnelAsset",
    "coverage",
    "strategy",
    "creative",
    "diversity",
    "attention",
    "quality",
    "hook",
    "visual",
    "assets",
    "smartAsset",
    "assetLibrary",
    "sample",
    "platform",
    "task",
  ];
  return joinSections(sections, order);
}

function buildVariantBUserPrompt(fullA: string): string {
  const sections = splitPromptSections(fullA);
  const order = [
    "brain",
    "constraints",
    "pain",
    "proof",
    "scenario",
    "strategy",
    "creative",
    "diversity",
    "attention",
    "hook",
    "website",
    "memory",
    "recentAsset",
    "funnelAsset",
    "coverage",
    "quality",
    "visual",
    "assets",
    "smartAsset",
    "assetLibrary",
    "sample",
    "platform",
    "task",
  ];
  return joinSections(sections, order);
}

function buildVariantCUserPrompt(fullA: string): string {
  const sections = splitPromptSections(fullA);
  const order = [
    "brain",
    "constraints",
    "pain",
    "proof",
    "scenario",
    "memory",
    "strategy",
    "creative",
    "diversity",
    "attention",
    "quality",
    "hook",
    "task",
  ];
  const joined = joinSections(sections, order);
  return [
    joined,
    "",
    "COPY-FIRST EXPERIMENT NOTE:",
    "- Skip asset_usage unless absolutely essential (prefer empty array).",
    "- Omit image_prompts content detail; 3 short visual scene phrases max if required by JSON.",
    "- platform_outputs: native captions only; no URL in voiceover.",
  ].join("\n");
}

export function buildContentPackagePromptVariant(
  variant: PromptVariantId,
  input: GenerateContentPackagePromptInput,
): BuiltVariantPrompt {
  const requireVideo = input.requireVideo ?? true;
  const system = buildGeneratePackageSystem(requireVideo);
  const fullA = buildGenerateContentPackagePrompt(input);

  let user: string;
  switch (variant) {
    case "A":
      user = fullA;
      break;
    case "B":
      user = buildVariantBUserPrompt(fullA);
      break;
    case "C":
      user = buildVariantCUserPrompt(fullA);
      break;
    case "D":
      user = buildVariantDUserPrompt(input);
      break;
    default:
      user = fullA;
  }

  return { variant, system, user };
}

export const PROMPT_VARIANTS: PromptVariantId[] = ["A", "B", "C", "D"];
