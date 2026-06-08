import type { Json } from "@/lib/supabase/types";

// Knowledge Model V2 — typed view over the free-form projects.knowledge jsonb.
// Four cards mirror the approved Knowledge Pools that the onboarding produces:
// Product / Customer / Voice / Proof. Each card carries its own approval state
// and provenance. Product/Customer/Voice are compiled into the existing Project
// Brain columns on approval; Proof lives only here.

export type KnowledgeCardStatus = "proposed" | "approved";
export type KnowledgeSource = "url" | "manual";

export const KNOWLEDGE_CARD_KEYS = [
  "product",
  "customer",
  "voice",
  "proof",
] as const;
export type KnowledgeCardKey = (typeof KNOWLEDGE_CARD_KEYS)[number];

interface CardMeta {
  status: KnowledgeCardStatus;
  source: KnowledgeSource;
}

export interface ProductCard extends CardMeta {
  product_is: string[];
  product_is_not: string[];
  product_strengths: string[];
}

export interface CustomerCard extends CardMeta {
  target_audience: string[];
  pain_points: string[];
}

export interface VoiceCard extends CardMeta {
  tone: string[];
  forbidden_claims: string[];
}

// Phase 2C — a single proof statement derived from an analyzed asset. Lives
// inside the Proof card's `asset_statements` (separate from the manually
// editable `statements` extracted from the website). Read-only in the UI;
// produced and deduplicated only by the proof extraction workflow.
export interface ProofStatement {
  text: string;
  // The asset this proof was derived from (null if it could not be resolved).
  source_asset_id: string | null;
  // Model self-reported confidence, 0..1.
  confidence: number;
  created_at: string;
}

export interface ProofCard extends CardMeta {
  statements: string[];
  // Asset-derived proof statements (Phase 2C). Empty for legacy/url knowledge.
  asset_statements: ProofStatement[];
}

// Phase 2D — where a scenario came from. Today everything is "generated" (the
// scenario generation workflow); "manual" is reserved so a future editor can be
// added without a data migration. There is no scoring/approval — scenarios are
// pure inspiration for content generation.
export type ScenarioSource = "generated" | "manual";

// Phase 2D — a single concrete situation in which the customer faces the
// problem (e.g. "Guests arrive in 2 hours and the flat is not cleaned").
// Deliberately light: just the text, its provenance and when it was created.
// Read-only in the UI; produced and deduplicated only by the scenario workflow.
export interface Scenario {
  text: string;
  source: ScenarioSource;
  created_at: string;
}

export interface ProjectKnowledge {
  source_url: string | null;
  extracted_at: string | null;
  cards: {
    product: ProductCard;
    customer: CustomerCard;
    voice: VoiceCard;
    proof: ProofCard;
  };
  // Phase 2D — the Scenario Pool. Lives at the top level (not a card) because it
  // has no approval state and is not compiled into the brain columns.
  scenarios: Scenario[];
}

// The editable string[] fields of each card, used by the Approve Cards UI and
// the edit/compile actions. Keep in sync with the card interfaces above.
export const CARD_FIELDS: Record<KnowledgeCardKey, readonly string[]> = {
  product: ["product_is", "product_is_not", "product_strengths"],
  customer: ["target_audience", "pain_points"],
  voice: ["tone", "forbidden_claims"],
  proof: ["statements"],
};

function emptyCard<T extends CardMeta>(
  status: KnowledgeCardStatus,
  source: KnowledgeSource,
  fields: Record<string, string[]>,
): T {
  return { status, source, ...fields } as T;
}

// A blank knowledge block with all four cards in the given status/source and no
// content. Used as the base for both fresh proposals and derived knowledge.
export function emptyKnowledge(
  status: KnowledgeCardStatus,
  source: KnowledgeSource,
  sourceUrl: string | null = null,
): ProjectKnowledge {
  return {
    source_url: sourceUrl,
    extracted_at: null,
    cards: {
      product: emptyCard(status, source, {
        product_is: [],
        product_is_not: [],
        product_strengths: [],
      }),
      customer: emptyCard(status, source, {
        target_audience: [],
        pain_points: [],
      }),
      voice: emptyCard(status, source, { tone: [], forbidden_claims: [] }),
      proof: {
        ...emptyCard<ProofCard>(status, source, { statements: [] }),
        asset_statements: [],
      },
    },
    scenarios: [],
  };
}

// True when the jsonb block contains a usable `cards` object. A bare {} (the DB
// default for existing rows) returns false, which triggers derivation.
export function hasKnowledgeCards(value: Json | null | undefined): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const cards = (value as Record<string, unknown>).cards;
  return !!cards && typeof cards === "object" && !Array.isArray(cards);
}

