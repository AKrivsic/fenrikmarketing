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

/**
 * Product / marketing tokens that must NOT alone drive direction-memory rejection.
 * Applied on top of fingerprintTokens stopwords.
 */
export const DIRECTION_MEMORY_GENERIC_TOKENS = new Set([
  "website",
  "visitor",
  "question",
  "business",
  "customer",
  "lead",
  "product",
  "problem",
  "solution",
  "page",
  "answer",
  "reveal",
  "reveals",
  "structural",
  "default",
  "setting",
  "mechanism",
  "owners",
  "owner",
  "content",
  "system",
  "never",
  "just",
  "then",
  "make",
  "makes",
  "made",
]);

/** Significant tokens for direction-memory mechanism similarity (generics stripped). */
export function directionMemorySignificantTokens(text: string): Set<string> {
  const out = new Set<string>();
  for (const w of fingerprintTokens(text)) {
    if (DIRECTION_MEMORY_GENERIC_TOKENS.has(w)) continue;
    out.add(w);
  }
  return out;
}

export function directionMemoryTokenOverlap(a: string, b: string): {
  count: number;
  shared: string[];
} {
  const aw = directionMemorySignificantTokens(a);
  const shared: string[] = [];
  for (const w of directionMemorySignificantTokens(b)) {
    if (aw.has(w)) shared.push(w);
  }
  shared.sort();
  return { count: shared.length, shared };
}

export function directionMemoryJaccard(a: string, b: string): number {
  const aw = directionMemorySignificantTokens(a);
  const bw = directionMemorySignificantTokens(b);
  if (aw.size === 0 && bw.size === 0) return 0;
  let inter = 0;
  for (const w of bw) {
    if (aw.has(w)) inter += 1;
  }
  const union = aw.size + bw.size - inter;
  return union <= 0 ? 0 : inter / union;
}

/** Short memory entries are treated as labels; long ones are creative_direction prose. */
export const DIRECTION_MEMORY_LABEL_MAX_CHARS = 80;

export type DirectionMemoryCollisionKind =
  | "label_exact"
  | "label_containment"
  | "mechanism_similarity";

export interface DirectionMemoryCollisionResult {
  collides: boolean;
  kind: DirectionMemoryCollisionKind | null;
  shared_tokens: string[];
  /** Jaccard on significant (non-generic) tokens; null when not mechanism path. */
  similarity: number | null;
  matched_memory_item: string | null;
}

/**
 * Conservative Creative Direction memory collision.
 * Does NOT use creativeDirectionsCollide / tokenOverlapCount >= 2.
 *
 * Reject only when:
 * A) normalized labels are exact (memory treated as label when short),
 * B) one normalized label fully contains the other (short label-like strings),
 * C) mechanism vs memory has high significant-token similarity (not two generic words).
 */
export function directionMemoryCollides(args: {
  label: string;
  mechanism: string;
  memoryItem: string;
}): DirectionMemoryCollisionResult {
  const empty: DirectionMemoryCollisionResult = {
    collides: false,
    kind: null,
    shared_tokens: [],
    similarity: null,
    matched_memory_item: null,
  };
  const memory = args.memoryItem.trim();
  if (!memory) return empty;

  const label = normalizeFingerprintText(args.label);
  const memoryNorm = normalizeFingerprintText(memory);
  if (!label || !memoryNorm) return empty;

  const memoryIsLabelLike =
    memoryNorm.length <= DIRECTION_MEMORY_LABEL_MAX_CHARS;

  if (memoryIsLabelLike) {
    if (label === memoryNorm) {
      return {
        collides: true,
        kind: "label_exact",
        shared_tokens: [],
        similarity: null,
        matched_memory_item: memory,
      };
    }
    if (
      label.length >= 8 &&
      memoryNorm.length >= 8 &&
      (label.includes(memoryNorm) || memoryNorm.includes(label))
    ) {
      return {
        collides: true,
        kind: "label_containment",
        shared_tokens: [],
        similarity: null,
        matched_memory_item: memory,
      };
    }
  }

  // C — mechanism similarity against memory prose / label text.
  const mech = args.mechanism.trim();
  if (!mech) return empty;
  const { count, shared } = directionMemoryTokenOverlap(mech, memory);
  const jaccard = directionMemoryJaccard(mech, memory);
  // High bar: many shared content tokens AND solid Jaccard (not two generics).
  const highSimilarity =
    (count >= 5 && jaccard >= 0.35) || (count >= 4 && jaccard >= 0.5);
  if (highSimilarity) {
    return {
      collides: true,
      kind: "mechanism_similarity",
      shared_tokens: shared,
      similarity: jaccard,
      matched_memory_item: memory,
    };
  }

  return empty;
}

export function directionFromFingerprint(
  fp: CreativeConceptFingerprint | null | undefined,
): string | null {
  if (!fp?.creative_direction?.trim()) return null;
  return fp.creative_direction.trim();
}
