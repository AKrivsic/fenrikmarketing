/**
 * Creative Review translation — Claude copywriting provider.
 *
 * Seed path (Manual Review):
 *   Original → Localized (Editor Language) → English Preview
 *
 * Save path:
 *   after Localized edits → refresh English Preview automatically
 *
 * Never uses browser locale. Never uses project language as editor target.
 */

import type { TextProvider } from "@/lib/ai/types";
import { getCopywritingProvider } from "@/lib/ai/index";
import { generateValidatedJson } from "@/lib/ai/runWithRepair";
import {
  vNonEmptyString,
  vObject,
  type Validator,
} from "@/lib/ai/validateAiOutput";
import { WorkflowError, type WorkflowResult } from "@/lib/ai/workflows/shared";
import {
  DEFAULT_EDITOR_LANGUAGE,
  editorLanguagePromptName,
  type EditorLanguageCode,
} from "@/lib/admin/editorLanguage";
import type {
  CreativeReview,
  CreativeReviewScene,
  CreativeReviewVoiceover,
} from "@/lib/creative-review/types";

const translateTextSchema = vObject({
  text: vNonEmptyString(),
}) as Validator<{ text: string }>;

function voiceoverSystem(targetName: string): string {
  return `You translate advertising voiceover copy into clear, natural ${targetName}.

Rules:
- Preserve meaning, tone, and persuasive intent.
- Keep the same approximate length and pacing.
- Do not add marketing claims that are not in the source.
- Do not wrap the result in quotes.
- Output JSON only: { "text": "..." }`;
}

function sceneIntentSystem(targetName: string): string {
  return `You translate Scene Creative Intent into clear, natural ${targetName}.

Rules:
- Preserve meaning and story purpose.
- Keep it short (1–2 sentences).
- Do not add camera or production jargon.
- Do not wrap the result in quotes.
- Output JSON only: { "text": "..." }`;
}

export interface TranslateCreativeReviewTextDeps {
  textProvider?: TextProvider;
}

async function translateTextToLanguage(args: {
  source: string;
  targetLanguage: EditorLanguageCode;
  system: string;
  stepName: string;
  inputSummary: string;
  textProvider: TextProvider;
}): Promise<WorkflowResult<{ text: string }>> {
  const source = args.source.trim();
  if (!source) {
    throw new WorkflowError(
      "invalid_input",
      "source text is required for translation",
    );
  }

  const targetName = editorLanguagePromptName(args.targetLanguage);
  const generated = await generateValidatedJson({
    textProvider: args.textProvider,
    system: args.system,
    prompt: [
      `Translate the following text into ${targetName}.`,
      "",
      "SOURCE:",
      source,
      "",
      `Return JSON: { "text": "<translated text in ${targetName}>" }`,
    ].join("\n"),
    validator: translateTextSchema,
    telemetry: {
      stepName: args.stepName,
      inputSummary: args.inputSummary,
    },
  });

  if (!generated.ok) {
    return {
      ok: false,
      error: "generation_failed",
      validationErrors: generated.validationErrors,
      attempts: generated.attempts,
    };
  }

  return {
    ok: true,
    data: { text: generated.value.text.trim() },
  };
}

async function localizeOrCopy(args: {
  source: string;
  sourceLanguage: string | null | undefined;
  targetLanguage: EditorLanguageCode;
  system: string;
  stepName: string;
  inputSummary: string;
  textProvider: TextProvider;
}): Promise<WorkflowResult<{ text: string }>> {
  const source = args.source.trim();
  if (!source) {
    throw new WorkflowError("invalid_input", "source text is required");
  }
  if (
    args.sourceLanguage &&
    args.sourceLanguage.toLowerCase() === args.targetLanguage
  ) {
    return { ok: true, data: { text: source } };
  }
  return translateTextToLanguage({
    source,
    targetLanguage: args.targetLanguage,
    system: args.system,
    stepName: args.stepName,
    inputSummary: args.inputSummary,
    textProvider: args.textProvider,
  });
}

/** @deprecated Prefer translateCreativeReviewForEditor */
export async function translateVoiceoverToEnglish(
  input: { localizedEdit: string },
  deps: TranslateCreativeReviewTextDeps = {},
): Promise<WorkflowResult<{ english: string }>> {
  const textProvider = deps.textProvider ?? getCopywritingProvider();
  const result = await translateTextToLanguage({
    source: input.localizedEdit,
    targetLanguage: "en",
    system: voiceoverSystem("English"),
    stepName: "Creative Review Voiceover Translation",
    inputSummary: "Translate localized_edit → english_preview",
    textProvider,
  });
  if (!result.ok) return result;
  return { ok: true, data: { english: result.data.text } };
}

/** @deprecated Prefer translateCreativeReviewForEditor */
export async function translateSceneIntentToEnglish(
  input: { localizedEdit: string },
  deps: TranslateCreativeReviewTextDeps = {},
): Promise<WorkflowResult<{ english: string }>> {
  const textProvider = deps.textProvider ?? getCopywritingProvider();
  const result = await translateTextToLanguage({
    source: input.localizedEdit,
    targetLanguage: "en",
    system: sceneIntentSystem("English"),
    stepName: "Creative Review Scene Intent Translation",
    inputSummary: "Translate scene localized_edit → english_preview",
    textProvider,
  });
  if (!result.ok) return result;
  return { ok: true, data: { english: result.data.text } };
}

export interface ApplyEnglishPreviewsResult {
  voiceover: CreativeReviewVoiceover;
  scenes: CreativeReviewScene[];
}

/**
 * Refresh English previews from current localized_edit (VO + scenes).
 * Used after Localized edits on save, and as the final seed step.
 */
