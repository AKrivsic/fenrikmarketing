import type { Json, LanguageCode, Project } from "@/lib/supabase/types";
import {
  DEFAULT_OPENAI_TTS_VOICE,
  normalizeOpenAiTtsVoice,
  type OpenAiTtsVoice,
} from "@/lib/voice/openaiTtsVoices";
import { buildTtsInstructions, buildTtsInstructionsForVideoJob } from "@/lib/voice/buildTtsInstructions";
import {
  buildVideoTtsDeliveryHints,
  type VideoTtsDeliveryContext,
} from "@/lib/voice/buildVideoTtsDelivery";
import { parseKnowledgePresentation } from "@/lib/voice/knowledgePresentation";
import {
  resolveVoiceSelection,
  type VoicePackageSignals,
} from "@/lib/voice/resolveVoiceFamily";

export interface ResolvedTtsOptions {
  voice: OpenAiTtsVoice;
  instructions?: string;
  resolved_primary_voice?: OpenAiTtsVoice;
  resolved_secondary_voice?: OpenAiTtsVoice | null;
  selected_voice?: OpenAiTtsVoice;
  voice_source?: string;
  voice_scores?: { primary: number; secondary: number };
  voice_reasons?: string[];
  delivery_reason?: string;
}

export interface ResolveTtsOptionsInput {
  projectId: string;
  language: LanguageCode;
  toneOfVoice: Json;
  knowledge: Json;
  targetAudience?: Json | null;
  videoContext?: VideoTtsDeliveryContext;
}

function packageSignalsFromVideoContext(
  ctx: VideoTtsDeliveryContext | undefined,
): VoicePackageSignals | null {
  if (!ctx) return null;
  return {
    funnelStage: ctx.funnelStage,
    creativeMode: ctx.creativeMode,
    topic: ctx.topic,
    angle: ctx.angle,
    visualProfile: ctx.visualProfile,
    narrativeRoles: ctx.narrativeRoles,
    recentSelectedVoices: ctx.recentSelectedVoices,
  };
}

export function resolveTtsOptions(
  input: ResolveTtsOptionsInput,
): ResolvedTtsOptions {
  const presentation = parseKnowledgePresentation(input.knowledge);
  const selection = resolveVoiceSelection({
    projectId: input.projectId,
    language: input.language,
    knowledge: input.knowledge,
    toneOfVoice: input.toneOfVoice,
    targetAudience: input.targetAudience ?? null,
    packageSignals: packageSignalsFromVideoContext(input.videoContext),
  });

  const deliveryHints = input.videoContext
    ? buildVideoTtsDeliveryHints({
        funnelStage: input.videoContext.funnelStage,
        creativeMode: input.videoContext.creativeMode,
        narrativeRoles: input.videoContext.narrativeRoles,
        language: input.language,
        visualProfile: input.videoContext.visualProfile,
        topic: input.videoContext.topic,
        angle: input.videoContext.angle,
      })
    : [];

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

  const delivery_reason =
    deliveryHints.length > 0
      ? deliveryHints.join(" ")
      : instructions
        ? "tone_or_explicit_instructions"
        : "no_delivery_hints";

  return {
    voice: selection.voice,
    ...(instructions ? { instructions } : {}),
    resolved_primary_voice: selection.primary,
    resolved_secondary_voice: selection.secondary,
    selected_voice: selection.voice,
    voice_source: selection.source,
    voice_scores: selection.scores,
    voice_reasons: selection.reasons,
    delivery_reason,
  };
}

export function resolveTtsOptionsFromProject(project: Project): ResolvedTtsOptions {
  return resolveTtsOptions({
    projectId: project.id,
    language: project.language,
    toneOfVoice: project.tone_of_voice,
    knowledge: project.knowledge,
    targetAudience: project.target_audience,
  });
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
  const primary =
    typeof input.resolved_primary_voice === "string"
      ? normalizeOpenAiTtsVoice(input.resolved_primary_voice, voice)
      : undefined;
  const secondaryRaw = input.resolved_secondary_voice;
  const secondary =
    secondaryRaw === null
      ? null
      : typeof secondaryRaw === "string"
        ? normalizeOpenAiTtsVoice(secondaryRaw, voice)
        : undefined;

  return {
    voice,
    ...(instructions ? { instructions } : {}),
    selected_voice: voice,
    ...(primary ? { resolved_primary_voice: primary } : {}),
    ...(secondary !== undefined ? { resolved_secondary_voice: secondary } : {}),
    ...(typeof input.voice_source === "string"
      ? { voice_source: input.voice_source }
      : {}),
    ...(typeof input.delivery_reason === "string"
      ? { delivery_reason: input.delivery_reason }
      : {}),
  };
}
