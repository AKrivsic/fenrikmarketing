import type { Json, LanguageCode, Project } from "@/lib/supabase/types";
import {
  DEFAULT_OPENAI_TTS_VOICE,
  deterministicOpenAiTtsVoice,
  normalizeOpenAiTtsVoice,
  type OpenAiTtsVoice,
} from "@/lib/voice/openaiTtsVoices";
import { buildTtsInstructions, buildTtsInstructionsForVideoJob } from "@/lib/voice/buildTtsInstructions";
import type { VideoTtsDeliveryContext } from "@/lib/voice/buildVideoTtsDelivery";
import { parseKnowledgePresentation } from "@/lib/voice/knowledgePresentation";

export interface ResolvedTtsOptions {
  voice: OpenAiTtsVoice;
  instructions?: string;
}

export interface ResolveTtsOptionsInput {
  projectId: string;
  language: LanguageCode;
  toneOfVoice: Json;
  knowledge: Json;
  videoContext?: VideoTtsDeliveryContext;
}

export function resolveTtsOptions(
  input: ResolveTtsOptionsInput,
): ResolvedTtsOptions {
  const presentation = parseKnowledgePresentation(input.knowledge);
  const voice = resolveVoice({
    projectId: input.projectId,
    language: input.language,
    presentation,
  });
  const instructions = input.videoContext
    ? buildTtsInstructionsForVideoJob({
        toneOfVoice: input.toneOfVoice,
        explicitInstructions: presentation.tts_instructions,
        language: input.language,
        videoContext: input.videoContext,
      })
    : buildTtsInstructions({
        toneOfVoice: input.toneOfVoice,
        explicitInstructions: presentation.tts_instructions,
        language: input.language,
      });

  return {
    voice,
    ...(instructions ? { instructions } : {}),
  };
}

export function resolveTtsOptionsFromProject(project: Project): ResolvedTtsOptions {
  return resolveTtsOptions({
    projectId: project.id,
    language: project.language,
    toneOfVoice: project.tone_of_voice,
    knowledge: project.knowledge,
  });
}

function resolveVoice(args: {
  projectId: string;
  language: LanguageCode;
  presentation: ReturnType<typeof parseKnowledgePresentation>;
}): OpenAiTtsVoice {
  const preferred = args.presentation.preferred_voice?.trim().toLowerCase();

  const useAutomatic =
    !preferred ||
    preferred === "auto" ||
    args.presentation.voice_selection === "deterministic";

  if (useAutomatic) {
    return deterministicOpenAiTtsVoice({
      projectId: args.projectId,
      language: args.language,
    });
  }

  return normalizeOpenAiTtsVoice(preferred, DEFAULT_OPENAI_TTS_VOICE);
}

/** Reads optional TTS fields already stored on a video_jobs.input blob. */
export function resolveTtsOptionsFromJobInput(
  input: Record<string, unknown>,
): ResolvedTtsOptions {
  const voice = normalizeOpenAiTtsVoice(input.tts_voice, DEFAULT_OPENAI_TTS_VOICE);
  const instructions =
    typeof input.tts_instructions === "string" &&
    input.tts_instructions.trim().length > 0
      ? input.tts_instructions.trim()
      : undefined;
  return {
    voice,
    ...(instructions ? { instructions } : {}),
  };
}
