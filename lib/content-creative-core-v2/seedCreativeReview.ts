/**
 * Seed Manual Review Creative Review from Creative Core v2.
 * No Scene Intent LLM — scenes derive from Core. Localization only.
 */

import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
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
import { translateCreativeReviewForEditor } from "@/lib/creative-review/translateVoiceover";
import {
  CREATIVE_REVIEW_SYSTEM_ACTOR,
  type CreativeReview,
  type CreativeReviewHistoryEntry,
  type CreativeReviewScene,
  type CreativeReviewVoiceover,
  type SceneCreativeIntent,
} from "@/lib/creative-review/types";
import { assertCreativeReview } from "@/lib/creative-review/validate";
import { WorkflowError } from "@/lib/ai/workflows/shared";
import type { ContentCreativeCoreV2 } from "@/lib/content-creative-core-v2/types";

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

/** Derive CR scenes from Core — intent text = visual event + action (no AI rewrite). */
export function seedCreativeReviewScenesFromCore(
  core: ContentCreativeCoreV2,
): CreativeReviewScene[] {
  return [...core.scenes]
    .sort((a, b) => a.order - b.order)
    .map((scene, index) => {
      const intentText = [scene.visual_event, scene.action, scene.motion_or_change]
        .filter(Boolean)
        .join(" ");
      const intent: SceneCreativeIntent = {
        original: intentText,
        localized_edit: intentText,
        english_preview: intentText,
        english_preview_outdated: false,
        presentation_type: null,
        visual_source: "generated",
        asset_id: null,
        used_as: null,
      };
      return {
        id: scene.scene_id,
        index,
        intent,
        director_notes: scene.sound_intent || "",
      };
    });
}

export async function buildManualReviewCreativeReviewFromCore(args: {
  pkg: Pick<ContentPackageOutput, "voiceover_text" | "hook">;
  core: ContentCreativeCoreV2;
  editorLanguage?: EditorLanguageCode | string | null;
  sourceLanguage?: string | null;
  now?: () => Date;
}): Promise<CreativeReview> {
  const voiceoverText =
    args.core.voiceover.trim() || args.pkg.voiceover_text?.trim() || "";
  if (!voiceoverText) {
    throw new WorkflowError(
      "invalid_input",
      "cannot seed creative_review from core: voiceover required",
    );
  }

  const now = args.now ?? (() => new Date());
  const timestamp = now().toISOString();
  const version = 1;
  const voiceover: CreativeReviewVoiceover = {
    original_ai: voiceoverText,
    localized_edit: voiceoverText,
    english_preview: voiceoverText,
    english_preview_outdated: false,
    english_confirmed: true,
    translation_confirmed_at: timestamp,
    translation_confirmed_by: "system",
    final_approved: "",
  };

  const scenes = seedCreativeReviewScenesFromCore(args.core);
  const status = computeCreativeReviewStatus({
    approved: false,
    voiceover,
    scenes,
  });

  let draft: CreativeReview = {
    version,
    status,
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

  const editorLanguage = parseEditorLanguage(
    args.editorLanguage,
    DEFAULT_EDITOR_LANGUAGE,
  );

  // Skip localization round-trip when editor language is already English.
  if (editorLanguage !== "en") {
    try {
      const translated = await translateCreativeReviewForEditor(draft, {
        editorLanguage,
        sourceLanguage: args.sourceLanguage ?? "en",
        meaningSafeFromOriginal: true,
      });
      if (!translated.ok) {
        throw new Error(
          "Creative Review localization failed for Creative Core v2",
        );
      }
      // Restore production EN from original_ai (no CS→EN rewrite at seed).
      draft = {
        ...draft,
        voiceover: {
          ...translated.data.voiceover,
          english_preview: draft.voiceover.original_ai,
          english_preview_outdated: false,
          english_confirmed: true,
        },
        scenes: translated.data.scenes.map((scene) => ({
          ...scene,
          intent: {
            ...scene.intent,
            english_preview: scene.intent.original,
            english_preview_outdated: false,
          },
        })),
      };
    } catch (err) {
      throw new Error(
        err instanceof Error
          ? err.message
          : "Creative Review localization failed for Creative Core v2",
      );
    }
  }

  draft = {
    ...draft,
    status: computeCreativeReviewStatus({
      approved: false,
      voiceover: draft.voiceover,
      scenes: draft.scenes,
    }),
  };

  assertCreativeReview(draft);
  return draft;
}
