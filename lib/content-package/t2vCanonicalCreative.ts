/**
 * Canonical T2V creative stored on the Content Package.
 * One Claude output is the authority. The render plan is a projection.
 */

import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import type {
  OpeningImpact,
  VideoConcept,
  VisualIdentity,
} from "@/lib/content-pipeline/types";
import {
  parseT2vScreenPolicy,
  type T2vScreenPolicy,
} from "@/lib/content-package/t2vScreenPolicy";
import { readVisualScenesFromBrief } from "@/lib/content-package/canonicalVideoPlan";

export const T2V_CANONICAL_CREATIVE_CONTRACT_VERSION = 1 as const;

export function parseT2vCanonicalCreativeFromUnknown(
  raw: unknown,
): T2vCanonicalCreative | null {
  const record = asRecord(raw);
  if (!record) return null;
  if (record.contract_version !== T2V_CANONICAL_CREATIVE_CONTRACT_VERSION) {
    return null;
  }
  const vd = asRecord(record.visual_direction) ?? {};
  const core = nonEmpty(record.core_idea);
  const emotion = nonEmpty(record.primary_emotion);
  const conflict = nonEmpty(record.conflict);
  const surprise = nonEmpty(record.surprise);
  const change = nonEmpty(record.beginning_to_end_change);
  const payoff = nonEmpty(record.payoff);
  if (!core || !emotion || !conflict || !surprise || !change || !payoff) {
    return null;
  }
  return {
    contract_version: T2V_CANONICAL_CREATIVE_CONTRACT_VERSION,
    core_idea: core,
    primary_emotion: emotion,
    conflict,
    surprise,
    beginning_to_end_change: change,
    payoff,
    visual_direction: {
      art_direction: nonEmpty(vd.art_direction) ?? "",
      lighting: nonEmpty(vd.lighting) ?? "",
      palette: nonEmpty(vd.palette) ?? "",
      environment: nonEmpty(vd.environment) ?? "",
      character_style: nonEmpty(vd.character_style) ?? "",
    },
  };
}

export interface T2vCanonicalCreative {
  contract_version: typeof T2V_CANONICAL_CREATIVE_CONTRACT_VERSION;
  core_idea: string;
  primary_emotion: string;
  conflict: string;
  surprise: string;
  beginning_to_end_change: string;
  payoff: string;
  visual_direction: {
    art_direction: string;
    lighting: string;
    palette: string;
    environment: string;
    character_style: string;
  };
}

