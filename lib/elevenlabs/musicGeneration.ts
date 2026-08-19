import { readResponseBodyBounded } from "@/lib/scene-video-attempts/boundedDownload";
import { ElevenLabsAdapterError } from "@/lib/elevenlabs/adapter";
import {
  ELEVENLABS_DEFAULT_OUTPUT_FORMAT,
  elevenLabsApiBaseUrl,
  readElevenLabsApiKey,
} from "@/lib/elevenlabs/config";
import { ELEVEN_MUSIC_MODEL } from "@/lib/text-to-video/audioAssetConstants";

const MAX_MUSIC_BYTES = 8 * 1024 * 1024;

export interface ElevenLabsMusicGenerationRequest {
  prompt: string;
  durationSeconds: number;
  outputFormat?: string;
}

export async function elevenLabsMusicGeneration(
  req: ElevenLabsMusicGenerationRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<{ audio: Buffer }> {
  const apiKey = readElevenLabsApiKey();
  if (!apiKey) {
    throw new ElevenLabsAdapterError("config_missing", "elevenlabs_api_key_missing");
  }
  const duration = Math.min(300, Math.max(3, req.durationSeconds));
  const url = `${elevenLabsApiBaseUrl()}/v1/music`;
  const body = {
    prompt: req.prompt,
    music_length_ms: Math.round(duration * 1000),
    force_instrumental: true,
    model_id: ELEVEN_MUSIC_MODEL,
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
    throw new ElevenLabsAdapterError("network", "music_generation_network");
  }
  if (!response.ok) {
    const status = response.status;
    if (status >= 500) {
      throw new ElevenLabsAdapterError("server_error", "music_generation_server", status);
    }
    throw new ElevenLabsAdapterError("client_error", "music_generation_client", status);
  }
  const audio = await readResponseBodyBounded(response, MAX_MUSIC_BYTES);
  if (audio.length < 128) {
    throw new ElevenLabsAdapterError("response_invalid", "music_generation_empty");
  }
  return { audio };
}
