import {
  isOpenAiTtsVoice,
  type OpenAiTtsVoice,
} from "@/lib/voice/openaiTtsVoices";
import {
  hasExplicitTtsVoice,
  TTS_VOICE_JOB_FIELD,
} from "@/lib/voice/videoJobTtsInput";
import type { ElevenLabsVoiceGenderHint } from "@/lib/elevenlabs/voiceResolve";
import { genderHintFromOpenAiVoice } from "@/lib/elevenlabs/voiceResolve";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseOpenAiVoiceField(raw: unknown): OpenAiTtsVoice | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().toLowerCase();
  return isOpenAiTtsVoice(trimmed) ? trimmed : null;
}

/** Immutable package/job voice stamp (same fields as `buildVideoJobInput`). */
export function readTtsVoiceFromBriefSnapshot(
  brief: Record<string, unknown>,
): OpenAiTtsVoice | null {
  const fromBrief = parseOpenAiVoiceField(brief[TTS_VOICE_JOB_FIELD]);
  if (fromBrief) return fromBrief;

  const pg = asRecord(brief.presentation_generation);
  if (pg) {
    const fromPgVoice = parseOpenAiVoiceField(pg[TTS_VOICE_JOB_FIELD]);
    if (fromPgVoice) return fromPgVoice;
    const selected = parseOpenAiVoiceField(pg.selected_voice);
    if (selected) return selected;
  }
  return null;
}

export function readAuthoritativeOpenAiVoiceForT2VOptional(args: {
  jobInput?: Record<string, unknown> | null;
  brief?: Record<string, unknown> | null;
}): OpenAiTtsVoice | null {
  const job = args.jobInput;
  if (job && hasExplicitTtsVoice(job)) {
    const parsed = parseOpenAiVoiceField(job[TTS_VOICE_JOB_FIELD]);
    if (parsed) return parsed;
  }
  if (args.brief) {
    return readTtsVoiceFromBriefSnapshot(args.brief);
  }
  return null;
}

export const T2V_TTS_VOICE_SNAPSHOT_MISSING = "tts_voice_snapshot_missing";

export function resolveAuthoritativeOpenAiVoiceForT2V(args: {
  jobInput?: Record<string, unknown> | null;
  brief?: Record<string, unknown> | null;
}): OpenAiTtsVoice {
  const voice = readAuthoritativeOpenAiVoiceForT2VOptional(args);
  if (!voice) {
    throw new Error(T2V_TTS_VOICE_SNAPSHOT_MISSING);
  }
  return voice;
}

const VOICE_CATEGORY_LABELS: Record<ElevenLabsVoiceGenderHint, string> = {
  female: "ženský",
  male: "mužský",
  neutral: "default",
};

export function t2vVoiceCategoryLabelFromOpenAiVoice(
  voice: OpenAiTtsVoice,
): string {
  return VOICE_CATEGORY_LABELS[genderHintFromOpenAiVoice(voice)];
}

export function readT2vVoiceCategoryLabelForManualReview(
  brief: Record<string, unknown>,
): string | null {
  const voice = readAuthoritativeOpenAiVoiceForT2VOptional({ brief });
  if (!voice) return null;
  return t2vVoiceCategoryLabelFromOpenAiVoice(voice);
}
