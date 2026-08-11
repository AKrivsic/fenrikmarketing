/**
 * Pure Creative Review mutations (save / apply english preview / approve).
 *
 * Every successful mutation bumps version and appends an immutable history
 * entry. Optimistic concurrency is enforced via expectedVersion.
 *
 * Manual Confirm Translation is removed — English Preview is refreshed
 * automatically on Save after Localized edits.
 */

import type { ValidationIssue, ValidationResult } from "@/lib/ai/validateAiOutput";
import {
  applyCreativeReviewEdits,
  type CreativeReviewPackageEdits,
} from "@/lib/creative-review/applyEdits";
import {
  appendCreativeReviewHistory,
  cloneScenes,
  cloneVoiceover,
  computeCreativeReviewStatus,
  validateCreativeReviewApproval,
} from "@/lib/creative-review/lifecycle";
import type {
  CreativeReview,
  CreativeReviewActor,
  CreativeReviewScene,
  CreativeReviewVoiceover,
} from "@/lib/creative-review/types";
import { parseCreativeReview } from "@/lib/creative-review/validate";

export type CreativeReviewMutationConflict = {
  ok: false;
  code: "version_conflict";
  error: string;
  issues: ValidationIssue[];
  currentVersion: number;
};

export type CreativeReviewMutationFailure = {
  ok: false;
  code: "validation_failed";
  error: string;
  issues: ValidationIssue[];
};

export type CreativeReviewMutationSuccess = {
  ok: true;
  review: CreativeReview;
};

export type CreativeReviewMutationResult =
  | CreativeReviewMutationSuccess
  | CreativeReviewMutationConflict
  | CreativeReviewMutationFailure;

function conflict(currentVersion: number): CreativeReviewMutationConflict {
  return {
    ok: false,
    code: "version_conflict",
    error:
      "This package was modified by another editor. Refresh the page and try again.",
    issues: [
      {
        path: "$.version",
        message: `expected version ${currentVersion}, got a stale client revision`,
      },
    ],
    currentVersion,
  };
}

function assertExpectedVersion(
  current: CreativeReview,
  expectedVersion: number,
): CreativeReviewMutationConflict | null {
  if (current.version !== expectedVersion) {
    return conflict(current.version);
  }
  return null;
}

function validationFailure(
  error: string,
  issues: ValidationIssue[],
): CreativeReviewMutationFailure {
  return { ok: false, code: "validation_failed", error, issues };
}

function finalize(
  review: CreativeReview,
): ValidationResult<CreativeReview> {
  return parseCreativeReview(review);
}

export function commitCreativeReviewSave(args: {
  current: CreativeReview;
  expectedVersion: number;
  edits: CreativeReviewPackageEdits;
  actor: CreativeReviewActor;
  timestamp: string;
}): CreativeReviewMutationResult {
  const versionMismatch = assertExpectedVersion(
    args.current,
    args.expectedVersion,
  );
  if (versionMismatch) return versionMismatch;

  const applied = applyCreativeReviewEdits(args.current, args.edits);
  if (!applied.ok) {
    return validationFailure("Creative Review validation failed.", applied.issues);
  }

  const withHistory = appendCreativeReviewHistory({
    review: applied.value,
    event: "save",
    actor: args.actor,
    timestamp: args.timestamp,
  });
  const parsed = finalize(withHistory);
  if (!parsed.ok) {
    return validationFailure("Creative Review history is invalid.", parsed.issues);
  }
  return { ok: true, review: parsed.value };
}

/**
 * Persist refreshed English previews for voiceover + scenes.
 * Marks translation current (english_confirmed) and sets final_approved.
 * Called automatically after Save when Localized changed.
 */
