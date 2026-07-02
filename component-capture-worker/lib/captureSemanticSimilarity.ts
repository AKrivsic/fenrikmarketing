import type { CaptureViewport } from "./captureProductProfile.ts";

/** Shared text/label signals for cross-viewport duplicate detection (Node + tests). */

export interface SemanticCaptureSignals {
  label: string;
  roleHint: string;
  selectorHint: string;
  captureViewport: CaptureViewport;
  width: number;
  height: number;
  /** Truncated visible text from the captured element (DOM); optional OCR substitute. */
  textSnippet?: string;
}

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "your",
  "from",
  "this",
  "that",
  "our",
  "you",
  "are",
  "all",
  "get",
  "app",
  "new",
]);

const GENERIC_LABELS = new Set([
  "product visual",
  "feature card",
  "section screenshot",
  "hero image",
]);

const GENERIC_TOKENS = new Set([
  "feature",
  "card",
  "product",
  "visual",
  "screen",
  "dashboard",
  "panel",
  "analytics",
  "workspace",
  "team",
  "mobile",
  "desktop",
  "hero",
  "app",
]);

const FEATURE_BUCKET_RES: Array<{ id: string; re: RegExp }> = [
  { id: "pricing", re: /\b(pricing|price plan|plans|billing|subscription)\b/i },
  { id: "habit_feed", re: /\b(habit feed|feed cards)\b/i },
  { id: "reminder", re: /\b(reminder|morning reminder)\b/i },
  {
    id: "comparison",
    re: /\b(comparison|habit of the day|other habit|vs\.)\b/i,
  },
  { id: "onboarding", re: /\b(onboarding|welcome|get started)\b/i },
  {
    id: "analytics",
    re: /\b(analytics|dashboard|consistency score|metrics|pipeline|workspace)\b/i,
  },
];

export const SEMANTIC_DUPLICATE_THRESHOLD = 0.72;

export function tokenizeCaptureText(text: string): string[] {
  const tokens = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(
      (t) =>
        (/^\d+$/.test(t) && t.length > 0) ||
        (t.length >= 3 && !STOP_WORDS.has(t)),
    );
  return [...new Set(tokens)];
}

function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let inter = 0;
  for (const t of setA) {
    if (setB.has(t)) inter += 1;
  }
  const union = setA.size + setB.size - inter;
  if (union <= 0) return 0;
  return inter / union;
}

function featureBucket(text: string): string | null {
  for (const { id, re } of FEATURE_BUCKET_RES) {
    if (re.test(text)) return id;
  }
  return null;
}

function bucketsConflict(aText: string, bText: string): boolean {
  const ba = featureBucket(aText);
  const bb = featureBucket(bText);
  if (!ba || !bb) return false;
  return ba !== bb;
}

export function labelSimilarity(a: string, b: string): number {
  const na = a.trim().toLowerCase();
  const nb = b.trim().toLowerCase();
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) {
    const shorter = Math.min(na.length, nb.length);
    const longer = Math.max(na.length, nb.length);
    if (shorter >= 8 && shorter / longer >= 0.45) return 0.92;
  }
  return jaccardSimilarity(tokenizeCaptureText(a), tokenizeCaptureText(b));
}

function combinedText(c: SemanticCaptureSignals): string {
  return [c.label, c.textSnippet ?? "", c.selectorHint].filter(Boolean).join(" ");
}

export function distinctiveTokens(text: string): string[] {
  return tokenizeCaptureText(text).filter((t) => !GENERIC_TOKENS.has(t));
}

function distinctiveOverlap(aText: string, bText: string): number {
  return jaccardSimilarity(distinctiveTokens(aText), distinctiveTokens(bText));
}

export function hasDistinctiveTextOverlap(
  a: SemanticCaptureSignals,
  b: SemanticCaptureSignals,
): boolean {
  const textA = combinedText(a);
  const textB = combinedText(b);
  if (distinctiveOverlap(textA, textB) >= 0.34) return true;
  if (labelSimilarity(a.label, b.label) >= 0.92) return true;
  return false;
}

/** product_role / roleHint families that can depict the same product surface. */
function rolesCompatible(a: string, b: string): boolean {
  const ra = a.toLowerCase();
  const rb = b.toLowerCase();
  if (ra === rb) return true;
  const productSurface = new Set([
    "product_ui",
    "dashboard",
    "mobile_app",
    "feature_card",
    "pricing_screenshot",
  ]);
  if (productSurface.has(ra) && productSurface.has(rb)) return true;
  return false;
}

export function captureSemanticSimilarity(
  a: SemanticCaptureSignals,
  b: SemanticCaptureSignals,
): number {
  const textA = combinedText(a);
  const textB = combinedText(b);
  if (bucketsConflict(textA, textB)) return 0;

  const labelSim = labelSimilarity(a.label, b.label);
  const ocrSim = jaccardSimilarity(
    tokenizeCaptureText(a.textSnippet ?? a.label),
    tokenizeCaptureText(b.textSnippet ?? b.label),
  );
  const componentSim = Math.max(labelSim, ocrSim * 0.92 + labelSim * 0.08);

  if (!rolesCompatible(a.roleHint, b.roleHint) && componentSim < 0.85) {
    return componentSim * 0.55;
  }

  let score = componentSim;

  const bucketA = featureBucket(textA);
  const bucketB = featureBucket(textB);
  if (bucketA && bucketA === bucketB && distinctiveOverlap(textA, textB) >= 0.28) {
    score = Math.max(score, 0.74);
  }

  if (
    isGenericLabel(a.label) &&
    isGenericLabel(b.label) &&
    ocrSim < 0.35 &&
    labelSim < 0.5
  ) {
    return Math.min(score, 0.4);
  }

  return Math.min(1, score);
}

function isGenericLabel(label: string): boolean {
  return GENERIC_LABELS.has(label.trim().toLowerCase());
}

export function isCrossViewportPair(
  a: SemanticCaptureSignals,
  b: SemanticCaptureSignals,
): boolean {
  return a.captureViewport !== b.captureViewport;
}

export function isHighSemanticDuplicate(
  a: SemanticCaptureSignals,
  b: SemanticCaptureSignals,
): boolean {
  return (
    captureSemanticSimilarity(a, b) >= SEMANTIC_DUPLICATE_THRESHOLD &&
    hasDistinctiveTextOverlap(a, b)
  );
}

export function preferredViewportForDuplicatePair(
  a: SemanticCaptureSignals,
  b: SemanticCaptureSignals,
): CaptureViewport | null {
  if (!isCrossViewportPair(a, b)) return null;
  if (a.captureViewport === "mobile") return "mobile";
  if (b.captureViewport === "mobile") return "mobile";
  return null;
}
