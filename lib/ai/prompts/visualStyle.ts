// Visual Style Guardrail V1 (Project Brain Improvements V1 — Part 3).
//
// PROBLEM (audited): generated videos skew consistently dark, moody and
// cinematic. This module supplies a single global VISUAL STYLE rule that is
// injected into image-prompt GENERATION so the model avoids the dark-cinematic /
// thriller / horror / heavy-shadow look — UNLESS the concept explicitly calls
// for a darker treatment. Composition should fit the business and scene, not a
// single global aesthetic.
//
// Scope: GENERATED IMAGERY only. It never touches the CTA, captions or copy.
// Pure and dependency-free so it is directly unit-testable.

export const VISUAL_STYLE_HEADER = "VISUAL STYLE";

// Keywords echoed in the guardrail block (smoke-tested via check:visual-style).
export const VISUAL_STYLE_PREFER = [
  "clear",
  "believable",
  "immediately understandable",
] as const;

// The look to avoid by default (dark / cinematic / horror).
export const VISUAL_STYLE_AVOID = [
  "dark cinematic mood",
  "thriller look",
  "horror style",
  "excessive shadows",
] as const;

// The global visual guardrail block injected into image-prompt generation. The
// EXCEPTION clause keeps darker treatments available when the concept genuinely
// requires them (e.g. a night scene that is core to the story).
export function visualStyleGuardrailBlock(): string {
  return [
    `${VISUAL_STYLE_HEADER} (global default for ALL generated imagery — applies ` +
      "to EVERY image_prompt unless the concept EXPLICITLY requires otherwise):",
    "- The environment, lighting and composition should naturally fit the " +
      "business, product and current scene.",
    "- Prefer clear, believable and immediately understandable compositions " +
      "over decorative aesthetics.",
    `- AVOID: ${VISUAL_STYLE_AVOID.join(", ")}.`,
    "- EXCEPTION: only go dark / moody / cinematic when the CONCEPT itself " +
      "explicitly requires it (e.g. a night scene central to the story).",
    "- This shapes the LOOK of the imagery ONLY — it never changes the CTA, " +
      "captions, copy or any product fact.",
  ].join("\n");
}

/** Framing for generated stills that are composed for vertical short video. */
export function videoSceneCompositionBlock(): string {
  return [
    "VERTICAL SCENE COMPOSITION (every image_prompt — generated stills are portrait 9:16):",
    "- Portrait composition; vertical, mobile-first framing.",
    "- Subject centered in a 9:16 frame with natural headroom and footroom.",
    "- Keep important visual elements away from the extreme top/bottom/side edges.",
    "- Do not compose as a wide landscape or square crop — think full-screen phone vertical video.",
  ].join("\n");
}
