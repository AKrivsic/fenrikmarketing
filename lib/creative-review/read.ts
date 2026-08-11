/**
 * Read Creative Review from persisted package_brief.
 *
 * Missing creative_review → null (backward compatible).
 * Present but malformed → validation failure (fail early).
 * Phase 2 packages missing translation fields are normalized before validate.
 */

import type { CreativeReview } from "@/lib/creative-review/types";
import { normalizeLegacyCreativeReview } from "@/lib/creative-review/legacy";
import { parseCreativeReview } from "@/lib/creative-review/validate";
import type {
  ValidationIssue,
  ValidationResult,
} from "@/lib/ai/validateAiOutput";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/**
 * Returns null when creative_review is absent (legacy / production / sample).
 * Returns a failed ValidationResult when present but invalid.
 * Returns ok+value when present and valid (after legacy normalize).
 */
export function readCreativeReviewFromBrief(
  brief: unknown,
): ValidationResult<CreativeReview> | { ok: true; value: null } {
  const record = asRecord(brief);
  if (!record) return { ok: true, value: null };
  if (!Object.prototype.hasOwnProperty.call(record, "creative_review")) {
    return { ok: true, value: null };
  }
  const raw = record.creative_review;
  if (raw === undefined || raw === null) {
    return { ok: true, value: null };
  }
  return parseCreativeReview(normalizeLegacyCreativeReview(raw));
}

/**
 * Strict reader for Manual Review paths that require a valid draft.
 * Throws when missing or invalid.
 */
export function requireCreativeReviewFromBrief(brief: unknown): CreativeReview {
  const result = readCreativeReviewFromBrief(brief);
  if (result.ok && result.value === null) {
    throw new Error("creative_review is missing from package_brief");
  }
  if (!result.ok) {
    const detail = result.issues
      .map((issue: ValidationIssue) => `${issue.path}: ${issue.message}`)
      .join("; ");
    throw new Error(`invalid creative_review: ${detail}`);
  }
  return result.value as CreativeReview;
}

/** True when package_brief carries a creative_review key (valid or not). */
export function hasCreativeReviewKey(brief: unknown): boolean {
  const record = asRecord(brief);
  if (!record) return false;
  if (!Object.prototype.hasOwnProperty.call(record, "creative_review")) {
    return false;
  }
  return record.creative_review !== undefined && record.creative_review !== null;
}
