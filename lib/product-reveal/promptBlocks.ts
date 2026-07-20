import {
  PRODUCT_REVEAL_VERSION,
  type ProductRevealPlan,
  type ProductRevealStrategy,
} from "@/lib/product-reveal/types";

export const PRODUCT_REVEAL_PROMPT_HEADER = "PRODUCT REVEAL";

const STRATEGY_GUIDANCE: Record<ProductRevealStrategy, string> = {
  REAL_ASSET:
    "Use REAL_ASSET only for the solution beat when a tier-1–3 asset can be shown as a floating card / ui_hero insert without inventing people or rooms around it.",
  FRAMED_ASSET:
    "Use FRAMED_ASSET only as a clean device/frame insert (phone/laptop/monitor mockup). modify false. No hands, no people, no café/office rooms — those compositions are converted to AI later. If the beat needs a person holding a device, choose PRODUCT_OUTCOME instead.",
  PRODUCT_INTERACTION:
    "Use PRODUCT_INTERACTION only when an editable asset exists AND the pipeline can modify/composite it — never promise interactions the renderer cannot execute.",
  ABSTRACT_PRODUCT_SYSTEM:
    "Use ABSTRACT_PRODUCT_SYSTEM when explaining mechanism without fake UI: modules organizing, scattered inputs becoming one flow, fragments becoming priorities — no readable labels.",
  PRODUCT_OUTCOME:
    "Use PRODUCT_OUTCOME when the result matters more than the interface: aligned team, clear plan, confident student starting work, completed workflow. Prefer this over a weak or unrenderable asset scene.",
  NO_PRODUCT_VISUAL:
    "NO_PRODUCT_VISUAL is valid when another visual idea serves the beat better — do not force product shots.",
};

export function buildProductRevealPromptBlock(plan: ProductRevealPlan): string {
  const strategy = plan.solution_beat_strategy;
  const sampleLines = plan.sample_payoff_visual_required
    ? [
        "SAMPLE PAYOFF (spoken clarity already required):",
        "- In the final ~25–35% of the video, at least ONE visual beat must show the product mechanism OR concrete outcome (not necessarily an asset, not a typed CTA, not fake dashboard UI).",
        "- If no asset is suitable, use ABSTRACT_PRODUCT_SYSTEM or PRODUCT_OUTCOME — never block the package.",
      ]
    : [];

  return [
    `${PRODUCT_REVEAL_PROMPT_HEADER} (${PRODUCT_REVEAL_VERSION}):`,
    "",
    `Default strategy for solution / product payoff beats: ${strategy}`,
    `- ${STRATEGY_GUIDANCE[strategy]}`,
    "",
    "Opening meaning block (Attention First):",
    "- Product may appear in the opening when it is part of the hook situation / event.",
    "- Forbidden in the opening meaning block: sales pitch, offer language, pricing,",
    "  CTA verbs (buy / book / sign up / learn more / subscribe), or 'ad announce' framing.",
    "- Structured PRODUCT_DEMO belongs after the opening meaning block — not as visual_scenes[0]",
    "  and not as the first spoken sales message.",
    "- Solution / payoff strategies below apply to later beats, not to sanding down the open.",
    "",
    "Selection rules (every product/solution beat):",
    "1. What is the strongest reveal that today's renderer can actually deliver?",
    "2. Is there a compatible high-quality asset whose framed/real insert Asset Safety would accept?",
    "3. Would that asset improve understanding vs a strong AI scene?",
    "4. If the natural composition needs people/hands/rooms, do NOT pick FRAMED_ASSET — use PRODUCT_OUTCOME or ABSTRACT_PRODUCT_SYSTEM.",
    "5. Never pick an asset only because it exists or to satisfy Product Reveal.",
    "6. Prefer a high-quality AI scene over a poor asset scene.",
    "7. Never replace a strong opening event with an early product sales beat.",
    "",
    "No fake UI:",
    "- Do NOT generate readable product interfaces, fake metrics, fake labels, or fake screenshots.",
    "- When no real UI asset fits, use abstract system visuals, process transformation, product outcome, or illustration/blueprint/3D per VISUAL MEDIUM.",
    "",
    ...sampleLines,
  ].join("\n");
}

export function productRevealFieldsForPersistence(
  plan: ProductRevealPlan,
): Record<string, unknown> {
  return {
    product_reveal: {
      version: plan.version,
      solution_beat_strategy: plan.solution_beat_strategy,
      reasons: plan.reasons,
      sample_payoff_visual_required: plan.sample_payoff_visual_required,
    },
  };
}

export function readProductRevealStrategyFromBrief(
  brief: Record<string, unknown> | null | undefined,
): ProductRevealStrategy | null {
  if (!brief) return null;
  const pg = brief.presentation_generation;
  if (!pg || typeof pg !== "object" || Array.isArray(pg)) return null;
  const pr = (pg as Record<string, unknown>).product_reveal;
  if (!pr || typeof pr !== "object" || Array.isArray(pr)) return null;
  const s = (pr as Record<string, unknown>).solution_beat_strategy;
  return typeof s === "string" ? (s as ProductRevealStrategy) : null;
}