/** Offline fixtures only. Never applied automatically to old production drafts. */
export function fixtureT2vCanonicalCreative(): T2vCanonicalCreative {
  return {
    contract_version: T2V_CANONICAL_CREATIVE_CONTRACT_VERSION,
    core_idea: "A first impression is already happening before the call.",
    primary_emotion: "unease then resolve",
    conflict: "The profile does not match the promise.",
    surprise: "The feed is empty.",
    beginning_to_end_change: "Doubt becomes a booked call after proof appears.",
    payoff: "Show the work so the next search converts.",
    visual_direction: {
      art_direction: "clean editorial documentary",
      lighting: "cool window light",
      palette: "navy, white, steel",
      environment: "modern office desk",
      character_style: "professional adult",
    },
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function nonEmpty(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

export function readT2vCanonicalCreative(
  brief: Record<string, unknown> | null | undefined,
): T2vCanonicalCreative | null {
  const raw =
    asRecord(brief?.t2v_canonical_creative) ??
    asRecord(asRecord(brief?.presentation_generation)?.t2v_canonical_creative);
  return parseT2vCanonicalCreativeFromUnknown(raw);
}

export function hasT2vCanonicalCreativeContract(
  brief: Record<string, unknown> | null | undefined,
): boolean {
  return readT2vCanonicalCreative(brief) != null;
}

export interface T2vCanonicalSceneExtras {
  environment: string | null;
  characters_action: string | null;
  camera: string | null;
  emotion: string | null;
  sound_intent: string | null;
  screen_policy: T2vScreenPolicy | null;
  continuity_hints: string | null;
}

export function readT2vSceneExtras(entry: unknown): T2vCanonicalSceneExtras {
  const record = asRecord(entry);
  const payload = asRecord(record?.payload);
  const src = record ?? {};
  const pick = (key: string) =>
    nonEmpty(src[key]) ?? nonEmpty(payload?.[key]);
  return {
    environment: pick("environment"),
    characters_action: pick("characters_action"),
    camera: pick("camera"),
    emotion: pick("emotion"),
    sound_intent: pick("sound_intent"),
    screen_policy: parseT2vScreenPolicy(pick("screen_policy")),
    continuity_hints: pick("continuity_hints"),
  };
}

export function t2vCanonicalScenesAreComplete(
  brief: Record<string, unknown> | null | undefined,
): boolean {
  const scenes = readVisualScenesFromBrief(brief);
  if (scenes.length < 4 || scenes.length > 5) return false;
  return scenes.every((scene) => {
    const extras = readT2vSceneExtras(scene);
    return Boolean(extras.camera && extras.environment && extras.screen_policy);
  });
}

export function deriveVideoConceptFromT2vCanonical(args: {
  title: string;
  creative: T2vCanonicalCreative;
  audienceInsight?: string;
  productRole?: string;
}): VideoConcept {
  const vd = args.creative.visual_direction;
  return {
    title: args.title,
    core_idea: args.creative.core_idea,
    narrative_arc: [
      args.creative.conflict,
      args.creative.surprise,
      args.creative.beginning_to_end_change,
      args.creative.payoff,
    ].join(" "),
    emotional_tone: args.creative.primary_emotion,
    audience_insight: args.audienceInsight ?? args.creative.core_idea,
    product_role: args.productRole ?? "",
    why_it_works: args.creative.payoff,
    visual_direction: {
      art_direction: vd.art_direction,
      lighting: vd.lighting,
      palette: vd.palette,
      environment: vd.environment,
      camera_style: "Scene-specific. Do not copy a global camera into every clip.",
      character_style: vd.character_style,
    },
  };
}

export function deriveOpeningImpactFromT2vPackage(args: {
  hook: string;
  firstImage: string;
  emotion: string;
}): OpeningImpact {
  return {
    first_image: args.firstImage,
    first_spoken_sentence: args.hook,
    emotion: args.emotion,
    pacing: "short-form social; first second is a concrete visual event",
    attention_pattern: "scroll-stopping concrete opening event",
  };
}

export function deriveVisualIdentityFromT2vCanonical(args: {
  creative: T2vCanonicalCreative;
  opening: OpeningImpact;
}): VisualIdentity {
  const vd = args.creative.visual_direction;
  return {
    art_direction: vd.art_direction,
    lighting: vd.lighting,
    palette: vd.palette,
    environment: vd.environment,
    camera_style: "Scene-specific. Do not copy a global camera into every clip.",
    character_style: vd.character_style,
    opening_emotion: args.opening.emotion,
    opening_first_image: args.opening.first_image,
  };
}

export function firstSceneImagePrompt(pkg: Pick<ContentPackageOutput, "visual_scenes">): string {
  const scenes = pkg.visual_scenes;
  if (!Array.isArray(scenes) || scenes.length === 0) return "";
  const extras = asRecord(scenes[0] as unknown);
  return nonEmpty(extras?.image_prompt) ?? "";
}

export function stampT2vCanonicalCreativeOnPackage(
  pkg: ContentPackageOutput,
  creative: T2vCanonicalCreative,
): void {
  const pg =
    pkg.presentation_generation &&
    typeof pkg.presentation_generation === "object" &&
    !Array.isArray(pkg.presentation_generation)
      ? pkg.presentation_generation
      : {};
  pkg.presentation_generation = {
    ...pg,
    t2v_canonical_creative: creative,
  };
}

export function readT2vCanonicalCreativeFromPackage(
  pkg: ContentPackageOutput,
): T2vCanonicalCreative | null {
  const extra = pkg as ContentPackageOutput & {
    t2v_canonical_creative?: unknown;
  };
  return (
    parseT2vCanonicalCreativeFromUnknown(extra.t2v_canonical_creative) ??
    parseT2vCanonicalCreativeFromUnknown(
      asRecord(pkg.presentation_generation)?.t2v_canonical_creative,
    )
  );
}
