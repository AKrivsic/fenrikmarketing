/**
 * Product Presentation Decision (PPD) — decision-only types.
 * See reports/universal-product-presentation-architecture.md
 */

export const PRODUCT_PRESENTATION_VERSION = "product-presentation@1" as const;

/** How the visual relates to the product (not a vertical / product-type enum). */
export const PRESENTATION_CLASSES = [
  "AUTHENTIC_PRODUCT_SURFACE",
  "AUTHENTIC_PRODUCT_IN_CONTEXT",
  "PRODUCT_OUTCOME_WORLD",
  "ABSTRACT_MECHANISM",
  "BRAND_SIGNAL_ONLY",
  "NO_PRODUCT_APPEARANCE",
] as const;

export type PresentationClass = (typeof PRESENTATION_CLASSES)[number];

export const APPEARANCE_CLAIMS = ["AUTHENTIC", "NON_PRODUCT", "NONE"] as const;

export type AppearanceClaim = (typeof APPEARANCE_CLAIMS)[number];

export const VALUE_PROOF_MODES = [
  "via_authentic_appearance",
  "via_world_outcome",
  "via_abstract_mechanism",
  "via_story_without_product_pixels",
  "unsatisfied",
] as const;

export type ValueProofMode = (typeof VALUE_PROOF_MODES)[number];

export const FIDELITY_TIERS = [
  "authentic_asset",
  "brand_only",
  "non_product_visual",
  "none",
] as const;

export type FidelityTier = (typeof FIDELITY_TIERS)[number];

/** Forms Scene Planning must never use as product proof. */
export const FORBIDDEN_PRESENTATION_FORMS = [
  "synthetic_product_ui",
  "invented_screenshot",
  "generic_chat_as_product",
  "generic_dashboard_as_product",
  "brand_logo_as_product_demo",
  "landing_page_alone_as_value_proof",
] as const;

export type ForbiddenPresentationForm =
  (typeof FORBIDDEN_PRESENTATION_FORMS)[number];

export interface ProductPresentationCapabilities {
  can_composite_authentic_asset: boolean;
  can_ai_scene_non_ui: boolean;
  can_text_card: boolean;
  /** Synthetic product UI is never a legitimate capability. */
  cannot_synthesize_product_ui: true;
}

export interface ProductPresentationPlan {
  version: typeof PRODUCT_PRESENTATION_VERSION;
  should_show_product_appearance: boolean;
  presentation_class: PresentationClass;
  fidelity_tier: FidelityTier;
  asset_binding: string[];
  appearance_claim: AppearanceClaim;
  value_proof_mode: ValueProofMode;
  forbidden_forms: ForbiddenPresentationForm[];
  /** Product Reveal ceiling this plan respected. */
  reveal_ceiling: string | null;
  /** True when plan does not claim stronger appearance than Reveal allows. */
  compatible_with_reveal: boolean;
  rationale: string[];
}
