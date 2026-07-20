import type { CreativeConceptFamily } from "@/lib/creative-candidates/types";

/**
 * Deterministic family priors for Creative Candidate Selection v3.
 * Tuned so stop-scroll families remain commercially viable when renderable —
 * commercial reliability must not systematically erase high-stop concepts.
 * No AI estimation — values are fixed metadata.
 */
export interface CreativeFamilyCommercialMetadata {
  /** 0–10: can the current NO_TEXT image stack film this family? */
  renderability: number;
  /** 0–10: stranger understands opening frame meaning without readable text */
  first_frame_clarity: number;
  /** Concept usually needs readable labels/numbers to land */
  requires_readable_text: boolean;
  /** Product proof usually needs a real project asset, not AI UI */
  requires_real_product_asset: boolean;
  /** 0–10: opening shows a human in a recognizable problem */
  human_problem_strength: number;
  /** 0–10: product can be shown (not only described) */
  product_visibility: number;
  /** 0–10: risk the idea is a metaphor/diagram that collapses in render */
  metaphor_risk: number;
  /** 0–10: historical likelihood of a strong finished ad from this family */
  commercial_reliability: number;
}

export const CREATIVE_FAMILY_COMMERCIAL_METADATA: Record<
  CreativeConceptFamily,
  CreativeFamilyCommercialMetadata
> = {
  direct_product_world: {
    renderability: 9,
    first_frame_clarity: 8,
    requires_readable_text: false,
    requires_real_product_asset: false,
    human_problem_strength: 8,
    product_visibility: 9,
    metaphor_risk: 2,
    commercial_reliability: 8,
  },
  visual_exaggeration: {
    renderability: 8,
    first_frame_clarity: 7,
    requires_readable_text: false,
    requires_real_product_asset: false,
    human_problem_strength: 6,
    product_visibility: 5,
    metaphor_risk: 3,
    commercial_reliability: 7,
  },
  human_conflict: {
    renderability: 7,
    first_frame_clarity: 7,
    requires_readable_text: false,
    requires_real_product_asset: false,
    human_problem_strength: 9,
    product_visibility: 4,
    metaphor_risk: 3,
    commercial_reliability: 6,
  },
  consequence_first: {
    renderability: 6,
    first_frame_clarity: 6,
    requires_readable_text: false,
    requires_real_product_asset: false,
    human_problem_strength: 7,
    product_visibility: 5,
    metaphor_risk: 4,
    commercial_reliability: 6,
  },
  role_reversal: {
    renderability: 6,
    first_frame_clarity: 5,
    requires_readable_text: false,
    requires_real_product_asset: false,
    human_problem_strength: 5,
    product_visibility: 6,
    metaphor_risk: 5,
    commercial_reliability: 5,
  },
  unexpected_comparison: {
    renderability: 5,
    first_frame_clarity: 5,
    requires_readable_text: false,
    requires_real_product_asset: false,
    human_problem_strength: 4,
    product_visibility: 4,
    metaphor_risk: 6,
    commercial_reliability: 5,
  },
  social_observation: {
    renderability: 4,
    first_frame_clarity: 4,
    requires_readable_text: true,
    requires_real_product_asset: false,
    human_problem_strength: 4,
    product_visibility: 5,
    metaphor_risk: 6,
    commercial_reliability: 4,
  },
  /**
   * High stop/originality when the opening is visually meaningful without
   * readable labels. Still carries metaphor risk — not a commercial veto.
   */
  absurd_understandable: {
    renderability: 5,
    first_frame_clarity: 4,
    requires_readable_text: true,
    requires_real_product_asset: false,
    human_problem_strength: 4,
    product_visibility: 4,
    metaphor_risk: 8,
    commercial_reliability: 4,
  },
};

export function familyCommercialMetadata(
  family: CreativeConceptFamily,
): CreativeFamilyCommercialMetadata {
  return CREATIVE_FAMILY_COMMERCIAL_METADATA[family];
}
