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
} from "@/lib/creative-review/types";
import type { ValidationIssue, ValidationResult } from "@/lib/ai/validateAiOutput";

export function cloneVoiceover(
  voiceover: CreativeReviewVoiceover,
): CreativeReviewVoiceover {
  return {
    original_ai: voiceover.original_ai,
    localized_edit: voiceover.localized_edit,
    english_preview: voiceover.english_preview,
    english_confirmed: voiceover.english_confirmed,
    translation_confirmed_at: voiceover.translation_confirmed_at,
    translation_confirmed_by: voiceover.translation_confirmed_by,
    final_approved: voiceover.final_approved,
  };
}

export function cloneScene(scene: CreativeReviewScene): CreativeReviewScene {
  return {
    id: scene.id,
    index: scene.index,
    director_notes: scene.director_notes,
    intent: {
      description: scene.intent.description,
      presentation_type: scene.intent.presentation_type,
      visual_source: scene.intent.visual_source,
      asset_id: scene.intent.asset_id,
      used_as: scene.intent.used_as,
    },
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

/** Every scene must have a non-empty Creative Intent description. */
export function scenesHaveCompleteIntent(
  scenes: readonly CreativeReviewScene[],
): boolean {
  if (scenes.length === 0) return true;
  return scenes.every(
    (scene) => scene.intent.description.trim().length > 0,
  );
}

/**
 * Server-computed lifecycle status.
 * approved flag wins; otherwise ready when translation is confirmed and
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
    vo.localized_edit.trim().length > 0 &&
    vo.final_approved.trim().length > 0 &&
    scenesHaveCompleteIntent(args.scenes)
  ) {
    return "ready";
  }
  return "draft";
}

/** Approval gate — server only. */
export function validateCreativeReviewApproval(
  review: CreativeReview,
): ValidationResult<true> {
  const issues: ValidationIssue[] = [];
  if (!review.voiceover.english_confirmed) {
    issues.push({
      path: "$.voiceover.english_confirmed",
      message: "english translation must be confirmed before approval",
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
  if (!scenesHaveCompleteIntent(review.scenes)) {
    issues.push({
      path: "$.scenes",
      message: "every scene must contain Creative Intent before approval",
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
 * Invalidate translation confirmation after localized_edit changes.
 * Keeps english_preview (stale until re-translated) but clears confirmation.
 * Also clears approval.
 */
export function invalidateTranslationAfterEdit(
  voiceover: CreativeReviewVoiceover,
): CreativeReviewVoiceover {
  return {
    ...cloneVoiceover(voiceover),
    english_confirmed: false,
    translation_confirmed_at: null,
    translation_confirmed_by: null,
  };
}
