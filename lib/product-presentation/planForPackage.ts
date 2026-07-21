import type { AssetRef } from "@/lib/ai/prompts/generateContentPackage";
import type { AssetCoverageDecision } from "@/lib/assets/assetCoveragePolicy";
import type { ProductRevealPlan } from "@/lib/product-reveal/types";
import type { VisualNarrativePlan } from "@/lib/visual-narrative/types";
import { resolveProductPresentationPlan } from "./resolveProductPresentation";
import { productPresentationFieldsForPersistence } from "./persistence";
import type { ProductPresentationPlan } from "./types";

export type ProductPresentationPackagePlan = {
  plan: ProductPresentationPlan | null;
  /** Merge into presentation_generation. */
  persistenceFields: Record<string, unknown>;
  enabled: boolean;
};

/** Package-time PPD wrapper (mirrors planProductRevealForPackage). */
export function planProductPresentationForPackage(args: {
  productReveal: ProductRevealPlan | null;
  assets: AssetRef[];
  visualNarrative: VisualNarrativePlan | null;
  assetCoverage?: AssetCoverageDecision | null;
  funnelStage?: string | null;
}): ProductPresentationPackagePlan {
  const plan = resolveProductPresentationPlan(args);
  return {
    plan,
    persistenceFields: plan
      ? productPresentationFieldsForPersistence(plan)
      : {},
    enabled: true,
  };
}
