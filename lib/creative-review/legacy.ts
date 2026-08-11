/**
 * Legacy Creative Review normalization.
 *
 * Older Manual Review packages missing translation / scene-lane fields must
 * still load. Missing fields are filled with safe defaults. Present-but-invalid
 * values are NOT repaired — validation still fails early after normalization.
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
  if (!hasOwn(next, "english_preview_outdated")) {
    // Legacy packages without the flag: outdated when preview missing or unconfirmed.
    const preview =
      typeof next.english_preview === "string"
        ? next.english_preview.trim()
        : "";
    const confirmed = next.english_confirmed === true;
    next.english_preview_outdated = !(preview.length > 0 && confirmed);
  }
  if (!hasOwn(next, "english_confirmed")) next.english_confirmed = false;
  if (!hasOwn(next, "translation_confirmed_at")) {
    next.translation_confirmed_at = null;
  }
  if (!hasOwn(next, "translation_confirmed_by")) {
    next.translation_confirmed_by = null;
  }
  return next;
}

function normalizeLegacySceneIntent(
  raw: unknown,
): Record<string, unknown> | unknown {
  const intent = asRecord(raw);
  if (!intent) return raw;
  const next: Record<string, unknown> = { ...intent };

  // Phase ≤4 used a single `description` field.
  const legacyDescription =
    typeof next.description === "string" ? next.description.trim() : "";
  if (!hasOwn(next, "original")) {
    next.original =
      legacyDescription ||
      (typeof next.localized_edit === "string" ? next.localized_edit : "") ||
      "Creative intent not specified.";
  }
  if (!hasOwn(next, "localized_edit")) {
    next.localized_edit =
      legacyDescription ||
      (typeof next.original === "string" ? next.original : "") ||
      "Creative intent not specified.";
  }
  if (!hasOwn(next, "english_preview")) next.english_preview = null;
  if (!hasOwn(next, "english_preview_outdated")) {
    const preview =
      typeof next.english_preview === "string"
        ? next.english_preview.trim()
        : "";
    next.english_preview_outdated = preview.length === 0;
  }
  // Drop legacy description so validators do not see unknown required shape.
  delete next.description;
  return next;
}

function normalizeLegacyScene(raw: unknown): Record<string, unknown> | unknown {
  const scene = asRecord(raw);
  if (!scene) return raw;
  const next: Record<string, unknown> = { ...scene };
  if (hasOwn(next, "intent")) {
    next.intent = normalizeLegacySceneIntent(next.intent);
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
  if (Array.isArray(next.scenes)) {
    next.scenes = next.scenes.map(normalizeLegacyScene);
  }
  if (!hasOwn(next, "status")) next.status = "draft";
  if (!hasOwn(next, "approved")) next.approved = false;
  if (
    typeof next.event === "string" &&
    !(CREATIVE_REVIEW_HISTORY_EVENTS as readonly string[]).includes(next.event)
  ) {
    // leave as-is — validator will fail
  }
  return next;
}

/**
 * Upgrade a persisted creative_review blob when fields are absent.
 * Does not invent missing required core fields.
 */
export function normalizeLegacyCreativeReview(raw: unknown): unknown {
  const review = asRecord(raw);
  if (!review) return raw;

  const next: Record<string, unknown> = { ...review };
  if (hasOwn(next, "voiceover")) {
    next.voiceover = normalizeLegacyVoiceover(next.voiceover);
  }
  if (Array.isArray(next.scenes)) {
    next.scenes = next.scenes.map(normalizeLegacyScene);
  }
  if (Array.isArray(next.history)) {
    next.history = next.history.map(normalizeLegacyHistoryEntry);
  }
  return next;
}
