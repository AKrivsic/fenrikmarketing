import type { OpenAiTtsVoice } from "@/lib/voice/openaiTtsVoices";
import {
  elevenLabsVoiceMapHasAny,
  readElevenLabsVoiceMap,
  readElevenLabsVoiceMapForLanguage,
  type ElevenLabsVoiceMap,
  type ElevenLabsVoiceMapLanguage,
} from "@/lib/elevenlabs/config";

export type ElevenLabsVoiceGenderHint = "female" | "male" | "neutral";

const FEMALE_OPENAI_VOICES = new Set<OpenAiTtsVoice>([
  "shimmer",
  "nova",
  "coral",
  "ballad",
  "marin",
]);

const MALE_OPENAI_VOICES = new Set<OpenAiTtsVoice>([
  "onyx",
  "echo",
  "ash",
  "cedar",
  "fable",
  "verse",
]);

export function genderHintFromOpenAiVoice(
  voice: OpenAiTtsVoice,
): ElevenLabsVoiceGenderHint {
  if (FEMALE_OPENAI_VOICES.has(voice)) return "female";
  if (MALE_OPENAI_VOICES.has(voice)) return "male";
  return "neutral";
}

export interface ResolvedElevenLabsVoice {
  voiceId: string;
  diagnostic: string;
  genderHint: ElevenLabsVoiceGenderHint;
  language?: ElevenLabsVoiceMapLanguage;
  source: "language_map" | "legacy_global";
}

function pickBucketId(
  map: ElevenLabsVoiceMap,
  hint: ElevenLabsVoiceGenderHint,
): string | null {
  if (hint === "female") return map.female;
  if (hint === "male") return map.male;
  return map.default;
}

/**
 * Resolve ElevenLabs Voice ID from stored OpenAI voice + optional language.
 * When `language` is set: prefer `ELEVENLABS_VOICE_ID_{LANG}_*`, then legacy
 * global `ELEVENLABS_VOICE_ID_*` (diagnostic marks legacy). Never cross languages.
 */
export function resolveElevenLabsVoiceId(args: {
  openAiSelectedVoice: OpenAiTtsVoice;
  language?: ElevenLabsVoiceMapLanguage;
  voiceMap?: ElevenLabsVoiceMap;
  legacyVoiceMap?: ElevenLabsVoiceMap;
}): ResolvedElevenLabsVoice | null {
  const hint = genderHintFromOpenAiVoice(args.openAiSelectedVoice);

  if (args.language) {
    const langMap =
      args.voiceMap ?? readElevenLabsVoiceMapForLanguage(args.language);
    const langId = pickBucketId(langMap, hint);
    if (langId) {
      const bucket =
        hint === "neutral" ? "default" : hint;
      return {
        voiceId: langId,
        genderHint: hint,
        language: args.language,
        source: "language_map",
        diagnostic: `${args.language} ${bucket} voice (mapped from OpenAI ${args.openAiSelectedVoice})`,
      };
    }

    const legacy = args.legacyVoiceMap ?? readElevenLabsVoiceMap();
    const legacyId = pickBucketId(legacy, hint);
    if (legacyId && elevenLabsVoiceMapHasAny(legacy)) {
      const bucket = hint === "neutral" ? "default" : hint;
      return {
        voiceId: legacyId,
        genderHint: hint,
        language: args.language,
        source: "legacy_global",
        diagnostic: `legacy_global ${bucket} voice for language=${args.language} (OpenAI ${args.openAiSelectedVoice}; language-specific Voice ID missing)`,
      };
    }
    return null;
  }

  // No language: explicit voiceMap or legacy global only (still / tests).
  const map = args.voiceMap ?? readElevenLabsVoiceMap();
  const id = pickBucketId(map, hint);
  if (!id) return null;
  const bucket = hint === "neutral" ? "default" : hint;
  return {
    voiceId: id,
    genderHint: hint,
    source: "legacy_global",
    diagnostic: `${bucket} voice (mapped from OpenAI ${args.openAiSelectedVoice})`,
  };
}
