import { parseProjectKnowledge } from "@/lib/knowledge/types";
import type { Json } from "@/lib/supabase/types";
import { normalizePresentationText } from "@/lib/scene-types/presentation/textMatch";
import {
  dedupeStatisticCandidates,
  parseStatisticFromStatement,
  type ProofStatisticCandidate,
} from "@/lib/scene-types/statistic/parseStatisticCandidates";

export type { ProofStatisticCandidate };

export interface ProofQuoteEntry {
  id: string;
  text: string;
  attribution?: string;
}

/** Approved quote usable for QUOTE scenes (generation + analyzer). */
export interface ProofQuoteCandidate {
  id: string;
  quote: string;
  attribution: string;
  context?: string;
}

export interface ProofIndex {
  statements: string[];
  numericClaims: string[];
  /** Legacy list — mirrors quote candidate quote text for compatibility. */
  quotes: ProofQuoteEntry[];
  quoteCandidates: ProofQuoteCandidate[];
  statisticCandidates: ProofStatisticCandidate[];
  hasNumericProof: boolean;
  /** True when at least one approved statistic candidate exists. */
  hasStatisticCandidates: boolean;
  /** True when at least one attributable approved quote candidate exists. */
  hasQuoteCandidates: boolean;
  /** @deprecated use hasQuoteCandidates */
  hasQuotableProof: boolean;
}

