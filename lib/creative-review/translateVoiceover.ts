/**
 * Translate Creative Review localized voiceover → English preview.
 *
 * Explicit request only — never called on page load. Persists via the
 * translate mutation after this helper returns.
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

const translateVoiceoverSchema = vObject({
  english: vNonEmptyString(),
}) as Validator<{ english: string }>;

const TRANSLATE_VOICEOVER_SYSTEM = `You translate advertising voiceover copy into clear, natural English.

Rules:
- Preserve meaning, tone, and persuasive intent.
- Keep the same approximate length and pacing.
- Do not add marketing claims that are not in the source.
- Do not wrap the result in quotes.
- Output JSON only: { "english": "..." }`;

export interface TranslateVoiceoverToEnglishDeps {
  textProvider?: TextProvider;
}

export interface TranslateVoiceoverToEnglishResult {
  english: string;
}

/**
 * Translate localized_edit text into English for Creative Review verification.
 */
export async function translateVoiceoverToEnglish(
  input: { localizedEdit: string },
  deps: TranslateVoiceoverToEnglishDeps = {},
): Promise<WorkflowResult<TranslateVoiceoverToEnglishResult>> {
  const source = input.localizedEdit.trim();
  if (!source) {
    throw new WorkflowError(
      "invalid_input",
      "localized voiceover is required for translation",
    );
  }

  const textProvider = deps.textProvider ?? getCopywritingProvider();

  const generated = await generateValidatedJson({
    textProvider,
    system: TRANSLATE_VOICEOVER_SYSTEM,
    prompt: [
      "Translate the following voiceover into English.",
      "",
      "SOURCE VOICEOVER:",
      source,
      "",
      'Return JSON: { "english": "<translated voiceover>" }',
    ].join("\n"),
    validator: translateVoiceoverSchema,
    telemetry: {
      stepName: "Creative Review Voiceover Translation",
      inputSummary: "Translate localized_edit → english_preview",
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
    data: { english: generated.value.english.trim() },
  };
}
