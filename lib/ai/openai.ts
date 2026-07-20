import {
  ImageProviderHttpError,
} from "@/lib/ai/imageProviderHttpError";
import {
  fetchWithRetry,
  HTTP_MAX_ATTEMPTS,
  HTTP_TIMEOUT_MS,
} from "@/lib/http/fetchWithRetry";
import type {
  ImageEditRequest,
  ImageGenerationRequest,
  ImageGenerationResult,
  ImageProvider,
  SpeechProvider,
  SpeechRequest,
  SpeechResult,
  TextCompletionRequest,
  TextCompletionResult,
  TextProvider,
  TranscriptionProvider,
  TranscriptionRequest,
  TranscriptionResult,
  WordTimestamp,
} from "@/lib/ai/types";
import { extractProviderUsage } from "@/lib/ai/telemetry/usage";

const CHAT_URL = "https://api.openai.com/v1/chat/completions";
const IMAGE_URL = "https://api.openai.com/v1/images/generations";
const IMAGE_EDIT_URL = "https://api.openai.com/v1/images/edits";
const SPEECH_URL = "https://api.openai.com/v1/audio/speech";
const TRANSCRIPTION_URL = "https://api.openai.com/v1/audio/transcriptions";

const DEFAULT_TEXT_MODEL = "gpt-4o-mini";
const DEFAULT_IMAGE_MODEL = "gpt-image-1";
const DEFAULT_IMAGE_EDIT_MODEL =
  process.env.OPENAI_IMAGE_EDIT_MODEL ?? DEFAULT_IMAGE_MODEL;
const DEFAULT_TTS_MODEL = "gpt-4o-mini-tts";
// Word Timestamp Subtitles V1 — whisper-1 is the model that supports
// verbose_json + word-level timestamp granularities (the gpt-4o transcribe
// models do not expose word timestamps). Do not change without re-checking the
// response shape consumed below.
const DEFAULT_TRANSCRIPTION_MODEL = "whisper-1";
// gpt-4o-mini is multimodal (accepts image inputs), so vision reuses it.
const DEFAULT_VISION_MODEL = "gpt-4o-mini";

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

    const res = await fetchWithRetry(
      CHAT_URL,
      {
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
      },
      {
        timeoutMs: HTTP_TIMEOUT_MS.ai,
        maxAttempts: HTTP_MAX_ATTEMPTS.ai,
        label: "openai:chat",
      },
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`OpenAI chat request failed (${res.status}): ${detail}`);
    }

    const data = (await res.json()) as ChatResponse;
    const usage = extractProviderUsage(data);
    return {
      text: data.choices?.[0]?.message?.content ?? "",
      model: data.model ?? model,
      provider: this.name,
      raw: data,
      usage: {
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        cached_tokens: usage.cached_tokens,
      },
    };
  }
}

// Minimal vision wrapper: a single image (by URL) plus a text prompt, returning
// the model's text answer. Reuses the chat completions endpoint with a
// multimodal user message. Used by the asset analysis workflow only — it does
// NOT implement the shared TextProvider interface (which has no image input).
export interface VisionAnalyzeRequest {
  system?: string;
  prompt: string;
  imageUrl: string;
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export class OpenAIVisionProvider {
  readonly name = "openai-vision";
  private readonly apiKey?: string;
  private readonly defaultModel: string;

  constructor(apiKey?: string, defaultModel: string = DEFAULT_VISION_MODEL) {
    this.apiKey = apiKey;
    this.defaultModel = defaultModel;
  }

  async analyzeImage(
    req: VisionAnalyzeRequest,
  ): Promise<TextCompletionResult> {
    const apiKey = getApiKey(this.apiKey);
    const model = req.model ?? this.defaultModel;

    const messages = [
      ...(req.system ? [{ role: "system", content: req.system }] : []),
      {
        role: "user",
        content: [
          { type: "text", text: req.prompt },
          { type: "image_url", image_url: { url: req.imageUrl } },
        ],
      },
    ];

    const res = await fetchWithRetry(
      CHAT_URL,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: req.temperature ?? 0.2,
          max_tokens: req.maxTokens ?? 1024,
          ...(req.json ? { response_format: { type: "json_object" } } : {}),
          messages,
        }),
      },
      {
        timeoutMs: HTTP_TIMEOUT_MS.ai,
        maxAttempts: HTTP_MAX_ATTEMPTS.ai,
        label: "openai:vision",
      },
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`OpenAI vision request failed (${res.status}): ${detail}`);
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
  readonly supportsMultiImageEdit =
    DEFAULT_IMAGE_EDIT_MODEL.startsWith("gpt-image") ||
    process.env.OPENAI_IMAGE_EDIT_MULTI === "true";
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

    const res = await fetchWithRetry(
      IMAGE_URL,
      {
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
      },
      {
        timeoutMs: HTTP_TIMEOUT_MS.ai,
        maxAttempts: HTTP_MAX_ATTEMPTS.ai,
        label: "openai:image",
      },
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw ImageProviderHttpError.fromOpenAIResponse(res.status, detail);
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

  async editImage(req: ImageEditRequest): Promise<ImageGenerationResult> {
    const apiKey = getApiKey(this.apiKey);
    const model = req.model ?? DEFAULT_IMAGE_EDIT_MODEL;
    const mimeType = req.mimeType ?? "image/png";
    const ext = mimeType === "image/jpeg" ? "jpg" : "png";
    const refs = req.additionalImages ?? [];

    if (refs.length > 0 && !this.supportsMultiImageEdit) {
      throw new Error(
        "Multi-image edit (logo/asset reference) is not supported for the configured OpenAI image edit model",
      );
    }

    // Images Edit API expects an array field in multipart form data (`image[]`),
    // including when only one file is sent. Repeating bare `image` duplicates the
    // parameter and OpenAI returns duplicate_parameter (400).
    const form = new FormData();
    const appendEditImage = (
      imageBytes: Buffer,
      type: string,
      filename: string,
    ) => {
      const bytes = new ArrayBuffer(imageBytes.byteLength);
      new Uint8Array(bytes).set(imageBytes);
      form.append("image[]", new Blob([bytes], { type }), filename);
    };
    appendEditImage(req.sourceImageBytes, mimeType, `scene.${ext}`);
    for (let i = 0; i < refs.length; i++) {
      const ref = refs[i]!;
      const refExt = ref.mimeType === "image/jpeg" ? "jpg" : "png";
      appendEditImage(ref.imageBytes, ref.mimeType, `reference-${i}.${refExt}`);
    }

    const promptPrefix =
      refs.length > 0
        ? refs.length === 1
          ? "The additional uploaded image is the exact logo/brand asset to place. "
          : "The additional uploaded images include the exact logo/brand assets to place. "
        : "";
    form.append("prompt", `${promptPrefix}${req.instruction}`);
    form.append("model", model);
    form.append("size", req.size ?? "1024x1024");

    const res = await fetchWithRetry(
      IMAGE_EDIT_URL,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
        },
        body: form,
      },
      {
        timeoutMs: HTTP_TIMEOUT_MS.ai,
        maxAttempts: HTTP_MAX_ATTEMPTS.ai,
        label: "openai:image-edit",
      },
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `OpenAI image edit request failed (${res.status}): ${detail}`,
      );
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

    const res = await fetchWithRetry(
      SPEECH_URL,
      {
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
          ...(req.instructions && req.instructions.trim().length > 0
            ? { instructions: req.instructions.trim() }
            : {}),
        }),
      },
      {
        timeoutMs: HTTP_TIMEOUT_MS.ai,
        maxAttempts: HTTP_MAX_ATTEMPTS.ai,
        label: "openai:speech",
      },
    );

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

