/**
 * Shared Content Package contract helpers for CTA (funnel-stage aware) + voiceover limits.
 *
 * Product model: organic social content, not ads. Package CTA is optional on early
 * funnel stages; Conversion requires a business CTA from CTA_TYPES_BY_GOAL.
 */

import type { GoalType } from "@/lib/supabase/types";
import {
  CTA_TYPES_BY_GOAL,
  type FunnelStage,
  normalizeFunnelStage,
} from "@/lib/ai/types";
import {
  VOICEOVER_HARD_CAP_WORDS,
  VOICEOVER_TARGET_MAX_WORDS,
  VOICEOVER_TARGET_MIN_WORDS,
} from "@/lib/ai/guardrails";

/** Soft engagement CTAs — not goal-scoped; ok on Awareness / Problem / Solution. */
export const SOFT_CTA_TYPES = [
  "follow",
  "save",
  "comment",
  "share",
] as const;

export type SoftCtaType = (typeof SOFT_CTA_TYPES)[number];

/** Business / conversion CTAs — goal-scoped via CTA_TYPES_BY_GOAL. */
export const BUSINESS_CTA_TYPES = [
  "lead",
  "contact",
  "book",
  "request_quote",
  "sign_up",
] as const;

export type BusinessCtaType = (typeof BUSINESS_CTA_TYPES)[number];

export type PackageCtaType = SoftCtaType | BusinessCtaType;

export type CtaRequirement = "optional" | "required_business";

export function allowedCtaTypesForGoal(
  goalType: GoalType | string | null | undefined,
): readonly string[] {
  if (!goalType || !(goalType in CTA_TYPES_BY_GOAL)) return [];
  return CTA_TYPES_BY_GOAL[goalType as GoalType] ?? [];
}

/** Business CTA types allowed for this project goal (intersection with BUSINESS_CTA_TYPES). */
export function allowedBusinessCtaTypesForGoal(
  goalType: GoalType | string | null | undefined,
): readonly string[] {
  const fromGoal = allowedCtaTypesForGoal(goalType);
  const business = new Set<string>(BUSINESS_CTA_TYPES);
  return fromGoal.filter((t) => business.has(t));
}

export function isSoftCtaType(type: string | null | undefined): boolean {
  return (
    typeof type === "string" &&
    (SOFT_CTA_TYPES as readonly string[]).includes(type)
  );
}

export function isBusinessCtaType(type: string | null | undefined): boolean {
  return (
    typeof type === "string" &&
    (BUSINESS_CTA_TYPES as readonly string[]).includes(type)
  );
}

/**
 * Allowed cta.type values for a funnel stage + project goal.
 * - awareness / problem_aware: soft only (or null)
 * - solution_aware: soft OR business (goal-scoped)
 * - conversion: business only (goal-scoped), required
 */
export function allowedCtaTypesForFunnelStage(args: {
  funnelStage: FunnelStage | string | null | undefined;
  goalType: GoalType | string | null | undefined;
}): readonly string[] {
  const stage = normalizeFunnelStage(args.funnelStage);
  const business = allowedBusinessCtaTypesForGoal(args.goalType);
  if (!stage) return [...SOFT_CTA_TYPES, ...business];
  switch (stage) {
    case "awareness":
    case "problem_aware":
      return [...SOFT_CTA_TYPES];
    case "solution_aware":
      return [...SOFT_CTA_TYPES, ...business];
    case "conversion":
      return business.length > 0 ? business : [...BUSINESS_CTA_TYPES];
    default:
      return [...SOFT_CTA_TYPES, ...business];
  }
}

export function ctaRequirementForFunnelStage(
  funnelStage: FunnelStage | string | null | undefined,
): CtaRequirement {
  const stage = normalizeFunnelStage(funnelStage);
  return stage === "conversion" ? "required_business" : "optional";
}

export function exampleCtaTypeForGoal(
  goalType: GoalType | string | null | undefined,
): string {
  const allowed = allowedBusinessCtaTypesForGoal(goalType);
  if (allowed.includes("contact")) return "contact";
  if (allowed.includes("lead")) return "lead";
  return allowed[0] ?? "contact";
}

export function exampleCtaTypeForStage(args: {
  funnelStage: FunnelStage | string | null | undefined;
  goalType: GoalType | string | null | undefined;
}): string | null {
  const req = ctaRequirementForFunnelStage(args.funnelStage);
  const allowed = allowedCtaTypesForFunnelStage(args);
  if (req === "required_business") {
    return exampleCtaTypeForGoal(args.goalType);
  }
  if (allowed.includes("follow")) return "follow";
  return allowed[0] ?? null;
}

