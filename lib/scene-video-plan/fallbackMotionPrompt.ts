import { RUNWAY_GEN4_MOTION_PROMPT_MAX_UTF16 } from "@/lib/ai/runway";

export interface FallbackMotionPromptInput {
  imagePrompt: string;
  sceneIndex: number;
  durationSeconds: number;
  role?: string | null;
  narrationHint?: string | null;
  /** Presence only — neighbor prompt text is never copied into the output. */
  hasPreviousScene?: boolean;
  hasNextScene?: boolean;
}

function clampUtf16(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, Math.max(0, max - 1)).trimEnd() + "…";
}

function firstClause(prompt: string, maxChars: number): string {
  const cleaned = prompt.replace(/\s+/g, " ").trim();
  if (!cleaned) return "the main subject in frame";
  const cut = cleaned.split(/[.;]/)[0]?.trim() || cleaned;
  return clampUtf16(cut, maxChars);
}

function cameraMoveForIndex(
  index: number,
  hasNeighbors: boolean,
): string {
  if (hasNeighbors && index % 3 === 1) {
    return "gentle lateral drift that preserves framing continuity with adjacent beats";
  }
  switch (index % 3) {
    case 0:
      return "slow push-in toward the main subject";
    case 1:
      return "gentle lateral drift keeping the subject framed";
    default:
      return "subtle hold with micro-parallax on foreground depth";
  }
}

function ambientFromPrompt(imagePrompt: string): string {
  const lower = imagePrompt.toLowerCase();
  if (/\b(office|desk|laptop|email)\b/.test(lower)) {
    return "soft office ambient: papers or screen glow shift slightly";
  }
  if (/\b(street|outdoor|city|storefront|shop)\b/.test(lower)) {
    return "natural outdoor ambient: light foliage or distant passers-by blur";
  }
  if (/\b(kitchen|food|cafe|coffee)\b/.test(lower)) {
    return "subtle steam or handware micro-motion in the environment";
  }
  if (/\b(phone|screen|ui|app)\b/.test(lower)) {
    return "screen reflections flicker softly; hands adjust grip slightly";
  }
  return "soft environmental micro-motion matching the described setting";
}

function subjectActionFromPrompt(
  imagePrompt: string,
  role?: string | null,
): string {
  const lower = imagePrompt.toLowerCase();
  if (role && role.trim()) {
    return `Visible subject action implied by the still and its role (${firstClause(role, 40)})`;
  }
  if (/\b(typing|email|keyboard)\b/.test(lower)) {
    return "the person types briefly, then reaches or turns toward the next task";
  }
  if (/\b(phone|call|calling)\b/.test(lower)) {
    return "the person adjusts the phone and gives a short attentive nod";
  }
  if (/\b(walking|walks|enters)\b/.test(lower)) {
    return "the person takes a small step or weight shift forward";
  }
  if (/\b(product|package|box|bottle)\b/.test(lower)) {
    return "hands gently present or rotate the product for a beat";
  }
  if (/\b(point|gesture|explains)\b/.test(lower)) {
    return "the person makes a clear hand gesture toward the focal object";
  }
  return "the main subject performs one clear, short social-video action implied by the still";
}

/**
 * Deterministic motion prompt for legacy scenes without a usable `motion_prompt`.
 * Focuses on the current still only — never embeds scene ids, neighbor prompts,
 * or internal scene-type names in provider-facing text.
 */
export function buildFallbackMotionPrompt(
  input: FallbackMotionPromptInput,
): string {
  const still = firstClause(input.imagePrompt, 180);
  const action = subjectActionFromPrompt(input.imagePrompt, input.role);
  const ambient = ambientFromPrompt(input.imagePrompt);
  const hasNeighbors = Boolean(input.hasPreviousScene || input.hasNextScene);
  const camera = cameraMoveForIndex(input.sceneIndex, hasNeighbors);
  const durationHint =
    Number.isFinite(input.durationSeconds) && input.durationSeconds > 0
      ? `Fit the action into about ${Math.round(input.durationSeconds)} seconds.`
      : "";
  const continuity = hasNeighbors
    ? "Preserve continuity with adjacent beats without introducing new props."
    : "";
  const narrationLine =
    input.narrationHint && input.narrationHint.trim()
      ? `Visual beat hint (no speech): ${firstClause(input.narrationHint, 80)}.`
      : "";

  const parts = [
    `Still context: ${still}.`,
    `Subject action: ${action}.`,
    `Environment motion: ${ambient}.`,
    `Camera: ${camera}.`,
    "Keep stable: person identity, product appearance, venue branding, and main framing.",
    "Do not add speech, lip-sync, on-screen text, titles, logos, or body/product deformations unless already in the source image.",
    durationHint,
    continuity,
    narrationLine,
  ].filter((p) => p && p.trim().length > 0);

  return clampUtf16(parts.join(" "), RUNWAY_GEN4_MOTION_PROMPT_MAX_UTF16);
}
