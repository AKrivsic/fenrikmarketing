export function normalizePresentationText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenSet(text: string): Set<string> {
  const normalized = normalizePresentationText(text);
  const tokens = normalized.split(" ").filter((t) => t.length > 1);
  return new Set(tokens);
}

/** Share of item tokens that appear in the narration window (0–1). */
export function tokenOverlapRatio(item: string, narration: string): number {
  const itemTokens = [...tokenSet(item)];
  if (itemTokens.length === 0) return 0;
  const narr = tokenSet(narration);
  let hit = 0;
  for (const t of itemTokens) {
    if (narr.has(t)) hit++;
  }
  return hit / itemTokens.length;
}

export function narrationContainsPhrase(
  narration: string,
  phrase: string,
  minOverlap = 0.55,
): boolean {
  const n = normalizePresentationText(narration);
  const p = normalizePresentationText(phrase);
  if (!p) return false;
  if (n.includes(p)) return true;
  return tokenOverlapRatio(phrase, narration) >= minOverlap;
}

export function normalizedTextsMatch(a: string, b: string): boolean {
  const na = normalizePresentationText(a);
  const nb = normalizePresentationText(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  return tokenOverlapRatio(a, b) >= 0.85;
}
