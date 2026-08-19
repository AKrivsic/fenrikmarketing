import type { OpenAiTtsVoice } from "@/lib/voice/openaiTtsVoices";
import {
  readElevenLabsVoiceMap,
  type ElevenLabsVoiceMap,
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
}

export function resolveElevenLabsVoiceId(args: {
  openAiSelectedVoice: OpenAiTtsVoice;
  voiceMap?: ElevenLabsVoiceMap;
}): ResolvedElevenLabsVoice | null {
  const map = args.voiceMap ?? readElevenLabsVoiceMap();
  const hint = genderHintFromOpenAiVoice(args.openAiSelectedVoice);
  if (hint === "female") {
    if (!map.female) return null;
    return {
      voiceId: map.female,
      genderHint: hint,
      diagnostic: `female voice (mapped from OpenAI ${args.openAiSelectedVoice})`,
    };
  }
  if (hint === "male") {
    if (!map.male) return null;
    return {
      voiceId: map.male,
      genderHint: hint,
      diagnostic: `male voice (mapped from OpenAI ${args.openAiSelectedVoice})`,
    };
  }
  if (!map.default) return null;
  return {
    voiceId: map.default,
    genderHint: hint,
    diagnostic: `default voice (OpenAI ${args.openAiSelectedVoice})`,
  };
}
