import type { Json } from "@/lib/supabase/types";

export type VoiceSelectionMode = "default" | "deterministic";

export interface KnowledgePresentation {
  preferred_voice?: string | null;
  voice_selection?: VoiceSelectionMode | null;
  tts_instructions?: string | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function parseKnowledgePresentation(
  knowledge: Json | null | undefined,
): KnowledgePresentation {
  const root = asRecord(knowledge);
  if (!root) return {};
  const presentation = asRecord(root.presentation);
  if (!presentation) return {};

  const voice_selection =
    presentation.voice_selection === "deterministic"
      ? "deterministic"
      : presentation.voice_selection === "default"
        ? "default"
        : null;

  return {
    preferred_voice:
      typeof presentation.preferred_voice === "string"
        ? presentation.preferred_voice
        : null,
    voice_selection,
    tts_instructions:
      typeof presentation.tts_instructions === "string"
        ? presentation.tts_instructions
        : null,
  };
}
