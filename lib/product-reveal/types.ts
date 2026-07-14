export const PRODUCT_REVEAL_VERSION = "product-reveal@2";

export const PRODUCT_REVEAL_STRATEGIES = [
  "REAL_ASSET",
  "FRAMED_ASSET",
  "PRODUCT_INTERACTION",
  "ABSTRACT_PRODUCT_SYSTEM",
  "PRODUCT_OUTCOME",
  "NO_PRODUCT_VISUAL",
] as const;

export type ProductRevealStrategy = (typeof PRODUCT_REVEAL_STRATEGIES)[number];

export interface ProductRevealPlan {
  version: typeof PRODUCT_REVEAL_VERSION;
  /** Default strategy for solution / product payoff beats in this package. */
  solution_beat_strategy: ProductRevealStrategy;
  reasons: string[];
  /** Whether sample mode asks for a final-third product/mechanism/outcome visual. */
  sample_payoff_visual_required: boolean;
}
