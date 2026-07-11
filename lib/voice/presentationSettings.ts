import type { Json } from "@/lib/supabase/types";
import {
  DEFAULT_OPENAI_TTS_VOICE,
  isOpenAiTtsVoice,
  OPENAI_TTS_VOICES,
  type OpenAiTtsVoice,
} from "@/lib/voice/openaiTtsVoices";
import {
  parseKnowledgePresentation,
  type KnowledgePresentation,
} from "@/lib/voice/knowledgePresentation";

export const VOICE_UI_DEFAULT = "";
export const VOICE_UI_AUTO = "auto";

export type VoiceUiSelection = typeof VOICE_UI_DEFAULT | typeof VOICE_UI_AUTO | OpenAiTtsVoice;

const MAX_TTS_INSTRUCTIONS_LENGTH = 500;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function voiceUiSelectionFromKnowledge(
  knowledge: Json | null | undefined,
): VoiceUiSelection {
  const presentation = parseKnowledgePresentation(knowledge);
  const pref = presentation.preferred_voice?.trim().toLowerCase();
  if (!pref || pref === DEFAULT_OPENAI_TTS_VOICE) return VOICE_UI_DEFAULT;
  if (pref === VOICE_UI_AUTO) return VOICE_UI_AUTO;
  if (isOpenAiTtsVoice(pref)) return pref;
  return VOICE_UI_DEFAULT;
}

export function ttsInstructionsFromKnowledge(
  knowledge: Json | null | undefined,
): string {
  const presentation = parseKnowledgePresentation(knowledge);
  return presentation.tts_instructions?.trim() ?? "";
}

export function isVoiceUiSelection(value: string): value is VoiceUiSelection {
  if (value === VOICE_UI_DEFAULT || value === VOICE_UI_AUTO) return true;
  return isOpenAiTtsVoice(value);
}

export function validatePresentationSave(input: {
  voiceSelection: string;
  ttsInstructions: string;
}):
  | { ok: true; presentation: KnowledgePresentation }
  | { ok: false; error: string } {
  const voiceSelection = input.voiceSelection.trim().toLowerCase();
  if (!isVoiceUiSelection(voiceSelection)) {
    return { ok: false, error: "Unsupported voice selection." };
  }

  const presentation: KnowledgePresentation = {};
  if (voiceSelection === VOICE_UI_AUTO) {
    presentation.preferred_voice = VOICE_UI_AUTO;
  } else if (voiceSelection !== VOICE_UI_DEFAULT && isOpenAiTtsVoice(voiceSelection)) {
    presentation.preferred_voice = voiceSelection;
  }

  const instructions = input.ttsInstructions.trim();
  if (instructions.length > MAX_TTS_INSTRUCTIONS_LENGTH) {
    return {
      ok: false,
      error: `TTS instructions must be at most ${MAX_TTS_INSTRUCTIONS_LENGTH} characters.`,
    };
  }
  if (instructions.length > 0) {
    presentation.tts_instructions = instructions;
  }

  return { ok: true, presentation };
}

export function mergePresentationIntoKnowledge(
  existingKnowledge: Json,
  presentation: KnowledgePresentation,
): Json {
  const root = asRecord(existingKnowledge) ?? {};
  const prev = asRecord(root.presentation) ?? {};
  const next: Record<string, unknown> = { ...prev };

  if (presentation.preferred_voice?.trim()) {
    next.preferred_voice = presentation.preferred_voice.trim();
  } else {
    delete next.preferred_voice;
  }

  if (presentation.tts_instructions?.trim()) {
    next.tts_instructions = presentation.tts_instructions.trim();
  } else {
    delete next.tts_instructions;
  }

  const out = { ...root } as Record<string, Json | undefined>;
  if (Object.keys(next).length > 0) {
    out.presentation = next as Json;
  } else {
    delete out.presentation;
  }
  return out as Json;
}

export const SUPPORTED_VOICE_OPTIONS: readonly {
  value: VoiceUiSelection;
  label: string;
}[] = [
  { value: VOICE_UI_DEFAULT, label: "Default (alloy)" },
  { value: VOICE_UI_AUTO, label: "Automatic" },
  ...OPENAI_TTS_VOICES.filter((v) => v !== DEFAULT_OPENAI_TTS_VOICE).map(
    (voice) => ({
      value: voice as VoiceUiSelection,
      label: voice,
    }),
  ),
];
