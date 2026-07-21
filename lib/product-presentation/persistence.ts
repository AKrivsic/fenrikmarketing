import type { ProductPresentationPlan } from "./types";

/**
 * Fields merged into package_brief.presentation_generation alongside product_reveal.
 */
export function productPresentationFieldsForPersistence(
  plan: ProductPresentationPlan,
): Record<string, unknown> {
  return {
    product_presentation: {
      version: plan.version,
      should_show_product_appearance: plan.should_show_product_appearance,
      presentation_class: plan.presentation_class,
      fidelity_tier: plan.fidelity_tier,
      asset_binding: plan.asset_binding,
      appearance_claim: plan.appearance_claim,
      value_proof_mode: plan.value_proof_mode,
      forbidden_forms: plan.forbidden_forms,
      reveal_ceiling: plan.reveal_ceiling,
      compatible_with_reveal: plan.compatible_with_reveal,
      rationale: plan.rationale,
    },
  };
}

export function readProductPresentationFromBrief(
  brief: Record<string, unknown> | null | undefined,
): ProductPresentationPlan | null {
  if (!brief) return null;
  const pg = brief.presentation_generation;
  if (!pg || typeof pg !== "object" || Array.isArray(pg)) return null;
  const pp = (pg as Record<string, unknown>).product_presentation;
  if (!pp || typeof pp !== "object" || Array.isArray(pp)) return null;
  const record = pp as Record<string, unknown>;
  if (typeof record.presentation_class !== "string") return null;
  return record as unknown as ProductPresentationPlan;
}
