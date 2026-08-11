/**
 * Legacy Creative Review normalization (Phase 2 → Phase 4).
 *
 * Older Manual Review packages seeded before translation fields existed must
 * still load. Missing translation / history snapshot fields are filled with
 * safe defaults. Present-but-invalid values are NOT repaired — validation
 * still fails early after normalization.
 */

import { CREATIVE_REVIEW_HISTORY_EVENTS } from "@/lib/creative-review/types";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function normalizeLegacyVoiceover(
  raw: unknown,
): Record<string, unknown> | unknown {
  const vo = asRecord(raw);
  if (!vo) return raw;
  const next: Record<string, unknown> = { ...vo };
  if (!hasOwn(next, "english_preview")) next.english_preview = null;
  if (!hasOwn(next, "english_confirmed")) next.english_confirmed = false;
  if (!hasOwn(next, "translation_confirmed_at")) {
    next.translation_confirmed_at = null;
  }
  if (!hasOwn(next, "translation_confirmed_by")) {
    next.translation_confirmed_by = null;
  }
  return next;
}

function normalizeLegacyHistoryEntry(
  raw: unknown,
): Record<string, unknown> | unknown {
  const entry = asRecord(raw);
  if (!entry) return raw;
  const next: Record<string, unknown> = { ...entry };
  if (hasOwn(next, "voiceover")) {
    next.voiceover = normalizeLegacyVoiceover(next.voiceover);
  }
  if (!hasOwn(next, "status")) next.status = "draft";
  if (!hasOwn(next, "approved")) next.approved = false;
  // Phase 2 only emitted "seed"; keep unknown events for validation to reject.
  if (
    typeof next.event === "string" &&
    !(CREATIVE_REVIEW_HISTORY_EVENTS as readonly string[]).includes(next.event)
  ) {
    // leave as-is — validator will fail
  }
  return next;
}

/**
 * Upgrade a persisted creative_review blob to the Phase 4 shape when fields
 * are absent. Does not invent missing required Phase 2 fields.
 */
export function normalizeLegacyCreativeReview(raw: unknown): unknown {
  const review = asRecord(raw);
  if (!review) return raw;

  const next: Record<string, unknown> = { ...review };
  if (hasOwn(next, "voiceover")) {
    next.voiceover = normalizeLegacyVoiceover(next.voiceover);
  }
  if (Array.isArray(next.history)) {
    next.history = next.history.map(normalizeLegacyHistoryEntry);
  }
  return next;
}
