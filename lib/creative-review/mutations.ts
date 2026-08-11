/**
 * Pure Creative Review mutations (save / translate / confirm / approve).
 *
 * Every successful mutation bumps version and appends an immutable history
 * entry. Optimistic concurrency is enforced via expectedVersion.
 */

import type { ValidationIssue, ValidationResult } from "@/lib/ai/validateAiOutput";
import {
  applyCreativeReviewEdits,
  type CreativeReviewPackageEdits,
} from "@/lib/creative-review/applyEdits";
import {
  appendCreativeReviewHistory,
  cloneVoiceover,
  computeCreativeReviewStatus,
  validateCreativeReviewApproval,
} from "@/lib/creative-review/lifecycle";
import type {
  CreativeReview,
  CreativeReviewActor,
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
      "Balíček byl mezitím upraven jiným editorem. Obnovte stránku a zkuste znovu.",
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
    return validationFailure("Validace Creative Review selhala.", applied.issues);
  }

  const withHistory = appendCreativeReviewHistory({
    review: applied.value,
    event: "save",
    actor: args.actor,
    timestamp: args.timestamp,
  });
  const parsed = finalize(withHistory);
  if (!parsed.ok) {
    return validationFailure("Historie Creative Review je neplatná.", parsed.issues);
  }
  return { ok: true, review: parsed.value };
}

export function commitCreativeReviewTranslate(args: {
  current: CreativeReview;
  expectedVersion: number;
  englishPreview: string;
  actor: CreativeReviewActor;
  timestamp: string;
}): CreativeReviewMutationResult {
  const versionMismatch = assertExpectedVersion(
    args.current,
    args.expectedVersion,
  );
  if (versionMismatch) return versionMismatch;

  const preview = args.englishPreview.trim();
  if (!preview) {
    return validationFailure("Anglický překlad je prázdný.", [
      {
        path: "$.voiceover.english_preview",
        message: "english_preview must be a non-empty string",
      },
    ]);
  }
  if (!args.current.voiceover.localized_edit.trim()) {
    return validationFailure("Localized voiceover je prázdný.", [
      {
        path: "$.voiceover.localized_edit",
        message: "localized_edit is required before translation",
      },
    ]);
  }

  const voiceover = cloneVoiceover(args.current.voiceover);
  voiceover.english_preview = preview;
  // Explicit Translate never silently confirms.
  voiceover.english_confirmed = false;
  voiceover.translation_confirmed_at = null;
  voiceover.translation_confirmed_by = null;

  const next: CreativeReview = {
    ...args.current,
    approved: false,
    voiceover,
    status: computeCreativeReviewStatus({
      approved: false,
      voiceover,
      scenes: args.current.scenes,
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
    return validationFailure("Překlad Creative Review je neplatný.", parsed.issues);
  }
  return { ok: true, review: parsed.value };
}

export function commitCreativeReviewConfirmTranslation(args: {
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

  const preview = args.current.voiceover.english_preview?.trim() ?? "";
  if (!preview) {
    return validationFailure(
      "Nejdřív spusťte překlad (Confirm Translation).",
      [
        {
          path: "$.voiceover.english_preview",
          message: "english_preview is required before confirming translation",
        },
      ],
    );
  }
  if (!args.current.voiceover.localized_edit.trim()) {
    return validationFailure("Localized voiceover je prázdný.", [
      {
        path: "$.voiceover.localized_edit",
        message: "localized_edit is required before confirming translation",
      },
    ]);
  }

  const voiceover = cloneVoiceover(args.current.voiceover);
  voiceover.english_confirmed = true;
  voiceover.final_approved = voiceover.localized_edit;
  voiceover.translation_confirmed_at = args.timestamp;
  voiceover.translation_confirmed_by = args.actor.id;

  const next: CreativeReview = {
    ...args.current,
    // Confirming translation does not auto-approve the package.
    approved: false,
    voiceover,
    status: computeCreativeReviewStatus({
      approved: false,
      voiceover,
      scenes: args.current.scenes,
    }),
  };

  const withHistory = appendCreativeReviewHistory({
    review: next,
    event: "confirm_translation",
    actor: args.actor,
    timestamp: args.timestamp,
  });
  const parsed = finalize(withHistory);
  if (!parsed.ok) {
    return validationFailure(
      "Potvrzení překladu Creative Review je neplatné.",
      parsed.issues,
    );
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
      "Balíček nesplňuje podmínky pro schválení.",
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
    return validationFailure("Schválení Creative Review je neplatné.", parsed.issues);
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
    return validationFailure("Balíček není schválený.", [
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
      "Zrušení schválení Creative Review je neplatné.",
      parsed.issues,
    );
  }
  return { ok: true, review: parsed.value };
}
