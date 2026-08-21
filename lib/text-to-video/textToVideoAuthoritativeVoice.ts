import {
  isOpenAiTtsVoice,
  type OpenAiTtsVoice,
} from "@/lib/voice/openaiTtsVoices";
import {
  hasExplicitTtsVoice,
  TTS_VOICE_JOB_FIELD,
} from "@/lib/voice/videoJobTtsInput";
import {
  genderHintFromOpenAiVoice,
  type ElevenLabsVoiceGenderHint,
} from "@/lib/elevenlabs/voiceResolve";

export const TTS_LANGUAGE_JOB_FIELD = "language";

/** Supported T2V ElevenLabs voice map languages. */
export type T2vVoiceLanguage = "en" | "cs";

export const T2V_TTS_VOICE_SNAPSHOT_MISSING = "tts_voice_snapshot_missing";
export const T2V_TTS_LANGUAGE_SNAPSHOT_MISSING = "tts_language_snapshot_missing";
export const T2V_TTS_LANGUAGE_UNSUPPORTED = "tts_language_unsupported";
export const T2V_VOICE_CATEGORY_UNDECIDED = "t2v_voice_category_undecided";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseOpenAiVoiceField(raw: unknown): OpenAiTtsVoice | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().toLowerCase();
  return isOpenAiTtsVoice(trimmed) ? trimmed : null;
}

/**
 * Normalize package/job language for ElevenLabs voice maps.
 * `en` / `en-US` / `en-GB` → `en`; `cs` / `cs-CZ` / `cz` → `cs`.
 * Returns null when the value is empty or not a supported T2V voice language.
 */
export function normalizeT2vVoiceLanguage(
  raw: unknown,
): T2vVoiceLanguage | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  const base = trimmed.split(/[-_]/)[0] ?? "";
  if (base === "en") return "en";
  if (base === "cs" || base === "cz") return "cs";
  return null;
}

/** True when a non-empty language string was provided but is not en/cs. */
export function isUnsupportedT2vVoiceLanguageRaw(raw: unknown): boolean {
  if (typeof raw !== "string") return false;
  const trimmed = raw.trim();
  if (!trimmed) return false;
  return normalizeT2vVoiceLanguage(trimmed) === null;
}

function readLanguageRawFromSource(
  source: Record<string, unknown> | null | undefined,
): unknown {
  if (!source) return undefined;
  if (source[TTS_LANGUAGE_JOB_FIELD] !== undefined) {
    return source[TTS_LANGUAGE_JOB_FIELD];
  }
  return undefined;
}

/** Immutable package/job language stamp (same field as variant video jobs). */
export function readLanguageRawFromBriefSnapshot(
  brief: Record<string, unknown>,
): unknown {
  const top = readLanguageRawFromSource(brief);
  if (typeof top === "string" && top.trim()) return top;
  const pg = asRecord(brief.presentation_generation);
  if (pg) {
    const fromPg = readLanguageRawFromSource(pg);
    if (typeof fromPg === "string" && fromPg.trim()) return fromPg;
  }
  return undefined;
}

export function readAuthoritativeLanguageRawForT2V(args: {
  jobInput?: Record<string, unknown> | null;
  brief?: Record<string, unknown> | null;
}): unknown {
  const job = args.jobInput;
  if (job) {
    const fromJob = readLanguageRawFromSource(job);
    if (typeof fromJob === "string" && fromJob.trim()) return fromJob;
  }
  if (args.brief) {
    return readLanguageRawFromBriefSnapshot(args.brief);
  }
  return undefined;
}

export function resolveAuthoritativeT2vVoiceLanguage(args: {
  jobInput?: Record<string, unknown> | null;
  brief?: Record<string, unknown> | null;
}): T2vVoiceLanguage {
  const raw = readAuthoritativeLanguageRawForT2V(args);
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    throw new Error(T2V_TTS_LANGUAGE_SNAPSHOT_MISSING);
  }
  const normalized = normalizeT2vVoiceLanguage(raw);
  if (!normalized) {
    throw new Error(T2V_TTS_LANGUAGE_UNSUPPORTED);
  }
  return normalized;
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

