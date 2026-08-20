/**
 * Pure Creative Review domain helpers: cloning, status, readiness, history.
 */

import type {
  CreativeReview,
  CreativeReviewActor,
  CreativeReviewHistoryEntry,
  CreativeReviewHistoryEvent,
  CreativeReviewScene,
  CreativeReviewStatus,
  CreativeReviewVoiceover,
  SceneCreativeIntent,
} from "@/lib/creative-review/types";
import type { ValidationIssue, ValidationResult } from "@/lib/ai/validateAiOutput";

export function cloneVoiceover(
  voiceover: CreativeReviewVoiceover,
): CreativeReviewVoiceover {
  return {
    original_ai: voiceover.original_ai,
    localized_edit: voiceover.localized_edit,
    english_preview: voiceover.english_preview,
    english_preview_outdated: voiceover.english_preview_outdated,
    english_confirmed: voiceover.english_confirmed,
    translation_confirmed_at: voiceover.translation_confirmed_at,
    translation_confirmed_by: voiceover.translation_confirmed_by,
    final_approved: voiceover.final_approved,
  };
}

export function cloneSceneIntent(intent: SceneCreativeIntent): SceneCreativeIntent {
  return {
    original: intent.original,
    localized_edit: intent.localized_edit,
    english_preview: intent.english_preview,
    english_preview_outdated: intent.english_preview_outdated,
    presentation_type: intent.presentation_type,
    visual_source: intent.visual_source,
    asset_id: intent.asset_id,
    used_as: intent.used_as,
  };
}

export function cloneScene(scene: CreativeReviewScene): CreativeReviewScene {
  return {
    id: scene.id,
    index: scene.index,
    director_notes: scene.director_notes,
    intent: cloneSceneIntent(scene.intent),
  };
}

export function cloneScenes(
  scenes: readonly CreativeReviewScene[],
): CreativeReviewScene[] {
  return scenes.map(cloneScene);
}

export function cloneHistoryEntry(
  entry: CreativeReviewHistoryEntry,
): CreativeReviewHistoryEntry {
  return {
    version: entry.version,
    event: entry.event,
    timestamp: entry.timestamp,
    actor: { ...entry.actor },
    voiceover: cloneVoiceover(entry.voiceover),
    scenes: cloneScenes(entry.scenes),
    status: entry.status,
    approved: entry.approved,
  };
}

/** Every scene must have a non-empty localized Creative Intent. */
export function scenesHaveCompleteIntent(
  scenes: readonly CreativeReviewScene[],
): boolean {
  if (scenes.length === 0) return true;
  return scenes.every(
    (scene) => scene.intent.localized_edit.trim().length > 0,
  );
}

/** True when English preview exists and is not marked outdated. */
export function isEnglishPreviewCurrent(args: {
  english_preview: string | null;
  english_preview_outdated: boolean;
}): boolean {
  const preview = args.english_preview?.trim() ?? "";
  return preview.length > 0 && !args.english_preview_outdated;
}

export function scenesHaveCurrentEnglishPreview(
  scenes: readonly CreativeReviewScene[],
): boolean {
  if (scenes.length === 0) return true;
  return scenes.every((scene) =>
    isEnglishPreviewCurrent({
      english_preview: scene.intent.english_preview,
      english_preview_outdated: scene.intent.english_preview_outdated,
    }),
  );
}

/**
 * Server-computed lifecycle status.
 * approved flag wins; otherwise ready when English previews are current and
 * scenes are complete; else draft.
 */
export function computeCreativeReviewStatus(args: {
  approved: boolean;
  voiceover: CreativeReviewVoiceover;
  scenes: readonly CreativeReviewScene[];
}): CreativeReviewStatus {
  if (args.approved) return "approved";
  const vo = args.voiceover;
  if (
    vo.english_confirmed &&
    isEnglishPreviewCurrent({
      english_preview: vo.english_preview,
      english_preview_outdated: vo.english_preview_outdated,
    }) &&
    vo.localized_edit.trim().length > 0 &&
    vo.final_approved.trim().length > 0 &&
    scenesHaveCompleteIntent(args.scenes) &&
    scenesHaveCurrentEnglishPreview(args.scenes)
  ) {
    return "ready";
  }
  return "draft";
}

