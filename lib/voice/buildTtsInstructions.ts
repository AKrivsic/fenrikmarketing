import type { Json } from "@/lib/supabase/types";

const MAX_TTS_INSTRUCTIONS_LENGTH = 500;

function toneNotesFromProject(toneOfVoice: Json): string[] {
  if (!toneOfVoice || typeof toneOfVoice !== "object" || Array.isArray(toneOfVoice)) {
    return [];
  }
  const notes = (toneOfVoice as Record<string, unknown>).notes;
  if (!Array.isArray(notes)) return [];
  return notes
    .filter((n): n is string => typeof n === "string")
    .map((n) => n.trim())
    .filter((n) => n.length > 0);
}

// Short, deterministic delivery hints for gpt-4o-mini-tts. Explicit
// knowledge.presentation.tts_instructions overrides tone-derived text.
export function buildTtsInstructions(args: {
  toneOfVoice: Json;
  explicitInstructions?: string | null;
  language: string;
}): string | undefined {
  const override = args.explicitInstructions?.trim();
  if (override) {
    return override.slice(0, MAX_TTS_INSTRUCTIONS_LENGTH);
  }

  const notes = toneNotesFromProject(args.toneOfVoice);
  if (notes.length === 0) return undefined;

  const tone = notes.join("; ");
  const text =
    `Speak naturally for a short vertical social video. ` +
    `Language: ${args.language}. ` +
    `Tone: ${tone}. ` +
    `Read the script exactly; do not add or skip words.`;

  return text.slice(0, MAX_TTS_INSTRUCTIONS_LENGTH);
}