export function t2vVoiceLanguageLabel(language: T2vVoiceLanguage): string {
  return language === "cs" ? "čeština" : "english";
}

export function readT2vVoiceCategoryLabelForManualReview(
  brief: Record<string, unknown>,
): string | null {
  const voice = readAuthoritativeOpenAiVoiceForT2VOptional({ brief });
  if (!voice) return null;
  return t2vVoiceCategoryLabelFromOpenAiVoice(voice);
}

export function readT2vVoiceLanguageLabelForManualReview(
  brief: Record<string, unknown>,
): string | null {
  const raw = readAuthoritativeLanguageRawForT2V({ brief });
  const normalized = normalizeT2vVoiceLanguage(raw);
  if (!normalized) return null;
  return t2vVoiceLanguageLabel(normalized);
}

export function stampT2vAuthoritativeVoiceOnBrief(
  brief: Record<string, unknown>,
  args: {
    ttsVoice: OpenAiTtsVoice;
    language: T2vVoiceLanguage;
    selectedVoice?: OpenAiTtsVoice;
  },
): Record<string, unknown> {
  const pg = asRecord(brief.presentation_generation) ?? {};
  return {
    ...brief,
    [TTS_VOICE_JOB_FIELD]: args.ttsVoice,
    language: args.language,
    presentation_generation: {
      ...pg,
      [TTS_VOICE_JOB_FIELD]: args.ttsVoice,
      selected_voice: args.selectedVoice ?? args.ttsVoice,
      language: args.language,
    },
  };
}

export function assertT2vVoiceCategoryDecided(
  category: ElevenLabsVoiceGenderHint | null | undefined,
): ElevenLabsVoiceGenderHint {
  if (
    category === "female" ||
    category === "male" ||
    category === "neutral"
  ) {
    return category;
  }
  throw new Error(T2V_VOICE_CATEGORY_UNDECIDED);
}

/**
 * Control-plane voice gate for Vercel Approve / Continue.
 * Reads only the stored OpenAI voice + language snapshot.
 * Must not read ELEVENLABS_VOICE_ID_* / ELEVENLABS_API_KEY or call a provider.
 */
export function assertT2vVoiceSelectionReadyForApprove(args: {
  brief: Record<string, unknown>;
}): {
  voice: OpenAiTtsVoice;
  language: T2vVoiceLanguage;
  category: ElevenLabsVoiceGenderHint;
} {
  const voice = readAuthoritativeOpenAiVoiceForT2VOptional({
    brief: args.brief,
  });
  if (!voice) {
    throw new Error(T2V_TTS_VOICE_SNAPSHOT_MISSING);
  }
  const languageRaw = readAuthoritativeLanguageRawForT2V({ brief: args.brief });
  if (
    languageRaw === undefined ||
    languageRaw === null ||
    String(languageRaw).trim() === ""
  ) {
    throw new Error(T2V_TTS_LANGUAGE_SNAPSHOT_MISSING);
  }
  const language = normalizeT2vVoiceLanguage(languageRaw);
  if (!language) {
    throw new Error(T2V_TTS_LANGUAGE_UNSUPPORTED);
  }
  const category = assertT2vVoiceCategoryDecided(
    genderHintFromOpenAiVoice(voice),
  );
  return { voice, language, category };
}

/** @deprecated Use assertT2vVoiceSelectionReadyForApprove. Does not resolve Voice ID. */
export function assertT2vVoiceReadyForApprove(args: {
  brief: Record<string, unknown>;
}): {
  voice: OpenAiTtsVoice;
  language: T2vVoiceLanguage;
  category: ElevenLabsVoiceGenderHint;
} {
  return assertT2vVoiceSelectionReadyForApprove(args);
}