// Defensive parse of the free-form jsonb into a fully-populated ProjectKnowledge.
// Missing/invalid fields fall back to empty arrays and "proposed"/"url" defaults
// so the UI never crashes on partial data. Returns null when there are no cards.
export function parseProjectKnowledge(
  value: Json | null | undefined,
): ProjectKnowledge | null {
  if (!hasKnowledgeCards(value)) return null;
  const record = value as Record<string, unknown>;
  const cards = record.cards as Record<string, unknown>;

  const base = emptyKnowledge("proposed", "url");
  base.source_url = typeof record.source_url === "string" ? record.source_url : null;
  base.extracted_at =
    typeof record.extracted_at === "string" ? record.extracted_at : null;

  for (const key of KNOWLEDGE_CARD_KEYS) {
    const raw = cards[key];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const card = raw as Record<string, unknown>;
    const target = base.cards[key] as unknown as Record<string, unknown>;
    target.status = card.status === "approved" ? "approved" : "proposed";
    target.source = card.source === "manual" ? "manual" : "url";
    for (const field of CARD_FIELDS[key]) {
      target[field] = toStringArray(card[field]);
    }
  }

  // Phase 2C — proof.asset_statements is a structured list (not editable text),
  // so it is parsed separately from the CARD_FIELDS string[] loop above.
  const proofRaw = cards.proof;
  if (proofRaw && typeof proofRaw === "object" && !Array.isArray(proofRaw)) {
    base.cards.proof.asset_statements = toProofStatements(
      (proofRaw as Record<string, unknown>).asset_statements,
    );
  }

  // Phase 2D — the Scenario Pool lives at the top level of the knowledge block.
  base.scenarios = toScenarios(record.scenarios);

  return base;
}

function toScenarios(value: unknown): Scenario[] {
  if (!Array.isArray(value)) return [];
  const result: Scenario[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const record = entry as Record<string, unknown>;
    const text = typeof record.text === "string" ? record.text.trim() : "";
    if (!text) continue;
    result.push({
      text,
      source: record.source === "manual" ? "manual" : "generated",
      created_at:
        typeof record.created_at === "string"
          ? record.created_at
          : new Date(0).toISOString(),
    });
  }
  return result;
}

function toProofStatements(value: unknown): ProofStatement[] {
  if (!Array.isArray(value)) return [];
  const result: ProofStatement[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const record = entry as Record<string, unknown>;
    const text = typeof record.text === "string" ? record.text.trim() : "";
    if (!text) continue;
    result.push({
      text,
      source_asset_id:
        typeof record.source_asset_id === "string"
          ? record.source_asset_id
          : null,
      confidence:
        typeof record.confidence === "number" && !Number.isNaN(record.confidence)
          ? record.confidence
          : 0,
      created_at:
        typeof record.created_at === "string"
          ? record.created_at
          : new Date(0).toISOString(),
    });
  }
  return result;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

// The project is Ready once every card has been approved.
export function isKnowledgeReady(knowledge: ProjectKnowledge): boolean {
  return KNOWLEDGE_CARD_KEYS.every(
    (key) => knowledge.cards[key].status === "approved",
  );
}

// Normalizes proof text for deduplication: lowercase, collapsed whitespace, no
// surrounding punctuation. Two statements that differ only in casing/spacing
// are treated as the same proof.
function proofDedupKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?"']+$/g, "")
    .trim();
}

// Phase 2C — appends new asset-derived proof statements to the existing pool
// WITHOUT removing or overwriting any existing statement. Duplicates (by
// normalized text against both existing asset_statements and the manual
// statements list) are dropped. Returns the merged array and how many were
// actually added.
export function mergeProofStatements(
  existing: ProofStatement[],
  manualStatements: string[],
  incoming: ProofStatement[],
): { merged: ProofStatement[]; added: number } {
  const seen = new Set<string>();
  for (const s of existing) seen.add(proofDedupKey(s.text));
  for (const s of manualStatements) seen.add(proofDedupKey(s));

  const merged = [...existing];
  let added = 0;
  for (const candidate of incoming) {
    const text = candidate.text.trim();
    if (!text) continue;
    const key = proofDedupKey(text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push({ ...candidate, text });
    added += 1;
  }
  return { merged, added };
}

// Phase 2D — normalizes scenario text for deduplication: lowercase, collapsed
// whitespace, no surrounding punctuation. Two scenarios that differ only in
// casing/spacing/trailing punctuation are treated as the same situation.
function scenarioDedupKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?"']+$/g, "")
    .trim();
}

// Phase 2D — appends new scenarios to the existing pool WITHOUT removing or
// overwriting any existing one. Duplicates (by normalized text against the
// existing pool) are dropped. Returns the merged array and how many were added.
export function mergeScenarios(
  existing: Scenario[],
  incoming: Scenario[],
): { merged: Scenario[]; added: number } {
  const seen = new Set<string>();
  for (const s of existing) seen.add(scenarioDedupKey(s.text));

  const merged = [...existing];
  let added = 0;
  for (const candidate of incoming) {
    const text = candidate.text.trim();
    if (!text) continue;
    const key = scenarioDedupKey(text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push({ ...candidate, text });
    added += 1;
  }
  return { merged, added };
}
