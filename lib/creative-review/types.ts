/**
 * Creative Review — persisted Manual Review draft on package_brief.creative_review.
 *
 * Source of truth for the Manual Review workflow. Omitted entirely for
 * production / sample packages. Every field is durable JSON — no computed
 * runtime state.
 */

/** Creative Review lifecycle status (server-computed). */
export const CREATIVE_REVIEW_STATUSES = ["draft", "ready", "approved"] as const;
export type CreativeReviewStatus = (typeof CREATIVE_REVIEW_STATUSES)[number];

/** History event kinds — append-only audit log. */
export const CREATIVE_REVIEW_HISTORY_EVENTS = [
  "seed",
  "save",
  "translate",
  "confirm_translation",
  "approve",
  "unapprove",
  "continue_generation_started",
  "creative_rebuild_completed",
  "manual_review_cancelled",
] as const;
export type CreativeReviewHistoryEvent =
  (typeof CREATIVE_REVIEW_HISTORY_EVENTS)[number];

export const CREATIVE_REVIEW_ACTOR_TYPES = ["system", "user"] as const;
export type CreativeReviewActorType =
  (typeof CREATIVE_REVIEW_ACTOR_TYPES)[number];

export interface CreativeReviewActor {
  type: CreativeReviewActorType;
  /** Stable actor id — "system" for automated seeds. */
  id: string;
}

/**
 * Voiceover draft lanes for Manual Review.
 *
 * English preview is produced automatically at package generation (Editor
 * Language → English), then refreshed automatically on Save after Localized edits.
 */
export interface CreativeReviewVoiceover {
  original_ai: string;
  localized_edit: string;
  /** English translation of localized_edit — null when invalidated / missing. */
  english_preview: string | null;
  /**
   * True when localized_edit changed after the last English translation.
   * Stale previews must not remain approved.
   */
  english_preview_outdated: boolean;
  /**
   * True when English preview is present and current (auto at seed, or after
   * automatic Save re-translation). Cleared when localized_edit changes.
   */
  english_confirmed: boolean;
  translation_confirmed_at: string | null;
  translation_confirmed_by: string | null;
  /**
   * Becomes localized_edit when English preview is current.
   * Cleared (empty) when Localized changes — never keep a stale final_approved.
   */
  final_approved: string;
  /** T2V meaning-safe English — optional on legacy drafts. */
  meaning_review_required?: boolean;
  meaning_warnings?: string[];
  source_en_fingerprint?: string;
  source_cs_fingerprint?: string;
  current_cs_fingerprint?: string;
  production_en_fingerprint?: string;
}

/**
 * Scene Creative Intent — what the scene should communicate.
 *
 * Distinct from Image Prompt (a render instruction). This object must never
 * carry an image_prompt field; render prompts live on visual_scenes / video jobs.
 *
 * Editors always edit localized_edit — never English.
 */
export const SCENE_INTENT_VISUAL_SOURCES = [
  "generated",
  "asset",
  "typed_overlay",
] as const;
export type SceneIntentVisualSource =
  (typeof SCENE_INTENT_VISUAL_SOURCES)[number];

export interface SceneCreativeIntent {
  /** Immutable AI creative description (human language — not a prompt). */
  original: string;
  /** Editor-editable localized creative intent. */
  localized_edit: string;
  /** English translation of localized_edit for verification. */
  english_preview: string | null;
  /** True when localized_edit changed after the last English translation. */
  english_preview_outdated: boolean;
  /**
   * Presentation type when known (IMAGE, CHECKLIST, PHONE, QUOTE, STATISTIC,
   * CTA). null when the source scene does not declare a type.
   */
  presentation_type: string | null;
  visual_source: SceneIntentVisualSource;
  /** Set when visual_source is "asset"; otherwise null. */
  asset_id: string | null;
  /** Asset usage role when applicable; otherwise null. */
  used_as: string | null;
}

export interface CreativeReviewScene {
  /** Stable scene id within the package (e.g. "scene-1"). */
  id: string;
  /** 0-based order matching the package visual plan. */
  index: number;
  intent: SceneCreativeIntent;
  /** Operator notes — empty string until edited. */
  director_notes: string;
}

/**
 * Immutable snapshot of review state at a history event.
 * Voiceover + scenes are deep-copied at write time. Append-only.
 */
export interface CreativeReviewHistoryEntry {
  version: number;
  event: CreativeReviewHistoryEvent;
  /** ISO-8601 timestamp. */
  timestamp: string;
  actor: CreativeReviewActor;
  voiceover: CreativeReviewVoiceover;
  scenes: CreativeReviewScene[];
  status: CreativeReviewStatus;
  approved: boolean;
}

export interface CreativeReview {
  status: CreativeReviewStatus;
  version: number;
  approved: boolean;
  voiceover: CreativeReviewVoiceover;
  scenes: CreativeReviewScene[];
  history: CreativeReviewHistoryEntry[];
}

export const CREATIVE_REVIEW_SYSTEM_ACTOR: CreativeReviewActor = {
  type: "system",
  id: "system",
};
