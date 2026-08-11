/**
 * Creative Review validation.
 *
 * Invalid structures fail early — never silently repair malformed data.
 * Legacy packages are normalized by read helpers before validation.
 */

import {
  validate,
  vArray,
  vBoolean,
  vEnum,
  vNonEmptyString,
  vNumber,
  vObject,
  vString,
  type ValidationIssue,
  type ValidationResult,
  type Validator,
} from "@/lib/ai/validateAiOutput";
import {
  CREATIVE_REVIEW_ACTOR_TYPES,
  CREATIVE_REVIEW_HISTORY_EVENTS,
  CREATIVE_REVIEW_STATUSES,
  SCENE_INTENT_VISUAL_SOURCES,
  type CreativeReview,
  type CreativeReviewHistoryEntry,
  type CreativeReviewScene,
  type CreativeReviewVoiceover,
  type SceneCreativeIntent,
} from "@/lib/creative-review/types";

const nullableString: Validator<string | null> = (value, path = "$") => {
  if (value === null) return [];
  if (typeof value === "string") return [];
  return [{ path, message: "expected string or null" }];
};

const sceneCreativeIntentValidator: Validator<SceneCreativeIntent> = (
  value,
  path = "$",
) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [{ path, message: "expected scene intent object" }];
  }
  const record = value as Record<string, unknown>;
  // Fail closed: image prompts must never live on Scene Creative Intent.
  if (Object.prototype.hasOwnProperty.call(record, "image_prompt")) {
    return [
      {
        path: `${path}.image_prompt`,
        message:
          "image_prompt is not allowed on Scene Creative Intent (keep prompts on visual_scenes)",
      },
    ];
  }
  return vObject({
    original: vNonEmptyString(),
    localized_edit: vNonEmptyString(),
    english_preview: nullableString,
    english_preview_outdated: vBoolean(),
    presentation_type: nullableString,
    visual_source: vEnum(SCENE_INTENT_VISUAL_SOURCES),
    asset_id: nullableString,
    used_as: nullableString,
  })(value, path);
};

const creativeReviewSceneValidator: Validator<CreativeReviewScene> = vObject({
  id: vNonEmptyString(),
  index: vNumber({ min: 0 }),
  intent: sceneCreativeIntentValidator as Validator<unknown>,
  director_notes: vString(),
}) as Validator<CreativeReviewScene>;

const creativeReviewVoiceoverValidator: Validator<CreativeReviewVoiceover> =
  vObject({
    original_ai: vNonEmptyString(),
    localized_edit: vNonEmptyString(),
    english_preview: nullableString,
    english_preview_outdated: vBoolean(),
    english_confirmed: vBoolean(),
    translation_confirmed_at: nullableString,
    translation_confirmed_by: nullableString,
    final_approved: vString(),
  }) as Validator<CreativeReviewVoiceover>;

const creativeReviewActorValidator = vObject({
  type: vEnum(CREATIVE_REVIEW_ACTOR_TYPES),
  id: vNonEmptyString(),
});

const creativeReviewHistoryEntryValidator: Validator<CreativeReviewHistoryEntry> =
  vObject({
    version: vNumber({ min: 1 }),
    event: vEnum(CREATIVE_REVIEW_HISTORY_EVENTS),
    timestamp: vNonEmptyString(),
    actor: creativeReviewActorValidator as Validator<unknown>,
    voiceover: creativeReviewVoiceoverValidator as Validator<unknown>,
    scenes: vArray(creativeReviewSceneValidator as Validator<unknown>),
    status: vEnum(CREATIVE_REVIEW_STATUSES),
    approved: vBoolean(),
  }) as Validator<CreativeReviewHistoryEntry>;

export const creativeReviewValidator: Validator<CreativeReview> = vObject({
  status: vEnum(CREATIVE_REVIEW_STATUSES),
  version: vNumber({ min: 1 }),
  approved: vBoolean(),
  voiceover: creativeReviewVoiceoverValidator as Validator<unknown>,
  scenes: vArray(creativeReviewSceneValidator as Validator<unknown>),
  history: vArray(creativeReviewHistoryEntryValidator as Validator<unknown>, {
    min: 1,
  }),
}) as Validator<CreativeReview>;

/** Validate a Creative Review object. Does not repair. */
export function parseCreativeReview(
  value: unknown,
): ValidationResult<CreativeReview> {
  return validate(creativeReviewValidator, value);
}

/**
 * Assert a Creative Review is valid or throw.
 * Used at seed/persist boundaries so malformed drafts never land in storage.
 */
export function assertCreativeReview(value: unknown): CreativeReview {
  const result = parseCreativeReview(value);
  if (!result.ok) {
    const detail = result.issues
      .map((issue: ValidationIssue) => `${issue.path}: ${issue.message}`)
      .join("; ");
    throw new Error(`invalid creative_review: ${detail}`);
  }
  return result.value;
}