/** Approval gate — server only. */
export function validateCreativeReviewApproval(
  review: CreativeReview,
  options?: {
    /**
     * Still packages require Creative Intent scenes.
     * Text-to-video packages hide that still layer — skip it.
     */
    requireSceneIntent?: boolean;
  },
): ValidationResult<true> {
  const issues: ValidationIssue[] = [];
  const requireSceneIntent = options?.requireSceneIntent !== false;
  if (!review.voiceover.english_confirmed) {
    issues.push({
      path: "$.voiceover.english_confirmed",
      message: "english preview must be current before approval",
    });
  }
  if (
    !isEnglishPreviewCurrent({
      english_preview: review.voiceover.english_preview,
      english_preview_outdated: review.voiceover.english_preview_outdated,
    })
  ) {
    issues.push({
      path: "$.voiceover.english_preview",
      message:
        "voiceover english preview is missing or outdated — save to refresh automatic translation",
    });
  }
  if (!review.voiceover.localized_edit.trim()) {
    issues.push({
      path: "$.voiceover.localized_edit",
      message: "voiceover is required for approval",
    });
  }
  if (!review.voiceover.final_approved.trim()) {
    issues.push({
      path: "$.voiceover.final_approved",
      message: "final_approved voiceover is required for approval",
    });
  }
  if (requireSceneIntent && !scenesHaveCompleteIntent(review.scenes)) {
    issues.push({
      path: "$.scenes",
      message: "every scene must contain Creative Intent before approval",
    });
  }
  if (requireSceneIntent && !scenesHaveCurrentEnglishPreview(review.scenes)) {
    issues.push({
      path: "$.scenes",
      message:
        "every scene english preview must be current — save to refresh automatic translation",
    });
  }
  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, value: true };
}

export function appendCreativeReviewHistory(args: {
  review: CreativeReview;
  event: CreativeReviewHistoryEvent;
  actor: CreativeReviewActor;
  timestamp: string;
}): CreativeReview {
  const nextVersion = args.review.version + 1;
  const status = computeCreativeReviewStatus({
    approved: args.review.approved,
    voiceover: args.review.voiceover,
    scenes: args.review.scenes,
  });
  const entry: CreativeReviewHistoryEntry = {
    version: nextVersion,
    event: args.event,
    timestamp: args.timestamp,
    actor: { ...args.actor },
    voiceover: cloneVoiceover(args.review.voiceover),
    scenes: cloneScenes(args.review.scenes),
    status,
    approved: args.review.approved,
  };
  return {
    ...args.review,
    status,
    version: nextVersion,
    history: [...args.review.history.map(cloneHistoryEntry), entry],
  };
}

/**
 * Invalidate translation after localized_edit changes.
 * Clears English preview, confirmation, and final_approved so stale approvals
 * cannot survive. Scene intents clear english_preview the same way.
 */
export function invalidateVoiceoverTranslationAfterEdit(
  voiceover: CreativeReviewVoiceover,
): CreativeReviewVoiceover {
  return {
    ...cloneVoiceover(voiceover),
    english_preview: null,
    english_preview_outdated: true,
    english_confirmed: false,
    translation_confirmed_at: null,
    translation_confirmed_by: null,
    final_approved: "",
  };
}

export function invalidateSceneIntentTranslationAfterEdit(
  intent: SceneCreativeIntent,
): SceneCreativeIntent {
  return {
    ...cloneSceneIntent(intent),
    english_preview: null,
    english_preview_outdated: true,
  };
}

/** True when any English preview is outdated or missing. */
export function creativeReviewNeedsEnglishPreviewUpdate(
  review: CreativeReview,
): boolean {
  if (
    !isEnglishPreviewCurrent({
      english_preview: review.voiceover.english_preview,
      english_preview_outdated: review.voiceover.english_preview_outdated,
    })
  ) {
    return true;
  }
  return !scenesHaveCurrentEnglishPreview(review.scenes);
}