export function commitCreativeReviewTranslate(args: {
  current: CreativeReview;
  expectedVersion: number;
  voiceover: CreativeReviewVoiceover;
  scenes: CreativeReviewScene[];
  actor: CreativeReviewActor;
  timestamp: string;
}): CreativeReviewMutationResult {
  const versionMismatch = assertExpectedVersion(
    args.current,
    args.expectedVersion,
  );
  if (versionMismatch) return versionMismatch;

  const preview = args.voiceover.english_preview?.trim() ?? "";
  if (!preview) {
    return validationFailure("English voiceover preview is empty.", [
      {
        path: "$.voiceover.english_preview",
        message: "english_preview must be a non-empty string",
      },
    ]);
  }
  if (!args.voiceover.localized_edit.trim()) {
    return validationFailure("Localized voiceover is empty.", [
      {
        path: "$.voiceover.localized_edit",
        message: "localized_edit is required before translation",
      },
    ]);
  }
  for (const scene of args.scenes) {
    if (!scene.intent.localized_edit.trim()) {
      return validationFailure("A scene is missing localized Creative Intent.", [
        {
          path: `$.scenes[id=${scene.id}].intent.localized_edit`,
          message: "localized_edit is required before translation",
        },
      ]);
    }
    if (!scene.intent.english_preview?.trim()) {
      return validationFailure("A scene is missing English Creative Intent preview.", [
        {
          path: `$.scenes[id=${scene.id}].intent.english_preview`,
          message: "english_preview must be a non-empty string",
        },
      ]);
    }
  }

  const voiceover = cloneVoiceover(args.voiceover);
  voiceover.english_preview = preview;
  voiceover.english_preview_outdated = false;
  voiceover.english_confirmed = true;
  voiceover.final_approved = voiceover.localized_edit;
  voiceover.translation_confirmed_at = args.timestamp;
  voiceover.translation_confirmed_by = args.actor.id;

  const scenes = cloneScenes(
    args.scenes.map((scene) => ({
      ...scene,
      intent: {
        ...scene.intent,
        english_preview_outdated: false,
      },
    })),
  );

  const next: CreativeReview = {
    ...args.current,
    approved: false,
    voiceover,
    scenes,
    status: computeCreativeReviewStatus({
      approved: false,
      voiceover,
      scenes,
    }),
  };

  const withHistory = appendCreativeReviewHistory({
    review: next,
    event: "translate",
    actor: args.actor,
    timestamp: args.timestamp,
  });
  const parsed = finalize(withHistory);
  if (!parsed.ok) {
    return validationFailure("Creative Review translation is invalid.", parsed.issues);
  }
  return { ok: true, review: parsed.value };
}

export function commitCreativeReviewApprove(args: {
  current: CreativeReview;
  expectedVersion: number;
  actor: CreativeReviewActor;
  timestamp: string;
}): CreativeReviewMutationResult {
  const versionMismatch = assertExpectedVersion(
    args.current,
    args.expectedVersion,
  );
  if (versionMismatch) return versionMismatch;

  const gate = validateCreativeReviewApproval(args.current);
  if (!gate.ok) {
    return validationFailure(
      "Package does not meet approval requirements.",
      gate.issues,
    );
  }

  const next: CreativeReview = {
    ...args.current,
    approved: true,
    status: "approved",
  };

  const withHistory = appendCreativeReviewHistory({
    review: next,
    event: "approve",
    actor: args.actor,
    timestamp: args.timestamp,
  });
  const parsed = finalize(withHistory);
  if (!parsed.ok) {
    return validationFailure("Creative Review approval is invalid.", parsed.issues);
  }
  return { ok: true, review: parsed.value };
}

export function commitCreativeReviewUnapprove(args: {
  current: CreativeReview;
  expectedVersion: number;
  actor: CreativeReviewActor;
  timestamp: string;
}): CreativeReviewMutationResult {
  const versionMismatch = assertExpectedVersion(
    args.current,
    args.expectedVersion,
  );
  if (versionMismatch) return versionMismatch;

  if (!args.current.approved) {
    return validationFailure("Package is not approved.", [
      {
        path: "$.approved",
        message: "package is not approved",
      },
    ]);
  }

  const next: CreativeReview = {
    ...args.current,
    approved: false,
    status: computeCreativeReviewStatus({
      approved: false,
      voiceover: args.current.voiceover,
      scenes: args.current.scenes,
    }),
  };

  const withHistory = appendCreativeReviewHistory({
    review: next,
    event: "unapprove",
    actor: args.actor,
    timestamp: args.timestamp,
  });
  const parsed = finalize(withHistory);
  if (!parsed.ok) {
    return validationFailure(
      "Creative Review unapproval is invalid.",
      parsed.issues,
    );
  }
  return { ok: true, review: parsed.value };
}
