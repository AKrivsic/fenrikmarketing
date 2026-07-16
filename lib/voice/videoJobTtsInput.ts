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
import type { VideoTtsDeliveryContext } from "@/lib/voice/buildVideoTtsDelivery";

export const TTS_VOICE_JOB_FIELD = "tts_voice";
export const TTS_INSTRUCTIONS_JOB_FIELD = "tts_instructions";

export const TTS_AUDIT_JOB_FIELDS = [
  "resolved_primary_voice",
  "resolved_secondary_voice",
  "selected_voice",
  "voice_source",
  "voice_scores",
  "voice_reasons",
  "delivery_reason",
] as const;

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

function attachVoiceAuditFields(
  out: Record<string, unknown>,
  projectTts: ResolvedTtsOptions,
): void {
  if (projectTts.resolved_primary_voice) {
    out.resolved_primary_voice = projectTts.resolved_primary_voice;
  }
  if (projectTts.resolved_secondary_voice !== undefined) {
    out.resolved_secondary_voice = projectTts.resolved_secondary_voice;
  }
  out.selected_voice = projectTts.selected_voice ?? projectTts.voice;
  if (projectTts.voice_source) out.voice_source = projectTts.voice_source;
  if (projectTts.voice_scores) out.voice_scores = projectTts.voice_scores;
  if (projectTts.voice_reasons) out.voice_reasons = projectTts.voice_reasons;
  if (projectTts.delivery_reason) {
    out.delivery_reason = projectTts.delivery_reason;
  }
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

  // Preserve audit evidence from source job on retry; otherwise stamp fresh.
  const sourceHasAudit =
    typeof source.selected_voice === "string" ||
    typeof source.resolved_primary_voice === "string";
  if (sourceHasAudit && hasExplicitTtsVoice(source)) {
    for (const key of TTS_AUDIT_JOB_FIELDS) {
      if (key in source) out[key] = source[key];
    }
    out.selected_voice = voice;
  } else {
    attachVoiceAuditFields(out, {
      ...args.projectTts,
      voice,
      selected_voice: voice,
    });
  }

  return out;
}

export async function fetchProjectTtsOptions(
  supabase: SupabaseClient,
  projectId: string,
  videoContext?: VideoTtsDeliveryContext,
): Promise<ResolvedTtsOptions> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, language, tone_of_voice, knowledge, target_audience")
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    return resolveTtsOptions({
      projectId,
      language: "en" as LanguageCode,
      toneOfVoice: {},
      knowledge: {},
      videoContext,
    });
  }

  return resolveTtsOptions({
    projectId: data.id as string,
    language: data.language as Project["language"],
    toneOfVoice: (data.tone_of_voice as Json) ?? {},
    knowledge: (data.knowledge as Json) ?? {},
    targetAudience: (data.target_audience as Json) ?? null,
    videoContext,
  });
}

export async function attachTtsToVideoJobInput(
  supabase: SupabaseClient,
  projectId: string,
  jobInput: Record<string, unknown>,
  sourceInput?: Record<string, unknown> | null,
  videoContext?: VideoTtsDeliveryContext,
): Promise<Record<string, unknown>> {
  const projectTts = await fetchProjectTtsOptions(
    supabase,
    projectId,
    videoContext,
  );
  return mergeTtsIntoJobInput(jobInput, { sourceInput, projectTts });
}

/** Best-effort recent selected voices from package briefs (soft tie-breaker). */
export function recentSelectedVoicesFromPackages(
  rows: readonly { package_brief?: unknown }[],
): string[] {
  const out: string[] = [];
  for (const row of rows) {
    const brief = asRecord(row.package_brief);
    const pg = asRecord(brief?.presentation_generation);
    const selected =
      (typeof pg?.selected_voice === "string" && pg.selected_voice.trim()) ||
      (typeof brief?.tts_voice === "string" && brief.tts_voice.trim()) ||
      "";
    if (selected) out.push(selected.toLowerCase());
  }
  return out;
}
