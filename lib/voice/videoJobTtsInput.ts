import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json, LanguageCode, Project } from "@/lib/supabase/types";
import {
  isOpenAiTtsVoice,
  normalizeOpenAiTtsVoice,
  type OpenAiTtsVoice,
} from "@/lib/voice/openaiTtsVoices";
import {
  resolveTtsOptions,
  type ResolvedTtsOptions,
} from "@/lib/voice/resolveTtsOptions";

export const TTS_VOICE_JOB_FIELD = "tts_voice";
export const TTS_INSTRUCTIONS_JOB_FIELD = "tts_instructions";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function hasExplicitTtsVoice(
  source: Record<string, unknown> | null | undefined,
): boolean {
  const voice = source?.[TTS_VOICE_JOB_FIELD];
  return typeof voice === "string" && voice.trim().length > 0;
}

export function hasExplicitTtsInstructions(
  source: Record<string, unknown> | null | undefined,
): boolean {
  return typeof source?.[TTS_INSTRUCTIONS_JOB_FIELD] === "string";
}

/** Merges TTS fields into a video job input (does not mutate). */
export function mergeTtsIntoJobInput(
  jobInput: Record<string, unknown>,
  args: {
    sourceInput?: Record<string, unknown> | null;
    projectTts: ResolvedTtsOptions;
  },
): Record<string, unknown> {
  const source = args.sourceInput ?? {};
  const voice: OpenAiTtsVoice = (() => {
    if (hasExplicitTtsVoice(source)) {
      const raw = String(source[TTS_VOICE_JOB_FIELD]).trim().toLowerCase();
      if (isOpenAiTtsVoice(raw)) return raw;
    }
    return args.projectTts.voice;
  })();

  const instructions = (() => {
    if (hasExplicitTtsInstructions(source)) {
      const raw = String(source[TTS_INSTRUCTIONS_JOB_FIELD]).trim();
      return raw.length > 0 ? raw : undefined;
    }
    return args.projectTts.instructions;
  })();

  const out: Record<string, unknown> = {
    ...jobInput,
    [TTS_VOICE_JOB_FIELD]: voice,
  };
  if (instructions) {
    out[TTS_INSTRUCTIONS_JOB_FIELD] = instructions;
  } else {
    delete out[TTS_INSTRUCTIONS_JOB_FIELD];
  }
  return out;
}

export async function fetchProjectTtsOptions(
  supabase: SupabaseClient,
  projectId: string,
): Promise<ResolvedTtsOptions> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, language, tone_of_voice, knowledge")
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    return resolveTtsOptions({
      projectId,
      language: "en" as LanguageCode,
      toneOfVoice: {},
      knowledge: {},
    });
  }

  return resolveTtsOptions({
    projectId: data.id as string,
    language: data.language as Project["language"],
    toneOfVoice: (data.tone_of_voice as Json) ?? {},
    knowledge: (data.knowledge as Json) ?? {},
  });
}

export async function attachTtsToVideoJobInput(
  supabase: SupabaseClient,
  projectId: string,
  jobInput: Record<string, unknown>,
  sourceInput?: Record<string, unknown> | null,
): Promise<Record<string, unknown>> {
  const projectTts = await fetchProjectTtsOptions(supabase, projectId);
  return mergeTtsIntoJobInput(jobInput, { sourceInput, projectTts });
}
