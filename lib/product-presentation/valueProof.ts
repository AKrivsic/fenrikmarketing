import type {
  ProductPresentationPlan,
  ValueProofMode,
} from "./types";

/** Value-proof modes that do not require a product screenshot / PRODUCT_DEMO. */
const NON_PRODUCT_VALUE_PROOF: ReadonlySet<ValueProofMode> = new Set([
  "via_world_outcome",
  "via_abstract_mechanism",
  "via_story_without_product_pixels",
]);

/**
 * True when PPD says value exists without requiring product appearance pixels
 * (screenshot / chat demo / authentic surface).
 */
export function valueProofSatisfiedWithoutProductAppearance(
  plan: ProductPresentationPlan,
): boolean {
  if (plan.value_proof_mode === "unsatisfied") return false;
  if (plan.appearance_claim === "AUTHENTIC") return false;
  return (
    NON_PRODUCT_VALUE_PROOF.has(plan.value_proof_mode) ||
    plan.presentation_class === "NO_PRODUCT_APPEARANCE" ||
    plan.presentation_class === "PRODUCT_OUTCOME_WORLD" ||
    plan.presentation_class === "ABSTRACT_MECHANISM" ||
    plan.presentation_class === "BRAND_SIGNAL_ONLY"
  );
}

/**
 * True when PPD authorizes authentic product appearance via eligible binding
 * (not via PRODUCT_DEMO chat proof).
 */
export function valueProofViaAuthenticAppearance(
  plan: ProductPresentationPlan,
): boolean {
  return (
    plan.appearance_claim === "AUTHENTIC" &&
    plan.value_proof_mode === "via_authentic_appearance" &&
    plan.asset_binding.length > 0 &&
    plan.should_show_product_appearance
  );
}

/**
 * Whether SI/PDI PRODUCT_DEMO / chat-demo requirements may be skipped because
 * PPD already supplies a valid presentation decision.
 */
export function ppdAuthorizesPresentationWithoutProductDemo(
  plan: ProductPresentationPlan,
): boolean {
  if (plan.value_proof_mode === "unsatisfied") return false;
  if (valueProofSatisfiedWithoutProductAppearance(plan)) return true;
  if (valueProofViaAuthenticAppearance(plan)) return true;
  return false;
}