export async function translateCreativeReviewEnglishPreviews(
  review: CreativeReview,
  deps: TranslateCreativeReviewTextDeps & { forceAll?: boolean } = {},
): Promise<WorkflowResult<ApplyEnglishPreviewsResult>> {
  const textProvider = deps.textProvider ?? getCopywritingProvider();
  const forceAll = deps.forceAll === true;

  const voiceoverNeedsUpdate =
    forceAll ||
    review.voiceover.english_preview_outdated ||
    !(review.voiceover.english_preview?.trim());

  let nextVoiceover: CreativeReviewVoiceover = {
    ...review.voiceover,
  };

  if (voiceoverNeedsUpdate) {
    const translated = await translateTextToLanguage({
      source: review.voiceover.localized_edit,
      targetLanguage: "en",
      system: voiceoverSystem("English"),
      stepName: "Creative Review Voiceover Translation",
      inputSummary: "Translate localized_edit → english_preview",
      textProvider,
    });
    if (!translated.ok) return translated;
    nextVoiceover = {
      ...nextVoiceover,
      english_preview: translated.data.text,
      english_preview_outdated: false,
    };
  }

  const nextScenes: CreativeReviewScene[] = [];
  for (const scene of review.scenes) {
    const needsUpdate =
      forceAll ||
      scene.intent.english_preview_outdated ||
      !(scene.intent.english_preview?.trim());
    if (!needsUpdate) {
      nextScenes.push(scene);
      continue;
    }
    const translated = await translateTextToLanguage({
      source: scene.intent.localized_edit,
      targetLanguage: "en",
      system: sceneIntentSystem("English"),
      stepName: "Creative Review Scene Intent Translation",
      inputSummary: "Translate scene localized_edit → english_preview",
      textProvider,
    });
    if (!translated.ok) return translated;
    nextScenes.push({
      ...scene,
      intent: {
        ...scene.intent,
        english_preview: translated.data.text,
        english_preview_outdated: false,
      },
    });
  }

  return {
    ok: true,
    data: { voiceover: nextVoiceover, scenes: nextScenes },
  };
}

export interface TranslateCreativeReviewForEditorDeps
  extends TranslateCreativeReviewTextDeps {
  editorLanguage: EditorLanguageCode;
  /** Package / project source language (ISO-639-1). Used to skip no-op copies. */
  sourceLanguage?: string | null;
}

/**
 * Full Manual Review seed translation:
 * Original → Localized (editor language) → English Preview.
 */
export async function translateCreativeReviewForEditor(
  review: CreativeReview,
  deps: TranslateCreativeReviewForEditorDeps,
): Promise<WorkflowResult<ApplyEnglishPreviewsResult>> {
  const textProvider = deps.textProvider ?? getCopywritingProvider();
  const editorLanguage = deps.editorLanguage ?? DEFAULT_EDITOR_LANGUAGE;
  const sourceLanguage = deps.sourceLanguage ?? null;
  const editorName = editorLanguagePromptName(editorLanguage);

  // Voiceover: Original → Localized
  const voLocalized = await localizeOrCopy({
    source: review.voiceover.original_ai,
    sourceLanguage,
    targetLanguage: editorLanguage,
    system: voiceoverSystem(editorName),
    stepName: "Creative Review Voiceover Localization",
    inputSummary: `Translate original_ai → localized_edit (${editorLanguage})`,
    textProvider,
  });
  if (!voLocalized.ok) return voLocalized;

  let englishPreview: string;
  if (editorLanguage === "en") {
    englishPreview = voLocalized.data.text;
  } else {
    const voEnglish = await translateTextToLanguage({
      source: voLocalized.data.text,
      targetLanguage: "en",
      system: voiceoverSystem("English"),
      stepName: "Creative Review Voiceover Translation",
      inputSummary: "Translate localized_edit → english_preview",
      textProvider,
    });
    if (!voEnglish.ok) return voEnglish;
    englishPreview = voEnglish.data.text;
  }

  const nextVoiceover: CreativeReviewVoiceover = {
    ...review.voiceover,
    localized_edit: voLocalized.data.text,
    english_preview: englishPreview,
    english_preview_outdated: false,
  };

  const nextScenes: CreativeReviewScene[] = [];
  for (const scene of review.scenes) {
    const localized = await localizeOrCopy({
      source: scene.intent.original,
      sourceLanguage,
      targetLanguage: editorLanguage,
      system: sceneIntentSystem(editorName),
      stepName: "Creative Review Scene Intent Localization",
      inputSummary: `Translate scene original → localized_edit (${editorLanguage})`,
      textProvider,
    });
    if (!localized.ok) return localized;

    let sceneEnglish: string;
    if (editorLanguage === "en") {
      sceneEnglish = localized.data.text;
    } else {
      const translated = await translateTextToLanguage({
        source: localized.data.text,
        targetLanguage: "en",
        system: sceneIntentSystem("English"),
        stepName: "Creative Review Scene Intent Translation",
        inputSummary: "Translate scene localized_edit → english_preview",
        textProvider,
      });
      if (!translated.ok) return translated;
      sceneEnglish = translated.data.text;
    }

    nextScenes.push({
      ...scene,
      intent: {
        ...scene.intent,
        localized_edit: localized.data.text,
        english_preview: sceneEnglish,
        english_preview_outdated: false,
      },
    });
  }

  return {
    ok: true,
    data: { voiceover: nextVoiceover, scenes: nextScenes },
  };
}

/** @deprecated Use TranslateCreativeReviewTextDeps */
export type TranslateVoiceoverToEnglishDeps = TranslateCreativeReviewTextDeps;
/** @deprecated */
export type TranslateVoiceoverToEnglishResult = { english: string };
