/**
 * Seed a fully initialized Creative Review draft from a generated package.
 * Manual Review mode only — never partially initialized.
 */

import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import {
  cloneScenes,
  cloneVoiceover,
} from "@/lib/creative-review/lifecycle";
import { seedSceneIntentsFromPackage } from "@/lib/creative-review/sceneIntent/seedFromPackageScenes";
import {
  CREATIVE_REVIEW_SYSTEM_ACTOR,
  type CreativeReview,
  type CreativeReviewHistoryEntry,
  type CreativeReviewVoiceover,
} from "@/lib/creative-review/types";
import { assertCreativeReview } from "@/lib/creative-review/validate";

function buildSeedHistoryEntry(args: {
  version: number;
  timestamp: string;
  voiceover: CreativeReviewVoiceover;
  scenes: CreativeReview["scenes"];
}): CreativeReviewHistoryEntry {
  return {
    version: args.version,
    event: "seed",
    timestamp: args.timestamp,
    actor: { ...CREATIVE_REVIEW_SYSTEM_ACTOR },
    voiceover: cloneVoiceover(args.voiceover),
    scenes: cloneScenes(args.scenes),
    status: "draft",
    approved: false,
  };
}

export interface SeedCreativeReviewOptions {
  /** Override clock for deterministic tests. Defaults to Date.now(). */
  now?: () => Date;
}

/**
 * Build + validate the initial Creative Review draft for a Manual Review package.
 * Throws if the resulting object fails validation (should never happen for
 * well-formed packages with non-empty voiceover_text).
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
    english_confirmed: false,
    translation_confirmed_at: null,
    translation_confirmed_by: null,
    final_approved: voiceoverText,
  };

  const scenes = seedSceneIntentsFromPackage(pkg);

  const review: CreativeReview = {
    status: "draft",
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
      }),
    ],
  };

  return assertCreativeReview(review);
}
