import type { Project } from "@/lib/supabase/types";

export const SAMPLE_PRODUCT_CLARITY_HEADER = "SAMPLE PRODUCT CLARITY";

/**
 * Sample-mode generation guidance: a first-time viewer must understand what the
 * company offers, without turning the short into a commercial. Wording comes from
 * PROJECT BRAIN — no hardcoded product copy.
 */
export function buildSampleProductClarityBlock(project: Project): string {
  const productName = (project.name ?? "").trim() || "(project name)";

  return [
    `${SAMPLE_PRODUCT_CLARITY_HEADER} (sample for the product owner — NOT a sales ad):`,
    "",
    "A viewer who has NEVER seen this product must leave able to answer:",
    "- WHAT it is (category + how it works — use product_is from PROJECT BRAIN)",
    "- WHO it is for (use target_audience + scenario; be specific, not \"everyone\")",
    "- WHAT problem it solves (the pain in this video must connect to a pain_point " +
      "the product actually addresses)",
    "- WHAT outcome it creates (a concrete result from product_strengths / product_is — " +
      "not vague \"save time\" unless the brain says so)",
    "",
    "Narration (voiceover_text is the source of truth for the video):",
    "- Keep problem-first storytelling: hook and middle beats stay on the strategy " +
      "angle and pain; do NOT open with product pitch or company intro.",
    "- Land clarity in the LATE payoff — roughly the last 25–35% of voiceover_text — " +
      "when the twist pays off. The listener must hear what the company actually " +
      "does before the video ends.",
    "- Weave clarity into natural speech derived from PROJECT BRAIN. Do NOT use " +
      "generic lines that could describe any tool; do NOT paste boilerplate taglines.",
    "- Do NOT make it salesy: no price, no \"best in class\", no mission statement, " +
      "no hard close. Insight beats promotion.",
    `- You MAY name \"${productName}\" once in the payoff if it helps disambiguation — ` +
      "optional, not mandatory.",
    "- Do NOT hide the offer only in platform captions, subtitle-only CTA lines, or " +
      "metadata while voiceover stays purely abstract pain.",
    "",
    "Visual beats (guidance only — same scene-type rules as production):",
    "- Align the late payoff beat with the spoken solution (structured plan, product " +
      "UI, blueprint, etc.) when the script implies it.",
    "- Prefer a framed product asset when SMART ASSET USAGE allows; otherwise use AI. " +
      "Never force an asset that the renderer cannot show well.",
    "- IMAGE ending, voice-only ending, asset ending, and typed CTA are all valid; " +
      "clarity does not require a CTA card.",
  ].join("\n");
}
