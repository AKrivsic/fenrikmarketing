import { createHash } from "node:crypto";
import { readResponseBodyBounded } from "@/lib/scene-video-attempts/boundedDownload";
import {
  ElevenLabsAdapterError,
  elevenLabsErrorImpliesSubmissionUnknown,
} from "@/lib/elevenlabs/adapter";
import {
  ELEVENLABS_DEFAULT_OUTPUT_FORMAT,
  elevenLabsApiBaseUrl,
  readElevenLabsApiKey,
} from "@/lib/elevenlabs/config";
import { ELEVEN_SFX_MODEL } from "@/lib/text-to-video/audioAssetConstants";

const MAX_SFX_BYTES = 4 * 1024 * 1024;

export function audioAssetInputFingerprint(input: Record<string, unknown>): string {
  const json = JSON.stringify(input, Object.keys(input).sort());
  return createHash("sha256").update(json, "utf8").digest("hex");
}

export interface ElevenLabsSoundGenerationRequest {
  text: string;
  durationSeconds: number;
  loop?: boolean;
  outputFormat?: string;
}

export async function elevenLabsSoundGeneration(
  req: ElevenLabsSoundGenerationRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<{ audio: Buffer }> {
  const apiKey = readElevenLabsApiKey();
  if (!apiKey) {
    throw new ElevenLabsAdapterError("config_missing", "elevenlabs_api_key_missing");
  }
  const duration = Math.min(30, Math.max(0.5, req.durationSeconds));
  const url = `${elevenLabsApiBaseUrl()}/v1/sound-generation`;
  const body = {
    text: req.text,
    duration_seconds: duration,
    loop: req.loop ?? false,
    model_id: ELEVEN_SFX_MODEL,
    output_format: req.outputFormat ?? ELEVENLABS_DEFAULT_OUTPUT_FORMAT,
  };
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
        Accept: "audio/mpeg",
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ElevenLabsAdapterError("network", "sound_generation_network");
  }
  if (!response.ok) {
    const status = response.status;
    if (status >= 500) {
      throw new ElevenLabsAdapterError("server_error", "sound_generation_server", status);
    }
    throw new ElevenLabsAdapterError("client_error", "sound_generation_client", status);
  }
  const audio = await readResponseBodyBounded(response, MAX_SFX_BYTES);
  if (audio.length < 128) {
    throw new ElevenLabsAdapterError("response_invalid", "sound_generation_empty");
  }
  return { audio };
}

export { elevenLabsErrorImpliesSubmissionUnknown };
