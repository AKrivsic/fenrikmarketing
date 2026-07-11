import { normalizePresentationText } from "@/lib/scene-types/presentation/textMatch";

export interface ProofStatisticCandidate {
  id: string;
  value: string;
  unit: string;
  label: string;
  originalStatement: string;
  source_line?: string;
}

const URL_LIKE = /https?:\/\/|www\./i;
const PHONE_LIKE = /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/;
const DATE_LIKE =
  /\b(20\d{2}|19\d{2})[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b/;
const ATTRIBUTION_SPLIT = /\s*[—–-]\s+/;

const PERCENT_RE = /(\d[\d,.]*)\s*%\s*(.+)/;
const COUNT_RE =
  /\b(\d[\d,.]*)\+?\s+((?:active\s+|paying\s+)?(?:customers?|users?|clients?|businesses|companies|countries|teams|members))\b/i;
const DURATION_RE =
  /\b(\d+)\s*(minutes|mins|min|hours|hrs|hour|seconds|secs|sec)\b/i;
const SAVES_HOURS_RE =
  /\b(?:saves?|save)\s+(\d+)\s*(hours|hrs|hour)\b/i;

function isExcludedStatement(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (URL_LIKE.test(t)) return true;
  if (PHONE_LIKE.test(t)) return true;
  if (DATE_LIKE.test(t)) return true;
  if (/^\s*(19|20)\d{2}\s*$/.test(t)) return true;
  if (/^\s*\d{4}\s*[-–—]\s*/.test(t) && !/\d+\s*%/.test(t)) return false;
  return false;
}

function looksLikeQuoteStatement(text: string): boolean {
  const parts = text.trim().split(ATTRIBUTION_SPLIT);
  if (parts.length < 2) return false;
  const quote = parts[0]?.trim() ?? "";
  return quote.length >= 15 && parts[1]!.trim().length >= 2;
}

function cleanLabel(raw: string): string {
  return raw
    .replace(/^[,.:\s]+|[,.:\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseStatisticFromStatement(
  rawText: string,
  id: string,
  sourceLine?: string,
): ProofStatisticCandidate | null {
  const trimmed = rawText.trim();
  if (trimmed.length < 8 || isExcludedStatement(trimmed)) return null;
  if (looksLikeQuoteStatement(trimmed)) return null;

  let match = trimmed.match(PERCENT_RE);
  if (match) {
    const value = match[1]!.replace(/,/g, "").trim();
    const label = cleanLabel(match[2]!);
    if (!value || label.length < 4) return null;
    return {
      id,
      value,
      unit: "%",
      label,
      originalStatement: trimmed,
      ...(sourceLine ? { source_line: sourceLine } : {}),
    };
  }

  match = trimmed.match(SAVES_HOURS_RE);
  if (match) {
    const value = match[1]!.trim();
    const unit = match[2]!.toLowerCase().startsWith("h") ? "hours" : match[2]!;
    const label = "saved per week";
    return {
      id,
      value,
      unit,
      label,
      originalStatement: trimmed,
      ...(sourceLine ? { source_line: sourceLine } : {}),
    };
  }

  match = trimmed.match(DURATION_RE);
  if (match) {
    const value = match[1]!.trim();
    let unit = match[2]!.toLowerCase();
    if (unit.startsWith("min")) unit = "min";
    else if (unit.startsWith("h")) unit = "hours";
    else if (unit.startsWith("sec")) unit = "sec";
    const label = cleanLabel(
      trimmed.replace(match[0], "").trim() || "average time",
    ).slice(0, 120);
    if (label.length < 3) return null;
    return {
      id,
      value,
      unit,
      label,
      originalStatement: trimmed,
      ...(sourceLine ? { source_line: sourceLine } : {}),
    };
  }

  match = trimmed.match(COUNT_RE);
  if (match) {
    const value = match[1]!.trim();
    const label = cleanLabel(match[2]!);
    if (!value || label.length < 3) return null;
    return {
      id,
      value,
      unit: "",
      label,
      originalStatement: trimmed,
      ...(sourceLine ? { source_line: sourceLine } : {}),
    };
  }

  return null;
}

export function dedupeStatisticCandidates(
  candidates: ProofStatisticCandidate[],
): ProofStatisticCandidate[] {
  const seen = new Set<string>();
  const out: ProofStatisticCandidate[] = [];
  for (const c of candidates) {
    const key = normalizePresentationText(
      `${c.value}|${c.unit}|${c.label}`,
    );
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

export function digitSignatureForStatistic(value: string, unit: string): string {
  const combined = `${value}${unit}`.replace(/,/g, "").toLowerCase();
  const digits = combined.match(/\d+/g);
  if (!digits || digits.length === 0) return "";
  return digits.join("|");
}

export function normalizeStatisticUnit(unit: string | undefined): string {
  const u = (unit ?? "").trim().toLowerCase();
  if (u === "percent" || u === "percentage") return "%";
  if (u === "mins") return "min";
  if (u === "hrs" || u === "hr") return "hours";
  if (u === "secs") return "sec";
  return u;
}
