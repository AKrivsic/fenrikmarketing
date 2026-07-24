import type {
  OpeningImpact,
  VideoConcept,
  VisualIdentity,
} from "@/lib/content-pipeline/types";
import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";

/**
 * Regeneration context passed into Content Pipeline stages.
 * Prior package is intentional revision context — not forbidden content.
 */
export interface RegenerationContext {
  /** User instruction (feedback). Empty/null = revise for freshness. */
  instruction: string | null;
  previousTitle: string;
  /** Compact summary of the existing package for revision grounding. */
  previousPackageSummary: string;
  priorVideoConcept: VideoConcept | null;
  priorOpeningImpact: OpeningImpact | null;
  priorVisualIdentity: VisualIdentity | null;
  /** Existing package id (for scene normalize / telemetry). */
  packageId: string;
  /** Soft anti-rep: honor keep-* intents from the user instruction. */
  keepHook?: boolean;
  keepConcept?: boolean;
  keepWording?: boolean;
}

/** Detect keep-hook / keep-concept / keep-wording intents in feedback. */
export function parseRegenerationKeepFlags(
  instruction: string | null | undefined,
): {
  keepHook: boolean;
  keepConcept: boolean;
  keepWording: boolean;
} {
  const text = (instruction ?? "").toLowerCase();
  if (!text.trim()) {
    return { keepHook: false, keepConcept: false, keepWording: false };
  }
  const keepHook =
    /\bkeep\b.{0,40}\bhook\b/.test(text) ||
    /\bsame\b.{0,40}\bhook\b/.test(text) ||
    /\bdon'?t\b.{0,40}\bchange\b.{0,40}\bhook\b/.test(text) ||
    /\bpreserve\b.{0,40}\bhook\b/.test(text);
  const keepConcept =
    /\bkeep\b.{0,40}\bconcept\b/.test(text) ||
    /\bsame\b.{0,40}\bconcept\b/.test(text) ||
    /\bdon'?t\b.{0,40}\bchange\b.{0,40}\bconcept\b/.test(text) ||
    /\bpreserve\b.{0,40}\bconcept\b/.test(text) ||
    /\bkeep\b.{0,40}\bidea\b/.test(text);
  const keepWording =
    /\bkeep\b.{0,40}\bwording\b/.test(text) ||
    /\bsame\b.{0,40}\bwording\b/.test(text) ||
    /\bkeep\b.{0,40}\btone\b/.test(text) ||
    /\bdon'?t\b.{0,40}\brewrit/.test(text) ||
    /\bpreserve\b.{0,40}\bwording\b/.test(text);
  return { keepHook, keepConcept, keepWording };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function parseVideoConcept(raw: unknown): VideoConcept | null {
  const o = asRecord(raw);
  if (!o) return null;
  const vd = asRecord(o.visual_direction);
  if (!vd) return null;
  const title = asNonEmptyString(o.title);
  const core = asNonEmptyString(o.core_idea);
  if (!title || !core) return null;
  return {
    title,
    core_idea: core,
    narrative_arc: asNonEmptyString(o.narrative_arc) ?? "",
    emotional_tone: asNonEmptyString(o.emotional_tone) ?? "",
    audience_insight: asNonEmptyString(o.audience_insight) ?? "",
    product_role: asNonEmptyString(o.product_role) ?? "",
    why_it_works: asNonEmptyString(o.why_it_works) ?? "",
    visual_direction: {
      art_direction: asNonEmptyString(vd.art_direction) ?? "",
      lighting: asNonEmptyString(vd.lighting) ?? "",
      palette: asNonEmptyString(vd.palette) ?? "",
      environment: asNonEmptyString(vd.environment) ?? "",
      camera_style: asNonEmptyString(vd.camera_style) ?? "",
      character_style: asNonEmptyString(vd.character_style) ?? "none",
    },
  };
}

function parseOpeningImpact(raw: unknown): OpeningImpact | null {
  const o = asRecord(raw);
  if (!o) return null;
  const firstSpoken = asNonEmptyString(o.first_spoken_sentence);
  const firstImage = asNonEmptyString(o.first_image);
  if (!firstSpoken || !firstImage) return null;
  return {
    first_image: firstImage,
    first_spoken_sentence: firstSpoken,
    emotion: asNonEmptyString(o.emotion) ?? "",
    pacing: asNonEmptyString(o.pacing) ?? "",
    attention_pattern: asNonEmptyString(o.attention_pattern) ?? "",
  };
}

function parseVisualIdentity(raw: unknown): VisualIdentity | null {
  const o = asRecord(raw);
  if (!o) return null;
  const art = asNonEmptyString(o.art_direction);
  if (!art) return null;
  return {
    art_direction: art,
    lighting: asNonEmptyString(o.lighting) ?? "",
    palette: asNonEmptyString(o.palette) ?? "",
    environment: asNonEmptyString(o.environment) ?? "",
    camera_style: asNonEmptyString(o.camera_style) ?? "",
    character_style: asNonEmptyString(o.character_style) ?? "none",
    opening_emotion: asNonEmptyString(o.opening_emotion) ?? "",
    opening_first_image: asNonEmptyString(o.opening_first_image) ?? "",
  };
}

/** Read prior pipeline artifacts from package_brief.presentation_generation. */
export function extractPriorPipelineArtifacts(packageBrief: unknown): {
  video_concept: VideoConcept | null;
  opening_impact: OpeningImpact | null;
  visual_identity: VisualIdentity | null;
} {
  const brief = asRecord(packageBrief);
  const pg = asRecord(brief?.presentation_generation);
  return {
    video_concept: parseVideoConcept(pg?.video_concept),
    opening_impact: parseOpeningImpact(pg?.opening_impact),
    visual_identity: parseVisualIdentity(pg?.visual_identity),
  };
}

/** Compact existing-package summary for regeneration prompts. */
export function summarizeExistingPackage(args: {
  title: string;
  brief: unknown;
}): string {
  const brief = asRecord(args.brief);
  const hook = asNonEmptyString(brief?.hook) ?? "";
  const vo = asNonEmptyString(brief?.voiceover_text) ?? "";
  const video = asRecord(brief?.video);
  const concept = asNonEmptyString(video?.concept) ?? "";
  const cta = asRecord(brief?.cta);
  const ctaText = asNonEmptyString(cta?.text) ?? "";
  const lines = [
    `title: ${args.title}`,
    hook ? `hook: ${hook}` : "",
    concept ? `video.concept: ${concept}` : "",
    vo ? `voiceover (excerpt): ${vo.slice(0, 280)}${vo.length > 280 ? "…" : ""}` : "",
    ctaText ? `cta: ${ctaText}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}

/**
 * Shared regeneration instruction block for Content Pipeline stages.
 * Clarifies remain vs change; treats prior package as revision context.
 */
export function buildRegenerationInstructionBlock(
  regen: RegenerationContext,
): string {
  const instruction =
    regen.instruction?.trim() ||
    "(no specific instruction — produce a meaningfully fresh revision of the same strategy item)";

  const priorConcept = regen.priorVideoConcept
    ? JSON.stringify(regen.priorVideoConcept, null, 2)
    : "(none stored — infer from package summary)";
  const priorOpening = regen.priorOpeningImpact
    ? JSON.stringify(regen.priorOpeningImpact, null, 2)
    : "(none stored)";
  const priorIdentity = regen.priorVisualIdentity
    ? JSON.stringify(regen.priorVisualIdentity, null, 2)
    : "(none stored)";

  return [
    "REGENERATION MODE:",
    "- You are revising an EXISTING content package. The prior package is CONTEXT for intentional revision — not forbidden content.",
    "- Infer what should REMAIN vs what should CHANGE from the user instruction.",
    "- If the instruction targets only the opening → keep the core concept; redesign Opening Impact.",
    "- If the instruction asks for a completely different concept → invent a new concept (still on-strategy).",
    "- If the instruction is wording/tone only → keep concept + opening structure; rewrite language.",
    "- If the instruction is visual (brighter, different look) → update visual_direction / Visual Identity accordingly.",
    "- If the instruction says to KEEP the hook / concept / wording → honor that; do not aggressively avoid those elements.",
    "- Produce ONE result only. No candidates, no scoring, no critic.",
    "",
    `USER REGENERATION INSTRUCTION: ${instruction}`,
    "",
    "EXISTING PACKAGE SUMMARY:",
    regen.previousPackageSummary,
    "",
    "PRIOR VIDEO CONCEPT (when available):",
    priorConcept,
    "",
    "PRIOR OPENING IMPACT (when available):",
    priorOpening,
    "",
    "PRIOR VISUAL IDENTITY (when available):",
    priorIdentity,
  ].join("\n");
}

/** Narrow type guard when a ContentPackageOutput-shaped brief is needed. */
export function briefAsPackageFields(
  brief: unknown,
): Partial<ContentPackageOutput> {
  const o = asRecord(brief);
  if (!o) return {};
  return o as Partial<ContentPackageOutput>;
}
