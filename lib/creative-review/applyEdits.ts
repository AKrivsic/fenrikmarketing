/**
 * Apply Phase 3/4 Creative Review edits onto an existing draft.
 *
 * Allowed mutations only:
 * - voiceover.localized_edit
 * - scenes[].intent.description
 * - scenes[].director_notes
 *
 * When localized_edit changes, translation confirmation is invalidated
 * (english_confirmed cleared). Approval is cleared when any editable content
 * changes. Version / history are NOT bumped here — the save mutation commits
 * history + version atomically.
 */

import type { ValidationIssue, ValidationResult } from "@/lib/ai/validateAiOutput";
import {
  cloneScenes,
  cloneVoiceover,
  computeCreativeReviewStatus,
  invalidateTranslationAfterEdit,
} from "@/lib/creative-review/lifecycle";
import type { CreativeReview } from "@/lib/creative-review/types";
import { parseCreativeReview } from "@/lib/creative-review/validate";

export interface CreativeReviewSceneEdit {
  id: string;
  intentDescription: string;
  directorNotes: string;
}

export interface CreativeReviewPackageEdits {
  voiceoverLocalizedEdit: string;
  scenes: CreativeReviewSceneEdit[];
}

/**
 * Merge allowed edits into `current`. Returns validation failure when:
 * - scene id sets diverge (add/remove/reorder ids)
 * - resulting object fails Creative Review schema validation
 */
export function applyCreativeReviewEdits(
  current: CreativeReview,
  edits: CreativeReviewPackageEdits,
): ValidationResult<CreativeReview> {
  const editById = new Map(edits.scenes.map((scene) => [scene.id, scene]));
  const structuralIssues: ValidationIssue[] = [];

  if (editById.size !== edits.scenes.length) {
    structuralIssues.push({
      path: "$.scenes",
      message: "duplicate scene id in edit payload",
    });
  }

  if (editById.size !== current.scenes.length) {
    structuralIssues.push({
      path: "$.scenes",
      message: `expected ${current.scenes.length} scene edit(s), got ${edits.scenes.length}`,
    });
  }

  for (const scene of current.scenes) {
    if (!editById.has(scene.id)) {
      structuralIssues.push({
        path: `$.scenes[id=${scene.id}]`,
        message: "missing scene edit for existing scene",
      });
    }
  }
  for (const edit of edits.scenes) {
    if (!current.scenes.some((scene) => scene.id === edit.id)) {
      structuralIssues.push({
        path: `$.scenes[id=${edit.id}]`,
        message: "unknown scene id",
      });
    }
  }

  if (structuralIssues.length > 0) {
    return { ok: false, issues: structuralIssues };
  }

  const nextScenes = current.scenes.map((scene) => {
    const edit = editById.get(scene.id)!;
    return {
      ...scene,
      director_notes: edit.directorNotes,
      intent: {
        ...scene.intent,
        description: edit.intentDescription,
      },
    };
  });

  const localizedChanged =
    edits.voiceoverLocalizedEdit !== current.voiceover.localized_edit;
  const scenesChanged = nextScenes.some((scene, index) => {
    const prev = current.scenes[index]!;
    return (
      scene.intent.description !== prev.intent.description ||
      scene.director_notes !== prev.director_notes
    );
  });
  const contentChanged = localizedChanged || scenesChanged;

  let nextVoiceover = cloneVoiceover(current.voiceover);
  nextVoiceover.localized_edit = edits.voiceoverLocalizedEdit;
  if (localizedChanged) {
    nextVoiceover = invalidateTranslationAfterEdit(nextVoiceover);
    nextVoiceover.localized_edit = edits.voiceoverLocalizedEdit;
  }

  const nextApproved = contentChanged ? false : current.approved;
  const next: CreativeReview = {
    status: computeCreativeReviewStatus({
      approved: nextApproved,
      voiceover: nextVoiceover,
      scenes: nextScenes,
    }),
    version: current.version,
    approved: nextApproved,
    voiceover: nextVoiceover,
    scenes: cloneScenes(nextScenes),
    history: current.history.map((entry) => ({
      ...entry,
      actor: { ...entry.actor },
      voiceover: cloneVoiceover(entry.voiceover),
      scenes: cloneScenes(entry.scenes),
    })),
  };

  return parseCreativeReview(next);
}
