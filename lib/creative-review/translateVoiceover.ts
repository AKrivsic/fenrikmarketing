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
import {
  czechWorkingCopyChanged,
  resolveMeaningSafeEnglish,
} from "@/lib/creative-review/meaningSafeEnglish";
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
  /**
   * T2V English production: original_ai is authority. CS→EN only when the
   * operator actually edited Czech. No extra evaluator request.
   */
  meaningSafeFromOriginal?: boolean;
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

async function translateOperatorCsChangeToEnglish(args: {
  originalEn: string;
  originalCs: string;
  editedCs: string;
  textProvider: TextProvider;
}): Promise<WorkflowResult<{ text: string }>> {
  const generated = await generateValidatedJson({
    textProvider: args.textProvider,
    system: `You update English advertising voiceover to reflect ONLY the operator's Czech edit.

Rules:
- original_en is the production English.
- original_cs is the working Czech before the edit.
- edited_cs is what the operator changed.
- Transfer only the real operator change into English.
- Keep meaning-stable terms identical. If original_en says "still hiring", the result MUST say "still hiring" — never "still open".
- Do not add claims. Do not wrap in quotes.
- Output JSON only: { "text": "..." }`,
    prompt: [
      "ORIGINAL_EN:",
      args.originalEn,
      "",
      "ORIGINAL_CS:",
      args.originalCs,
      "",
      "EDITED_CS:",
      args.editedCs,
      "",
      'Return JSON: { "text": "<updated English>" }',
    ].join("\n"),
    validator: translateTextSchema,
    telemetry: {
      stepName: "Creative Review Meaning-Safe English",
      inputSummary: "Transfer operator CS edit onto original_en",
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
  return { ok: true, data: { text: generated.value.text.trim() } };
}

function originalCzechVoiceover(review: CreativeReview): string {
  const seed = review.history.find((entry) => entry.event === "seed");
  return seed?.voiceover.localized_edit?.trim() || review.voiceover.localized_edit;
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
  const meaningSafe = deps.meaningSafeFromOriginal === true;

  const voiceoverNeedsUpdate =
    forceAll ||
    review.voiceover.english_preview_outdated ||
    !(review.voiceover.english_preview?.trim());

  let nextVoiceover: CreativeReviewVoiceover = {
    ...review.voiceover,
  };

  if (voiceoverNeedsUpdate) {
    if (meaningSafe) {
      const originalCs = originalCzechVoiceover(review);
      const czechChanged = czechWorkingCopyChanged({
        originalCs,
        currentCs: review.voiceover.localized_edit,
      });
      let translatedEn: string | null = null;
      if (czechChanged) {
        const translated = await translateOperatorCsChangeToEnglish({
          originalEn: review.voiceover.original_ai,
          originalCs,
          editedCs: review.voiceover.localized_edit,
          textProvider,
        });
        if (!translated.ok) return translated;
        translatedEn = translated.data.text;
      }
      const resolved = resolveMeaningSafeEnglish({
        originalEn: review.voiceover.original_ai,
        originalCs,
        currentCs: review.voiceover.localized_edit,
        translatedEn,
      });
      nextVoiceover = {
        ...nextVoiceover,
        english_preview: resolved.production_en,
        english_preview_outdated: false,
        meaning_review_required: resolved.meaning_review_required,
        meaning_warnings: resolved.warnings,
        source_en_fingerprint: resolved.fingerprints.source_en_fingerprint,
        source_cs_fingerprint: resolved.fingerprints.source_cs_fingerprint,
        current_cs_fingerprint: resolved.fingerprints.current_cs_fingerprint,
        production_en_fingerprint: resolved.fingerprints.production_en_fingerprint,
      };
    } else {
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
    if (meaningSafe) {
      nextScenes.push({
        ...scene,
        intent: {
          ...scene.intent,
          english_preview: scene.intent.original,
          english_preview_outdated: false,
        },
      });
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
  if (deps.meaningSafeFromOriginal || editorLanguage === "en") {
    englishPreview = deps.meaningSafeFromOriginal
      ? review.voiceover.original_ai
      : voLocalized.data.text;
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

  const meaning = deps.meaningSafeFromOriginal
    ? resolveMeaningSafeEnglish({
        originalEn: review.voiceover.original_ai,
        originalCs: voLocalized.data.text,
        currentCs: voLocalized.data.text,
        translatedEn: null,
      })
    : null;

  const nextVoiceover: CreativeReviewVoiceover = {
    ...review.voiceover,
    localized_edit: voLocalized.data.text,
    english_preview: englishPreview,
    english_preview_outdated: false,
    ...(meaning
      ? {
          meaning_review_required: false,
          meaning_warnings: [],
          source_en_fingerprint: meaning.fingerprints.source_en_fingerprint,
          source_cs_fingerprint: meaning.fingerprints.source_cs_fingerprint,
          current_cs_fingerprint: meaning.fingerprints.current_cs_fingerprint,
          production_en_fingerprint: meaning.fingerprints.production_en_fingerprint,
        }
      : {}),
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
    if (deps.meaningSafeFromOriginal) {
      sceneEnglish = scene.intent.original;
    } else if (editorLanguage === "en") {
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
