/**
 * Creative concept fingerprints — rejection memory only.
 * Never use remembered fingerprints as creative inspiration / examples.
 */

import type { CreativeConceptFingerprint } from "@/lib/creative-engine-v3/types";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizeFingerprintText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?"']+$/g, "")
    .trim();
}

export function isCreativeConceptFingerprint(
  value: unknown,
): value is CreativeConceptFingerprint {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  const required = [
    "core_premise",
    "opening_mechanism",
    "visual_world",
    "hero_object",
    "emotional_arc",
    "product_mechanism",
    "palette_atmosphere",
    "ending_mechanism",
  ] as const;
  for (const k of required) {
    if (typeof r[k] !== "string" || !(r[k] as string).trim()) return false;
  }
  if (r.metaphor !== null && typeof r.metaphor !== "string") return false;
  // creative_direction optional for historical packages; present when set.
  if (
    r.creative_direction !== undefined &&
    r.creative_direction !== null &&
    typeof r.creative_direction !== "string"
  ) {
    return false;
  }
  return true;
}

export function normalizeCreativeConceptFingerprint(
  value: unknown,
): CreativeConceptFingerprint | null {
  if (!isCreativeConceptFingerprint(value)) return null;
  const r = value as CreativeConceptFingerprint & {
    creative_direction?: string;
  };
  return {
    ...r,
    creative_direction:
      typeof r.creative_direction === "string" && r.creative_direction.trim()
        ? r.creative_direction.trim()
        : "",
  };
}

/** Significant tokens for overlap (stopwords stripped). */
export function fingerprintTokens(text: string): Set<string> {
  const stop = new Set([
    "that",
    "this",
    "with",
    "from",
    "while",
    "when",
    "their",
    "them",
    "into",
    "about",
    "through",
    "without",
    "being",
    "have",
    "does",
    "must",
    "show",
    "the",
    "and",
    "for",
    "are",
    "was",
    "were",
  ]);
  return new Set(
    normalizeFingerprintText(text)
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stop.has(w)),
  );
}

export function tokenOverlapCount(a: string, b: string): number {
  const aw = fingerprintTokens(a);
  let hits = 0;
  for (const w of fingerprintTokens(b)) {
    if (aw.has(w)) hits++;
  }
  return hits;
}

export function fingerprintFieldSimilarity(
  a: CreativeConceptFingerprint,
  b: CreativeConceptFingerprint,
): number {
  const pairs: Array<[string, string]> = [
    [a.core_premise, b.core_premise],
    [a.opening_mechanism, b.opening_mechanism],
    [a.visual_world, b.visual_world],
    [a.hero_object, b.hero_object],
    [a.emotional_arc, b.emotional_arc],
    [a.product_mechanism, b.product_mechanism],
    [a.palette_atmosphere, b.palette_atmosphere],
    [a.ending_mechanism, b.ending_mechanism],
  ];
  if (a.creative_direction && b.creative_direction) {
    pairs.push([a.creative_direction, b.creative_direction]);
  }
  if (a.metaphor && b.metaphor) {
    pairs.push([a.metaphor, b.metaphor]);
  }
  let score = 0;
  for (const [x, y] of pairs) {
    if (normalizeFingerprintText(x) === normalizeFingerprintText(y)) {
      score += 2;
      continue;
    }
    score += Math.min(3, tokenOverlapCount(x, y));
  }
  return score;
}

/** Collision if similarity is high on core commercial identity fields. */
export function fingerprintsCollide(
  a: CreativeConceptFingerprint,
  b: CreativeConceptFingerprint,
  threshold = 10,
): boolean {
  return fingerprintFieldSimilarity(a, b) >= threshold;
}

export function atmosphereKey(fp: CreativeConceptFingerprint): string {
  return normalizeFingerprintText(fp.palette_atmosphere);
}

const DARK_OFFICE_RE =
  /\b(dark\s+office|night\s+office|blue\s+(neon|corporate|lighting)|muted\s+corporate|after[\s-]?hours\s+office|dim\s+office)\b/i;

export function isDarkOfficeAtmosphere(text: string): boolean {
  return DARK_OFFICE_RE.test(text);
}

/**
 * Read a v3 fingerprint from package_brief / presentation_generation JSON.
 * Does not invent content — only extracts previously persisted fingerprints.
 */
export function fingerprintFromPackageBrief(
  brief: unknown,
): CreativeConceptFingerprint | null {
  const root = asRecord(brief);
  if (!root) return null;
  const pg = asRecord(root.presentation_generation) ?? root;

  const engine = asRecord(pg.creative_engine);
  const fromEngine = normalizeCreativeConceptFingerprint(engine?.fingerprint);
  if (fromEngine) return fromEngine;

  const candidates = asRecord(pg.creative_candidates);
  const selected = asRecord(candidates?.selectedCandidate);
  const fromSelected = normalizeCreativeConceptFingerprint(
    selected?.conceptFingerprint ?? selected?.fingerprint,
  );
  if (fromSelected) return fromSelected;

  return null;
}

export function atmosphereFromPackageBrief(brief: unknown): string | null {
  const fp = fingerprintFromPackageBrief(brief);
  if (fp?.palette_atmosphere) return fp.palette_atmosphere;
  const root = asRecord(brief);
  if (!root) return null;
  const pg = asRecord(root.presentation_generation) ?? root;
  const engine = asRecord(pg.creative_engine);
  return readString(engine?.atmosphere) ?? null;
}

/** True when two direction labels/mechanisms are near-duplicates (rejection). */
export function creativeDirectionsCollide(a: string, b: string): boolean {
  const na = normalizeFingerprintText(a);
  const nb = normalizeFingerprintText(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  // Substring / containment (e.g. "myth vs reality" vs "myth vs reality reveal")
  if (na.length >= 8 && nb.length >= 8 && (na.includes(nb) || nb.includes(na))) {
    return true;
  }
  return tokenOverlapCount(na, nb) >= 2;
}

export function directionFromFingerprint(
  fp: CreativeConceptFingerprint | null | undefined,
): string | null {
  if (!fp?.creative_direction?.trim()) return null;
  return fp.creative_direction.trim();
}
