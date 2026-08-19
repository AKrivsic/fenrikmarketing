export const ELEVENLABS_MODEL_ELEVEN_V3 = "eleven_v3" as const;

export const ELEVENLABS_DEFAULT_OUTPUT_FORMAT = "mp3_44100_128" as const;

export const ELEVENLABS_TTS_WITH_TIMESTAMPS_PATH =
  "/v1/text-to-speech" as const;

export function readElevenLabsApiKey(): string | null {
  const raw = process.env.ELEVENLABS_API_KEY?.trim();
  return raw && raw.length > 0 ? raw : null;
}

export function isElevenLabsTtsEnabled(): boolean {
  return process.env.ELEVENLABS_TTS_ENABLED === "true";
}

export function elevenLabsTtsReady(): boolean {
  return isElevenLabsTtsEnabled() && Boolean(readElevenLabsApiKey());
}

export interface ElevenLabsVoiceMap {
  female: string | null;
  male: string | null;
  default: string | null;
}

export function readElevenLabsVoiceMap(): ElevenLabsVoiceMap {
  const pick = (key: string): string | null => {
    const v = process.env[key]?.trim();
    return v && v.length > 0 ? v : null;
  };
  return {
    female: pick("ELEVENLABS_VOICE_ID_FEMALE"),
    male: pick("ELEVENLABS_VOICE_ID_MALE"),
    default: pick("ELEVENLABS_VOICE_ID_DEFAULT"),
  };
}

/** Conservative estimate (Multilingual v2/v3 list price) — not a billing guarantee. */
export function estimateElevenLabsTtsCostUsd(charCount: number): number {
  const per1k = Number(process.env.ELEVENLABS_USD_PER_1K_CHARS ?? "0.10");
  if (!Number.isFinite(per1k) || per1k <= 0) return 0;
  return Math.round((charCount / 1000) * per1k * 10000) / 10000;
}

/** Budget reserved when attempt may have charged provider (unknown outcome). */
export function voiceSynthesisBudgetExposureUsd(args: {
  estimatedCostUsd: number;
  status: string;
}): number {
  if (
    args.status === "completed" ||
    args.status === "response_received" ||
    args.status === "submission_unknown" ||
    args.status === "needs_review" ||
    args.status === "artifact_recovery_required" ||
    args.status === "provider_rejected"
  ) {
    return args.estimatedCostUsd;
  }
  return 0;
}

export function elevenLabsApiBaseUrl(): string {
  return (
    process.env.ELEVENLABS_API_BASE_URL?.trim() ||
    "https://api.elevenlabs.io"
  ).replace(/\/$/, "");
}
