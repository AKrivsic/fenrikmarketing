// OpenAI Text-to-Speech voices supported for gpt-4o-mini-tts (and legacy tts-1).
// Keep in sync with OpenAI docs; unknown values fall back to DEFAULT_OPENAI_TTS_VOICE.

export const OPENAI_TTS_VOICES = [
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "fable",
  "onyx",
  "nova",
  "sage",
  "shimmer",
  "verse",
  "marin",
  "cedar",
] as const;

export type OpenAiTtsVoice = (typeof OPENAI_TTS_VOICES)[number];

/** Matches production behaviour before voice configuration existed. */
export const DEFAULT_OPENAI_TTS_VOICE: OpenAiTtsVoice = "alloy";

const VOICE_SET = new Set<string>(OPENAI_TTS_VOICES);

export function isOpenAiTtsVoice(value: string): value is OpenAiTtsVoice {
  return VOICE_SET.has(value);
}

export function normalizeOpenAiTtsVoice(
  value: unknown,
  fallback: OpenAiTtsVoice = DEFAULT_OPENAI_TTS_VOICE,
): OpenAiTtsVoice {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().toLowerCase();
  return isOpenAiTtsVoice(trimmed) ? trimmed : fallback;
}

// Stable per-project voice when presentation.voice_selection is "deterministic".
export function deterministicOpenAiTtsVoice(args: {
  projectId: string;
  language: string;
}): OpenAiTtsVoice {
  const key = `${args.projectId}:${args.language}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (Math.imul(31, hash) + key.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % OPENAI_TTS_VOICES.length;
  return OPENAI_TTS_VOICES[index] ?? DEFAULT_OPENAI_TTS_VOICE;
}
