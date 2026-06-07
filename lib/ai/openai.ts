import type {
  ImageGenerationRequest,
  ImageGenerationResult,
  ImageProvider,
  SpeechProvider,
  SpeechRequest,
  SpeechResult,
  TextCompletionRequest,
  TextCompletionResult,
  TextProvider,
} from "@/lib/ai/types";

const CHAT_URL = "https://api.openai.com/v1/chat/completions";
const IMAGE_URL = "https://api.openai.com/v1/images/generations";
const SPEECH_URL = "https://api.openai.com/v1/audio/speech";

const DEFAULT_TEXT_MODEL = "gpt-4o-mini";
const DEFAULT_IMAGE_MODEL = "gpt-image-1";
const DEFAULT_TTS_MODEL = "gpt-4o-mini-tts";

function getApiKey(explicit?: string): string {
  const key = explicit ?? process.env.OPENAI_API_KEY ?? "";
  if (!key) throw new Error("Missing OPENAI_API_KEY");
  return key;
}

interface ChatResponse {
  choices?: { message?: { content?: string } }[];
  model?: string;
}

// OpenAI handles images, TTS and structured JSON repair / helper tasks.
// It is NOT used for strategy/copy/scoring/evergreen (those are Claude).
export class OpenAITextProvider implements TextProvider {
  readonly name = "openai";
  private readonly apiKey?: string;
  private readonly defaultModel: string;

  constructor(apiKey?: string, defaultModel: string = DEFAULT_TEXT_MODEL) {
    this.apiKey = apiKey;
    this.defaultModel = defaultModel;
  }

  async complete(req: TextCompletionRequest): Promise<TextCompletionResult> {
    const apiKey = getApiKey(this.apiKey);
    const model = req.model ?? this.defaultModel;

    const messages = [
      ...(req.system ? [{ role: "system", content: req.system }] : []),
      { role: "user", content: req.prompt },
    ];

    const res = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: req.temperature ?? 0.2,
        max_tokens: req.maxTokens ?? 4096,
        ...(req.json ? { response_format: { type: "json_object" } } : {}),
        messages,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`OpenAI chat request failed (${res.status}): ${detail}`);
    }

    const data = (await res.json()) as ChatResponse;
    return {
      text: data.choices?.[0]?.message?.content ?? "",
      model: data.model ?? model,
      provider: this.name,
      raw: data,
    };
  }
}

interface ImageResponse {
  data?: { b64_json?: string; url?: string }[];
}

// MVP default image provider. Reached only through the image_provider adapter.
export class OpenAIImageProvider implements ImageProvider {
  readonly name = "openai" as const;
  private readonly apiKey?: string;
  private readonly defaultModel: string;

  constructor(apiKey?: string, defaultModel: string = DEFAULT_IMAGE_MODEL) {
    this.apiKey = apiKey;
    this.defaultModel = defaultModel;
  }

  async generateImage(
    req: ImageGenerationRequest,
  ): Promise<ImageGenerationResult> {
    const apiKey = getApiKey(this.apiKey);
    const model = req.model ?? this.defaultModel;

    const res = await fetch(IMAGE_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt: req.prompt,
        size: req.size ?? "1024x1024",
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`OpenAI image request failed (${res.status}): ${detail}`);
    }

    const data = (await res.json()) as ImageResponse;
    const first = data.data?.[0];
    return {
      provider: this.name,
      model,
      imageBase64: first?.b64_json,
      imageUrl: first?.url,
      raw: data,
    };
  }
}

export class OpenAISpeechProvider implements SpeechProvider {
  readonly name = "openai";
  private readonly apiKey?: string;
  private readonly defaultModel: string;

  constructor(apiKey?: string, defaultModel: string = DEFAULT_TTS_MODEL) {
    this.apiKey = apiKey;
    this.defaultModel = defaultModel;
  }

  async synthesize(req: SpeechRequest): Promise<SpeechResult> {
    const apiKey = getApiKey(this.apiKey);
    const model = req.model ?? this.defaultModel;

    const res = await fetch(SPEECH_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        voice: req.voice ?? "alloy",
        input: req.text,
        format: req.format ?? "mp3",
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`OpenAI speech request failed (${res.status}): ${detail}`);
    }

    const buffer = await res.arrayBuffer();
    return {
      provider: this.name,
      model,
      audioBase64: Buffer.from(buffer).toString("base64"),
    };
  }
}