// Shape of the relevant fields in OpenAI's verbose_json transcription response.
// Only `words` is consumed (timestamp_granularities[]=word). `segment`-level
// timing is intentionally ignored — phrase grouping happens downstream.
interface VerboseJsonTranscription {
  language?: string;
  words?: { word?: unknown; start?: unknown; end?: unknown }[];
}

function toFiniteNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value);
}

// Word Timestamp Subtitles V1 — transcribes already-synthesized audio with
// whisper-1 to obtain real per-word timestamps. Uses multipart/form-data (the
// transcription endpoint requires a file upload, unlike the JSON chat/speech
// endpoints) and the SAME OPENAI_API_KEY + retry/timeout transport as the rest
// of the OpenAI surface. Heavy validation of the word array lives in the worker
// (sanitizeWhisperWords); here we only coerce the raw shape.
export class OpenAITranscriptionProvider implements TranscriptionProvider {
  readonly name = "openai";
  private readonly apiKey?: string;
  private readonly defaultModel: string;

  constructor(
    apiKey?: string,
    defaultModel: string = DEFAULT_TRANSCRIPTION_MODEL,
  ) {
    this.apiKey = apiKey;
    this.defaultModel = defaultModel;
  }

  async transcribeWords(
    req: TranscriptionRequest,
  ): Promise<TranscriptionResult> {
    const apiKey = getApiKey(this.apiKey);
    const model = req.model ?? this.defaultModel;

    const form = new FormData();
    // Copy into a plain ArrayBuffer so the Blob part type is unambiguous (the
    // incoming Uint8Array may be backed by a SharedArrayBuffer per the types).
    const bytes = new ArrayBuffer(req.audio.byteLength);
    new Uint8Array(bytes).set(req.audio);
    const blob = new Blob([bytes], {
      type: req.contentType ?? "audio/mpeg",
    });
    form.append("file", blob, req.filename ?? "audio.mp3");
    form.append("model", model);
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "word");
    if (req.language) form.append("language", req.language);

    const res = await fetchWithRetry(
      TRANSCRIPTION_URL,
      {
        method: "POST",
        // Do NOT set content-type: fetch derives the multipart boundary from
        // the FormData body. Setting it manually breaks the upload.
        headers: { authorization: `Bearer ${apiKey}` },
        body: form,
      },
      {
        timeoutMs: HTTP_TIMEOUT_MS.ai,
        maxAttempts: HTTP_MAX_ATTEMPTS.ai,
        label: "openai:transcription",
      },
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `OpenAI transcription request failed (${res.status}): ${detail}`,
      );
    }

    const data = (await res.json()) as VerboseJsonTranscription;
    const rawWords = Array.isArray(data.words) ? data.words : [];
    const words: WordTimestamp[] = rawWords.map((w) => ({
      word: typeof w.word === "string" ? w.word : String(w.word ?? ""),
      start: toFiniteNumber(w.start),
      end: toFiniteNumber(w.end),
    }));

    return {
      provider: this.name,
      model,
      ...(typeof data.language === "string" ? { language: data.language } : {}),
      words,
      raw: data,
    };
  }
}
