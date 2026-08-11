/**
 * Seed / build a fully initialized Creative Review draft from a generated package.
 * Manual Review mode only — never partially initialized.
 *
 * Production path: buildManualReviewCreativeReview
 *   (AI Scene Intent → localize to Editor Language → English Preview).
 * Sync seedCreativeReviewFromPackage remains for unit tests / structural shells.
 */

import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import type { TextProvider } from "@/lib/ai/types";
import {
  DEFAULT_EDITOR_LANGUAGE,
  parseEditorLanguage,
  type EditorLanguageCode,
} from "@/lib/admin/editorLanguage";
import {
  cloneScenes,
  cloneVoiceover,
  computeCreativeReviewStatus,
} from "@/lib/creative-review/lifecycle";
import { generateSceneCreativeIntents } from "@/lib/creative-review/sceneIntent/generateSceneIntents";
import { seedSceneIntentsFromPackage } from "@/lib/creative-review/sceneIntent/seedFromPackageScenes";
import { translateCreativeReviewForEditor } from "@/lib/creative-review/translateVoiceover";
import {
  CREATIVE_REVIEW_SYSTEM_ACTOR,
  type CreativeReview,
  type CreativeReviewHistoryEntry,
  type CreativeReviewScene,
  type CreativeReviewVoiceover,
} from "@/lib/creative-review/types";
import { assertCreativeReview } from "@/lib/creative-review/validate";
import { WorkflowError } from "@/lib/ai/workflows/shared";

function buildSeedHistoryEntry(args: {
  version: number;
  timestamp: string;
  voiceover: CreativeReviewVoiceover;
  scenes: CreativeReview["scenes"];
  status: CreativeReview["status"];
  approved: boolean;
}): CreativeReviewHistoryEntry {
  return {
    version: args.version,
    event: "seed",
    timestamp: args.timestamp,
    actor: { ...CREATIVE_REVIEW_SYSTEM_ACTOR },
    voiceover: cloneVoiceover(args.voiceover),
    scenes: cloneScenes(args.scenes),
    status: args.status,
    approved: args.approved,
  };
}

export interface SeedCreativeReviewOptions {
  /** Override clock for deterministic tests. Defaults to Date.now(). */
  now?: () => Date;
  /** Optional pre-built scenes (skips provisional seedFromPackageScenes). */
  scenes?: CreativeReviewScene[];
}

/**
 * Build a structural Creative Review draft (no AI translation).
 * Prefer buildManualReviewCreativeReview for Manual Review persistence.
 */
export function seedCreativeReviewFromPackage(
  pkg: Pick<
    ContentPackageOutput,
    "voiceover_text" | "visual_scenes" | "image_prompts"
  >,
  options: SeedCreativeReviewOptions = {},
): CreativeReview {
  const voiceoverText = pkg.voiceover_text?.trim();
  if (!voiceoverText) {
    throw new Error(
      "cannot seed creative_review: package voiceover_text is required",
    );
  }

  const now = options.now ?? (() => new Date());
  const timestamp = now().toISOString();
  const version = 1;

  const voiceover: CreativeReviewVoiceover = {
    original_ai: voiceoverText,
    localized_edit: voiceoverText,
    english_preview: null,
    english_preview_outdated: true,
    english_confirmed: false,
    translation_confirmed_at: null,
    translation_confirmed_by: null,
    final_approved: "",
  };

  const scenes = options.scenes ?? seedSceneIntentsFromPackage(pkg);

  const status = computeCreativeReviewStatus({
    approved: false,
    voiceover,
    scenes,
  });

  const review: CreativeReview = {
    status,
    version,
    approved: false,
    voiceover,
    scenes,
    history: [
      buildSeedHistoryEntry({
        version,
        timestamp,
        voiceover,
        scenes,
        status,
        approved: false,
      }),
    ],
  };

  return assertCreativeReview(review);
}

export interface BuildManualReviewCreativeReviewDeps {
  textProvider?: TextProvider;
  now?: () => Date;
  /** Admin Editor Language preference stamped on the production run. */
  editorLanguage?: EditorLanguageCode;
  /** Project / package source language (ISO-639-1). */
  sourceLanguage?: string | null;
}

/**
 * Full Manual Review seed used at package persist:
 * AI Scene Intent → Localized (Editor Language) → English Preview.
 * Must complete before waiting_for_creative_review.
 */
export async function buildManualReviewCreativeReview(
  pkg: Pick<
    ContentPackageOutput,
    | "voiceover_text"
    | "visual_scenes"
    | "image_prompts"
    | "title"
    | "hook"
  >,
  deps: BuildManualReviewCreativeReviewDeps = {},
): Promise<CreativeReview> {
  const voiceoverText = pkg.voiceover_text?.trim();
  if (!voiceoverText) {
    throw new WorkflowError(
      "invalid_input",
      "cannot seed creative_review: package voiceover_text is required",
    );
  }

  const now = deps.now ?? (() => new Date());
  const timestamp = now().toISOString();
  const editorLanguage = parseEditorLanguage(
    deps.editorLanguage,
    DEFAULT_EDITOR_LANGUAGE,
  );

  const intents = await generateSceneCreativeIntents(pkg, {
    textProvider: deps.textProvider,
  });
  if (!intents.ok) {
    throw new Error("Scene Creative Intent generation failed");
  }

  const draft = seedCreativeReviewFromPackage(pkg, {
    now,
    scenes: intents.data.scenes,
  });

  const translated = await translateCreativeReviewForEditor(draft, {
    textProvider: deps.textProvider,
    editorLanguage,
    sourceLanguage: deps.sourceLanguage,
  });
  if (!translated.ok) {
    throw new Error(
      "Creative Review automatic Editor Language translation failed",
    );
  }

  const voiceover: CreativeReviewVoiceover = {
    ...translated.data.voiceover,
    english_preview_outdated: false,
    english_confirmed: true,
    translation_confirmed_at: timestamp,
    translation_confirmed_by: CREATIVE_REVIEW_SYSTEM_ACTOR.id,
    final_approved: translated.data.voiceover.localized_edit,
  };

  const scenes = translated.data.scenes.map((scene) => ({
    ...scene,
    intent: {
      ...scene.intent,
      english_preview_outdated: false,
    },
  }));

  const status = computeCreativeReviewStatus({
    approved: false,
    voiceover,
    scenes,
  });

  const review: CreativeReview = {
    status,
    version: 1,
    approved: false,
    voiceover,
    scenes,
    history: [
      buildSeedHistoryEntry({
        version: 1,
        timestamp,
        voiceover,
        scenes,
        status,
        approved: false,
      }),
    ],
  };

  return assertCreativeReview(review);
}