const URL_LIKE = /https?:\/\/|www\./i;
const PHONE_LIKE = /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/;
const DATE_LIKE =
  /\b(20\d{2}|19\d{2})[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b/;

const METRIC_PATTERNS = [
  /\d+\s*%/,
  /\d+\s*(percent|percentage)/i,
  /\d+\s*(×|x)\s*faster/i,
  /\d+\+\s*(customers|users|clients|businesses|companies)/i,
  /\b\d[\d,.]*\s*(customers|users|clients|hours|minutes|seconds|days)\b/i,
  /\b(up to|over|more than)\s+\d[\d,.]*/i,
];

const ATTRIBUTION_SPLIT = /\s*[—–-]\s+/;

function isExcludedNumericContext(text: string): boolean {
  if (URL_LIKE.test(text)) return true;
  if (PHONE_LIKE.test(text)) return true;
  if (DATE_LIKE.test(text)) return true;
  if (/^\s*\d{4}\s*$/.test(text.trim())) return true;
  return false;
}

function extractNumericClaims(text: string): string[] {
  if (isExcludedNumericContext(text)) return [];
  const claims: string[] = [];
  for (const pattern of METRIC_PATTERNS) {
    if (pattern.test(text)) {
      claims.push(normalizePresentationText(text));
      break;
    }
  }
  return claims;
}

function stripOuterQuotes(text: string): string {
  return text.replace(/^[""\u201c]|[""\u201d]$/g, "").trim();
}

function parseAttributableQuote(
  rawText: string,
  id: string,
  context?: string,
): ProofQuoteCandidate | null {
  const trimmed = rawText.trim();
  if (trimmed.length < 20) return null;

  const parts = trimmed.split(ATTRIBUTION_SPLIT);
  if (parts.length < 2) return null;

  const quote = stripOuterQuotes(parts[0] ?? "").trim();
  const attribution = parts.slice(1).join(" — ").trim();
  if (quote.length < 15 || attribution.length < 2) return null;

  if (extractNumericClaims(quote).length > 0 && !/\b(said|says|review|customer)\b/i.test(trimmed)) {
    return null;
  }

  return {
    id,
    quote,
    attribution,
    ...(context ? { context } : {}),
  };
}

function dedupeCandidates(
  candidates: ProofQuoteCandidate[],
): ProofQuoteCandidate[] {
  const seen = new Set<string>();
  const out: ProofQuoteCandidate[] = [];
  for (const c of candidates) {
    const key = normalizePresentationText(`${c.quote}|${c.attribution}`);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

export function buildProofIndex(knowledge: Json | null | undefined): ProofIndex {
  const parsed = parseProjectKnowledge(knowledge);
  const statements: string[] = [];
  const quotes: ProofQuoteEntry[] = [];
  const numericClaims: string[] = [];
  const quoteCandidates: ProofQuoteCandidate[] = [];
  const statisticCandidates: ProofStatisticCandidate[] = [];

  const proofApproved =
    parsed?.cards.proof.status === "approved";

  if (parsed && proofApproved) {
    let statementIdx = 0;
    for (const s of parsed.cards.proof.statements) {
      const t = s.trim();
      if (!t) continue;
      statements.push(t);
      numericClaims.push(...extractNumericClaims(t));

      const candidate = parseAttributableQuote(
        t,
        `proof-statement-${statementIdx}`,
      );
      statementIdx++;
      if (candidate) {
        quoteCandidates.push(candidate);
        quotes.push({
          id: candidate.id,
          text: candidate.quote,
          attribution: candidate.attribution,
        });
      }

      const statCandidate = parseStatisticFromStatement(
        t,
        `proof-statement-${statementIdx - 1}`,
      );
      if (statCandidate) {
        statisticCandidates.push(statCandidate);
      }
    }

    let assetIdx = 0;
    for (const s of parsed.cards.proof.asset_statements) {
      const t = s.text.trim();
      if (!t) continue;
      statements.push(t);
      numericClaims.push(...extractNumericClaims(t));

      const id = s.source_asset_id
        ? `proof-asset-${s.source_asset_id}`
        : `proof-asset-${assetIdx}`;
      assetIdx++;
      const candidate = parseAttributableQuote(t, id, "Approved asset proof");
      if (candidate) {
        quoteCandidates.push(candidate);
        quotes.push({
          id: candidate.id,
          text: candidate.quote,
          attribution: candidate.attribution,
        });
      }

      const statCandidate = parseStatisticFromStatement(t, id, "Approved asset proof");
      if (statCandidate) {
        statisticCandidates.push(statCandidate);
      }
    }
  } else if (parsed) {
    for (const s of parsed.cards.proof.statements) {
      const t = s.trim();
      if (!t) continue;
      statements.push(t);
      numericClaims.push(...extractNumericClaims(t));
    }
    for (const s of parsed.cards.proof.asset_statements) {
      const t = s.text.trim();
      if (!t) continue;
      statements.push(t);
      numericClaims.push(...extractNumericClaims(t));
    }
  }

  const uniqueCandidates = dedupeCandidates(quoteCandidates);
  const uniqueStatistics = dedupeStatisticCandidates(statisticCandidates);

  return {
    statements,
    numericClaims,
    quotes,
    quoteCandidates: uniqueCandidates,
    statisticCandidates: uniqueStatistics,
    hasNumericProof: numericClaims.length > 0,
    hasStatisticCandidates: uniqueStatistics.length > 0,
    hasQuoteCandidates: uniqueCandidates.length > 0,
    hasQuotableProof: uniqueCandidates.length > 0,
  };
}

export function statisticValueInProof(
  proof: ProofIndex,
  value: string,
  label: string,
): boolean {
  const needle = normalizePresentationText(`${value} ${label}`);
  const valueNorm = normalizePresentationText(value);
  if (!valueNorm) return false;

  for (const statement of proof.statements) {
    const norm = normalizePresentationText(statement);
    if (norm.includes(valueNorm) && narrationContainsMetricContext(norm, label)) {
      return true;
    }
    if (needle.length > 4 && norm.includes(needle)) return true;
  }
  for (const claim of proof.numericClaims) {
    if (claim.includes(valueNorm)) return true;
  }
  return false;
}

function narrationContainsMetricContext(
  statementNorm: string,
  label: string,
): boolean {
  const labelNorm = normalizePresentationText(label);
  if (!labelNorm) return true;
  return (
    statementNorm.includes(labelNorm) ||
    tokenOverlapInText(statementNorm, labelNorm) >= 0.4
  );
}

function tokenOverlapInText(a: string, b: string): number {
  const bt = b.split(" ").filter((t) => t.length > 2);
  if (bt.length === 0) return 1;
  let hit = 0;
  for (const t of bt) {
    if (a.includes(t)) hit++;
  }
  return hit / bt.length;
}

function digitSignature(text: string): string {
  return (normalizePresentationText(text).match(/\d+/g) ?? []).join("|");
}

export function quoteTextMatchesApproved(
  approved: string,
  candidate: string,
): boolean {
  if (digitSignature(approved) !== digitSignature(candidate)) {
    return false;
  }
  return normalizedQuoteMatch(approved, candidate);
}

export function attributionMatchesApproved(
  candidate: ProofQuoteCandidate,
  payloadAttribution: string,
): boolean {
  const approved = normalizePresentationText(candidate.attribution);
  const given = normalizePresentationText(payloadAttribution);
  if (!approved || !given) return false;
  if (approved === given) return true;
  if (approved.includes(given) || given.includes(approved)) return true;
  const approvedTokens = approved.split(" ").filter((t) => t.length > 2);
  if (approvedTokens.length === 0) return false;
  let hit = 0;
  for (const t of approvedTokens) {
    if (given.includes(t)) hit++;
  }
  return hit / approvedTokens.length >= 0.6;
}

export function resolveProofQuote(
  proof: ProofIndex,
  quote: string,
  proofId?: string,
): ProofQuoteEntry | null {
  if (proofId) {
    const found = proof.quotes.find((q) => q.id === proofId);
    if (found && normalizedQuoteMatch(found.text, quote)) return found;
    const candidate = proof.quoteCandidates.find((c) => c.id === proofId);
    if (candidate && normalizedQuoteMatch(candidate.quote, quote)) {
      return {
        id: candidate.id,
        text: candidate.quote,
        attribution: candidate.attribution,
      };
    }
  }
  for (const entry of proof.quotes) {
    if (normalizedQuoteMatch(entry.text, quote)) return entry;
  }
  return null;
}

function normalizedQuoteMatch(approved: string, candidate: string): boolean {
  const a = normalizePresentationText(stripOuterQuotes(approved));
  const c = normalizePresentationText(stripOuterQuotes(candidate));
  if (!a || !c) return false;
  if (a === c) return true;
  if (a.includes(c) || c.includes(a)) return true;
  const aWords = a.split(" ").filter((w) => w.length > 2);
  if (aWords.length === 0) return false;
  let hit = 0;
  for (const w of aWords) {
    if (c.includes(w)) hit++;
  }
  return hit / aWords.length >= 0.75;
}
