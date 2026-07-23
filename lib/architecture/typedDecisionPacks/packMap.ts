/**
 * Maps Typed Decision Pack keys → Phase 2A DecisionId(s).
 * scene_order / scene_diversity intentionally have no pack yet (documented).
 */

import type { DecisionId } from "@/lib/architecture/decisionOwnership";
import type { TypedDecisionPacks } from "@/lib/architecture/typedDecisionPacks/types";

export const PACK_KEY_TO_DECISION_IDS: {
  readonly [K in keyof Omit<TypedDecisionPacks, "version">]: readonly DecisionId[];
} = {
  productGrounding: ["product_grounding"],
  hook: ["hook"],
  opening: ["opening"],
  storyStructure: ["story_structure"],
  emotionalArc: ["emotional_arc"],
  voice: ["voice_emotion", "voice_persona"],
  visualIdentity: ["visual_identity"],
  characterConsistency: ["character_consistency"],
  cameraStyle: ["camera_style"],
  assetPolicy: ["asset_policy"],
  cta: ["cta"],
  safety: ["safety"],
  platformAdaptation: ["platform_adaptation"],
  jsonSchema: ["json_schema"],
};

/** Decisions deferred to Presentation V2 / validators (no pack in Phase 2B). */
export const DEFERRED_DECISION_IDS = [
  "scene_order",
  "scene_diversity",
] as const satisfies readonly DecisionId[];

export const DEFERRED_DECISION_REASONS: Record<
  (typeof DEFERRED_DECISION_IDS)[number],
  string
> = {
  scene_order:
    "Final order remains package visual_scenes guided by MODE BEATS; pack would duplicate Scene Order without changing behavior. Deferred to Presentation V2.",
  scene_diversity:
    "Owned by progression validators; prompt VISUAL PROGRESSION is guidance. Pack deferred to Presentation V2.",
};