/** Prompt block: funnel-stage CTA contract (organic social, not ads). */
export function buildContentPackageCtaContractBlock(args: {
  goalType: GoalType | string;
  funnelStage: FunnelStage | string;
  allowedCtaTypes: readonly string[];
  ctaRequired: boolean;
}): string {
  const { goalType, funnelStage, allowedCtaTypes, ctaRequired } = args;
  const stage = normalizeFunnelStage(funnelStage) ?? funnelStage;
  const softList = SOFT_CTA_TYPES.join(" | ");
  const businessList =
    allowedBusinessCtaTypesForGoal(goalType).join(" | ") ||
    BUSINESS_CTA_TYPES.join(" | ");
  const allowedList =
    allowedCtaTypes.length > 0
      ? allowedCtaTypes.join(" | ")
      : "(none — fix goal/stage)";
  const exampleBiz = exampleCtaTypeForGoal(goalType);

  const stageRules: Record<string, string> = {
    awareness: [
      "- Awareness: cta MAY be null (preferred when the post is pure value).",
      `- Or soft CTA only: { "type": one of [${softList}], "text": "..." }.`,
      "- Do NOT use business/sales CTAs (lead, contact, book, request_quote, sign_up).",
    ].join("\n"),
    problem_aware: [
      "- Problem Aware: cta MAY be null.",
      `- Or soft CTA only: { "type": one of [${softList}], "text": "..." }.`,
      "- Do NOT use business/sales CTAs.",
    ].join("\n"),
    solution_aware: [
      "- Solution Aware: cta MAY be a soft CTA or a business CTA when the topic invites action.",
      `- Soft: ${softList}`,
      `- Business (goal-scoped for goal_type="${goalType}"): ${businessList}`,
      "- cta may also be null when a soft close is enough in the caption alone.",
    ].join("\n"),
    conversion: [
      "- Conversion: business CTA is REQUIRED.",
      `- cta MUST be { "type": one of [${businessList}], "text": "non-empty string" }.`,
      `- Example: { "cta": { "type": "${exampleBiz}", "text": "Book a short consultation." } }`,
      "- Soft-only CTAs (follow/save/comment/share) are NOT enough at Conversion.",
    ].join("\n"),
  };

  const stageBlock =
    stageRules[String(stage)] ??
    `- Funnel stage "${stage}": allowed cta.type values: ${allowedList}`;

  return [
    "CTA CONTRACT (organic social content — NOT ads; not every package needs a sales CTA):",
    `- Strategy funnel_stage: "${stage}". project.goal_type is "${goalType}" (NOT a valid cta.type).`,
    stageBlock,
    `- When cta is present, cta.type MUST be exactly one of: ${allowedList}`,
    '- Shape: cta is null OR { "type": string, "text": non-empty string }.',
    "- Never emit an empty string as cta, and never use the strings \"null\" or \"undefined\".",
    "- Do NOT use lead_generation, conversion, sales, demo_request, learn_more, or goal_type as cta.type.",
    ctaRequired
      ? "- cta object is mandatory for this package (Conversion)."
      : "- Omitting cta (null) is valid for this package when no soft/business CTA is needed.",
    "PLATFORM CTA:",
    "- platform_outputs.<platform>.cta is OPTIONAL (string or null/omit).",
    "- When package cta is null, omit platform cta or set it null — captions must stand alone.",
    "- When package cta is present, platform cta SHOULD be the same call-to-action text (or a short platform-native paraphrase), never an empty string.",
    "- Never invent a sales CTA on a platform when the package has no CTA.",
  ].join("\n");
}

/**
 * Prompt block: spoken narration length.
 * Runtime TTS uses voiceover_text (not video.script as the spoken source of truth).
 */
export function buildContentPackageVoiceoverContractBlock(args?: {
  ctaRequired?: boolean;
}): string {
  const ctaLine = args?.ctaRequired
    ? "- Include a short closing CTA line inside the same voiceover_text budget."
    : "- A short soft close is optional; do not force a sales CTA into the narration when package cta is null.";
  return [
    "VOICEOVER_TEXT LENGTH (strict — guardrails hard-fail over the maximum):",
    "- voiceover_text is the spoken narration used for TTS.",
    `- Target ${VOICEOVER_TARGET_MIN_WORDS}–${VOICEOVER_TARGET_MAX_WORDS} words.`,
    `- Hard maximum ${VOICEOVER_HARD_CAP_WORDS} words — never exceed ${VOICEOVER_HARD_CAP_WORDS}.`,
    "- The hook (first spoken sentence) counts toward this limit.",
    ctaLine,
    "- Do not pad with repeated explanations of the same point.",
    "- subtitles should track the same spoken words (not a second long essay).",
    "- video.script may include scene directions, but spoken VO lines inside it must stay consistent with voiceover_text and must not invent a much longer spoken script.",
  ].join("\n");
}

export function buildContentPackageVoiceoverExpectedShapeLine(): string {
  return `voiceover_text: ${VOICEOVER_TARGET_MIN_WORDS}–${VOICEOVER_TARGET_MAX_WORDS} words preferred; maximum ${VOICEOVER_HARD_CAP_WORDS} words (TTS source of truth).`;
}

export function buildContentPackageCtaExpectedShapeLine(args: {
  allowedCtaTypes: readonly string[];
  ctaRequired: boolean;
}): string {
  const list =
    args.allowedCtaTypes.length > 0
      ? args.allowedCtaTypes.join(" | ")
      : "follow | save | comment | share | lead | contact | book | request_quote | sign_up";
  if (args.ctaRequired) {
    return `cta is REQUIRED: { type: one of [${list}], text: non-empty string }. Never null. Never use project.goal_type as type.`;
  }
  return `cta may be null OR { type: one of [${list}], text: non-empty string }. Do not use empty string. Never use project.goal_type as type.`;
}

export {
  VOICEOVER_HARD_CAP_WORDS,
  VOICEOVER_TARGET_MAX_WORDS,
  VOICEOVER_TARGET_MIN_WORDS,
};
