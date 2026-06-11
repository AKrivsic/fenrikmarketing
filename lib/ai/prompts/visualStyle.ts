// Visual Style Guardrail V1 (Project Brain Improvements V1 — Part 3).
//
// PROBLEM (audited): generated videos skew consistently dark, moody and
// cinematic. This module supplies a single global VISUAL STYLE rule that is
// injected into image-prompt GENERATION so the model prefers bright / clean /
// daylight / modern / trustworthy scenes and avoids the dark-cinematic /
// thriller / horror / heavy-shadow look — UNLESS the concept explicitly calls
// for a darker treatment.
//
// Scope: GENERATED IMAGERY only. It never touches the CTA, captions or copy.
// Pure and dependency-free so it is directly unit-testable.

export const VISUAL_STYLE_HEADER = "VISUAL STYLE";

// The preferred look (bright, daylight, trustworthy).
export const VISUAL_STYLE_PREFER = [
  "bright",
  "clean",
  "daylight",
  "modern",
  "trustworthy",
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
    `- PREFER: ${VISUAL_STYLE_PREFER.join(", ")}.`,
    `- AVOID: ${VISUAL_STYLE_AVOID.join(", ")}.`,
    "- Default to natural daylight, clean modern spaces and an open, " +
      "trustworthy feel; keep shadows soft and the frame bright.",
    "- EXCEPTION: only go dark / moody / cinematic when the CONCEPT itself " +
      "explicitly requires it (e.g. a night scene central to the story).",
    "- This shapes the LOOK of the imagery ONLY — it never changes the CTA, " +
      "captions, copy or any product fact.",
  ].join("\n");
}
