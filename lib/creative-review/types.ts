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
 * Voiceover draft lanes for Manual Review, including the English translation
 * verification workflow (Phase 4).
 */
export interface CreativeReviewVoiceover {
  original_ai: string;
  localized_edit: string;
  /** English translation of localized_edit — null until Translate is requested. */
  english_preview: string | null;
  /** True only after the editor explicitly confirms the English preview. */
  english_confirmed: boolean;
  translation_confirmed_at: string | null;
  translation_confirmed_by: string | null;
  /** Becomes localized_edit when translation is confirmed. */
  final_approved: string;
}

/**
 * Scene Creative Intent — what the scene should communicate.
 *
 * Distinct from Image Prompt (a render instruction). This object must never
 * carry an image_prompt field; render prompts live on visual_scenes / video jobs.
 */
export const SCENE_INTENT_VISUAL_SOURCES = [
  "generated",
  "asset",
  "typed_overlay",
] as const;
export type SceneIntentVisualSource =
  (typeof SCENE_INTENT_VISUAL_SOURCES)[number];

export interface SceneCreativeIntent {
  /** Human-readable creative intent for this scene. */
  description: string;
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
