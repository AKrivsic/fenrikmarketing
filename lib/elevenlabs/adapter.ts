import {
  ELEVENLABS_DEFAULT_OUTPUT_FORMAT,
  ELEVENLABS_MODEL_ELEVEN_V3,
  elevenLabsApiBaseUrl,
  readElevenLabsApiKey,
} from "@/lib/elevenlabs/config";
import { readResponseBodyBounded, BoundedDownloadError } from "@/lib/scene-video-attempts/boundedDownload";

/** Short voiceover — cap response below typical 30s mp3 + JSON alignment. */
export const ELEVENLABS_MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

export const ELEVENLABS_V3_MAX_INPUT_CHARS = 5000;

export interface ElevenLabsCharacterAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

export interface ElevenLabsWithTimestampsResponse {
  audio_base64: string;
  alignment?: ElevenLabsCharacterAlignment | null;
  normalized_alignment?: ElevenLabsCharacterAlignment | null;
}

export type ElevenLabsAdapterErrorCode =
  | "config_missing"
  | "request_invalid"
  | "response_too_large"
  | "response_invalid"
  | "client_error"
  | "server_error"
  | "timeout"
  | "network";

export class ElevenLabsAdapterError extends Error {
  readonly code: ElevenLabsAdapterErrorCode;
  readonly status?: number;

  constructor(code: ElevenLabsAdapterErrorCode, message: string, status?: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export interface ElevenLabsTtsRequest {
  voiceId: string;
  text: string;
  modelId?: string;
  outputFormat?: string;
  voiceSettings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    speed?: number;
  };
}

function isValidBase64(value: string): boolean {
  if (value.length % 4 !== 0) return false;
  try {
    const buf = Buffer.from(value, "base64");
    return buf.length > 0;
  } catch {
    return false;
  }
}

export function validateElevenLabsAlignment(
  raw: unknown,
): ElevenLabsCharacterAlignment {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new ElevenLabsAdapterError("response_invalid", "invalid_alignment");
  }
  const a = raw as Record<string, unknown>;
  const characters = a.characters;
  const starts = a.character_start_times_seconds;
  const ends = a.character_end_times_seconds;
  if (
    !Array.isArray(characters) ||
    !Array.isArray(starts) ||
    !Array.isArray(ends) ||
    characters.length === 0 ||
    characters.length !== starts.length ||
    characters.length !== ends.length
  ) {
    throw new ElevenLabsAdapterError("response_invalid", "alignment_length_mismatch");
  }
  let prevEnd = 0;
  for (let i = 0; i < characters.length; i++) {
    const st = Number(starts[i]);
    const en = Number(ends[i]);
    if (!Number.isFinite(st) || !Number.isFinite(en) || st < 0 || en < 0) {
      throw new ElevenLabsAdapterError("response_invalid", "alignment_time_invalid");
    }
    if (st > en + 0.001) {
      throw new ElevenLabsAdapterError("response_invalid", "alignment_start_after_end");
    }
    if (st + 0.001 < prevEnd) {
      throw new ElevenLabsAdapterError("response_invalid", "alignment_time_regression");
    }
    prevEnd = en;
  }
  return {
    characters: characters.map((c) => String(c)),
    character_start_times_seconds: starts.map((n) => Number(n)),
    character_end_times_seconds: ends.map((n) => Number(n)),
  };
}

export function parseElevenLabsWithTimestampsResponse(
  raw: unknown,
): ElevenLabsWithTimestampsResponse {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new ElevenLabsAdapterError("response_invalid", "invalid_json_body");
  }
  const body = raw as Record<string, unknown>;
  const audio = body.audio_base64;
  if (typeof audio !== "string" || audio.length < 8 || !isValidBase64(audio)) {
    throw new ElevenLabsAdapterError("response_invalid", "missing_audio_base64");
  }
  const alignmentRaw = body.alignment;
  const normalizedRaw = body.normalized_alignment;
  const alignment =
    alignmentRaw != null ? validateElevenLabsAlignment(alignmentRaw) : null;
  const normalized_alignment =
    normalizedRaw != null
      ? validateElevenLabsAlignment(normalizedRaw)
      : null;
  return {
    audio_base64: audio,
    alignment,
    normalized_alignment,
  };
}

export async function elevenLabsTextToSpeechWithTimestamps(
  req: ElevenLabsTtsRequest,
  deps: {
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
    apiKey?: string | null;
  } = {},
): Promise<ElevenLabsWithTimestampsResponse> {
  const apiKey = deps.apiKey ?? readElevenLabsApiKey();
  if (!apiKey) {
    throw new ElevenLabsAdapterError("config_missing", "elevenlabs_api_key_missing");
  }
  const voiceId = req.voiceId.trim();
  if (!voiceId) {
    throw new ElevenLabsAdapterError("request_invalid", "voice_id_required");
  }
  const text = req.text.trim();
  if (!text) {
    throw new ElevenLabsAdapterError("request_invalid", "text_required");
  }
  if (text.length > ELEVENLABS_V3_MAX_INPUT_CHARS) {
    throw new ElevenLabsAdapterError("request_invalid", "text_too_long");
  }
  const modelId = req.modelId ?? ELEVENLABS_MODEL_ELEVEN_V3;
  const outputFormat = req.outputFormat ?? ELEVENLABS_DEFAULT_OUTPUT_FORMAT;
  const url = `${elevenLabsApiBaseUrl()}/v1/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps?output_format=${encodeURIComponent(outputFormat)}`;
  const fetchImpl = deps.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeoutMs = deps.timeoutMs ?? 120_000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        ...(req.voiceSettings ? { voice_settings: req.voiceSettings } : {}),
      }),
      signal: controller.signal,
    });
    const buf = await readResponseBodyBounded(
      res,
      ELEVENLABS_MAX_RESPONSE_BYTES,
      controller.signal,
    );
    const textBody = buf.toString("utf8");
    if (!res.ok) {
      if (res.status >= 400 && res.status < 500) {
        throw new ElevenLabsAdapterError(
          "client_error",
          `elevenlabs_${res.status}`,
          res.status,
        );
      }
      throw new ElevenLabsAdapterError(
        "server_error",
        `elevenlabs_${res.status}`,
        res.status,
      );
    }
    let json: unknown;
    try {
      json = JSON.parse(textBody);
    } catch {
      throw new ElevenLabsAdapterError("response_invalid", "json_parse_failed");
    }
    return parseElevenLabsWithTimestampsResponse(json);
  } catch (err) {
    if (err instanceof ElevenLabsAdapterError) throw err;
    if (err instanceof BoundedDownloadError && err.code === "download_too_large") {
      throw new ElevenLabsAdapterError("response_too_large", err.message);
    }
    if (err instanceof Error && err.name === "AbortError") {
      throw new ElevenLabsAdapterError("timeout", "elevenlabs_timeout");
    }
    throw new ElevenLabsAdapterError(
      "network",
      err instanceof Error ? err.message : "network_error",
    );
  } finally {
    clearTimeout(timer);
  }
}

/** After HTTP response: ambiguous / billable uncertainty → submission_unknown. */
export function elevenLabsErrorImpliesSubmissionUnknown(
  err: ElevenLabsAdapterError,
): boolean {
  return (
    err.code === "timeout" ||
    err.code === "network" ||
    err.code === "server_error"
  );
}

/** Clear provider rejection (4xx) — no auto POST retry. */
export function elevenLabsErrorIsProviderRejected(
  err: ElevenLabsAdapterError,
): boolean {
  return err.code === "client_error";
}
