/**
 * Meaning-safe English for T2V: original_ai is production speech.
 * Czech is the operator working copy. CS→EN only after a real CS edit,
 * with original EN in context and deterministic protected-term checks.
 */

import { fingerprintText } from "@/lib/content-package/videoCreativeRevision";
import { normalizeMemoryText } from "@/lib/ai/workflows/antiRepetitionMemory";

export const MEANING_SAFE_ENGLISH_VERSION = 1 as const;

const PROTECTED_PHRASES = [
  "still hiring",
  "still open",
  "follow-up",
  "follow up",
  "offer letter",
  "first day",
  "feed",
] as const;

export interface MeaningLaneFingerprints {
  source_en_fingerprint: string;
  source_cs_fingerprint: string;
  current_cs_fingerprint: string;
  production_en_fingerprint: string;
}

export interface MeaningSafetyResult {
  fingerprints: MeaningLaneFingerprints;
  czech_changed: boolean;
  meaning_review_required: boolean;
  warnings: string[];
  production_en: string;
}

export function meaningFingerprint(text: string): string {
  return fingerprintText(text);
}

export function czechWorkingCopyChanged(args: {
  originalCs: string;
  currentCs: string;
}): boolean {
  return (
    normalizeMemoryText(args.originalCs) !==
    normalizeMemoryText(args.currentCs)
  );
}

export function extractProtectedPhrases(english: string): string[] {
  const hay = normalizeMemoryText(english);
  return PROTECTED_PHRASES.filter((phrase) => hay.includes(phrase));
}

/**
 * Deterministic drift check. No extra AI request.
 * `still hiring` must not become `still open`.
 */
export function detectMeaningDrift(args: {
  originalEn: string;
  nextEn: string;
}): string[] {
  const warnings: string[] = [];
  const original = normalizeMemoryText(args.originalEn);
  const next = normalizeMemoryText(args.nextEn);
  if (!original || !next) return warnings;

  const originalHasHiring = original.includes("still hiring") || /\bhiring\b/.test(original);
  const nextHasHiring = next.includes("still hiring") || /\bhiring\b/.test(next);
  const nextHasStillOpen = next.includes("still open");
  if (originalHasHiring && nextHasStillOpen && !nextHasHiring) {
    warnings.push("Protected phrase 'still hiring' became 'still open'");
  }

  for (const phrase of extractProtectedPhrases(args.originalEn)) {
    if (phrase === "still open") continue;
    if (phrase === "feed" && original.includes("feed") && !next.includes("feed")) {
      warnings.push("Protected term 'feed' was dropped");
      continue;
    }
    if (phrase !== "feed" && !next.includes(phrase)) {
      warnings.push(`Protected phrase '${phrase}' is missing from the English preview`);
    }
  }
  return warnings;
}

export function resolveMeaningSafeEnglish(args: {
  originalEn: string;
  originalCs: string;
  currentCs: string;
  translatedEn?: string | null;
}): MeaningSafetyResult {
  const czech_changed = czechWorkingCopyChanged({
    originalCs: args.originalCs,
    currentCs: args.currentCs,
  });
  const production_en = czech_changed
    ? (args.translatedEn?.trim() || args.originalEn.trim())
    : args.originalEn.trim();
  const warnings = czech_changed
    ? detectMeaningDrift({
        originalEn: args.originalEn,
        nextEn: production_en,
      })
    : [];
  return {
    fingerprints: {
      source_en_fingerprint: meaningFingerprint(args.originalEn),
      source_cs_fingerprint: meaningFingerprint(args.originalCs),
      current_cs_fingerprint: meaningFingerprint(args.currentCs),
      production_en_fingerprint: meaningFingerprint(production_en),
    },
    czech_changed,
    meaning_review_required: warnings.length > 0,
    warnings,
    production_en,
  };
}

export function isEnglishPreviewSemanticallyCurrent(args: {
  englishPreview: string | null;
  outdated: boolean;
  meaningReviewRequired?: boolean;
  fingerprints?: MeaningLaneFingerprints | null;
}): boolean {
  const preview = args.englishPreview?.trim() ?? "";
  if (!preview || args.outdated) return false;
  if (args.meaningReviewRequired) return false;
  if (!args.fingerprints?.source_en_fingerprint) return false;
  if (!args.fingerprints.production_en_fingerprint) return false;
  return true;
}
