import { z } from "zod";

export const VOICE_DIRECTION_STYLE_AUTO = "auto" as const;
export const VOICE_DIRECTION_STYLE_ENERGETIC = "energetic" as const;
export const VOICE_DIRECTION_STYLE_URGENT = "urgent" as const;
export const VOICE_DIRECTION_STYLE_NATURAL = "natural" as const;
export const VOICE_DIRECTION_STYLE_CALM_TRUSTWORTHY =
  "calm_trustworthy" as const;

export const voiceDirectionStyleSchema = z.enum([
  VOICE_DIRECTION_STYLE_AUTO,
  VOICE_DIRECTION_STYLE_ENERGETIC,
  VOICE_DIRECTION_STYLE_URGENT,
  VOICE_DIRECTION_STYLE_NATURAL,
  VOICE_DIRECTION_STYLE_CALM_TRUSTWORTHY,
]);

export type VoiceDirectionStyle = z.infer<typeof voiceDirectionStyleSchema>;

export const voiceDirectionBeatSchema = z.object({
  /** Human-readable segment label, e.g. "opening", "explanation", "closing". */
  segment: z.string().min(1).max(80),
  /** Human-readable emotion / delivery for editors (not provider tags). */
  delivery: z.string().min(1).max(200),
});

export type VoiceDirectionBeat = z.infer<typeof voiceDirectionBeatSchema>;

export const voiceDirectionContractSchema = z.object({
  /** Primary delivery style for the whole read when beats are omitted. */
  style: voiceDirectionStyleSchema.default(VOICE_DIRECTION_STYLE_AUTO),
  /** Optional short human instruction (not ElevenLabs prompt syntax). */
  custom_instruction: z.string().max(500).optional(),
  /** Optional emotional arc across the voiceover. */
  beats: z.array(voiceDirectionBeatSchema).max(12).optional(),
  /** Bumped when the contract changes — ties to audio/timing invalidation. */
  revision: z.number().int().nonnegative().default(0),
});

export type VoiceDirectionContract = z.infer<
  typeof voiceDirectionContractSchema
>;

export function parseVoiceDirectionContract(
  raw: unknown,
): VoiceDirectionContract | null {
  if (raw === undefined || raw === null) return null;
  const parsed = voiceDirectionContractSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function defaultVoiceDirectionContract(): VoiceDirectionContract {
  return voiceDirectionContractSchema.parse({});
}

export function bumpVoiceDirectionRevision(
  current: VoiceDirectionContract,
  next: Omit<VoiceDirectionContract, "revision">,
): VoiceDirectionContract {
  return voiceDirectionContractSchema.parse({
    ...next,
    revision: (current.revision ?? 0) + 1,
  });
}

export const VOICE_DIRECTION_STYLE_LABELS: Record<VoiceDirectionStyle, string> = {
  auto: "Automaticky – doporučeno",
  energetic: "Energický",
  urgent: "Naléhavý",
  natural: "Přirozený",
  calm_trustworthy: "Klidný a důvěryhodný",
};

export function readVoiceDirectionFromBrief(
  brief: Record<string, unknown> | null | undefined,
): VoiceDirectionContract | null {
  if (!brief) return null;
  return parseVoiceDirectionContract(brief.video_voice_direction);
}
