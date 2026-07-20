import {
  fetchWithRetry,
  HTTP_MAX_ATTEMPTS,
  HTTP_TIMEOUT_MS,
} from "@/lib/http/fetchWithRetry";
import type {
  TextCompletionRequest,
  TextCompletionResult,
  TextProvider,
} from "@/lib/ai/types";
import { extractProviderUsage } from "@/lib/ai/telemetry/usage";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL =
  process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-6";
const ANTHROPIC_VERSION = "2023-06-01";

interface AnthropicTextBlock {
  type: string;
  text?: string;
}

interface AnthropicResponse {
  content?: AnthropicTextBlock[];
  model?: string;
}

// Claude is the provider for strategy, copywriting, scoring and evergreen
// generation. Talks to the Anthropic Messages API directly via fetch to avoid
// expanding dependencies.
export class ClaudeProvider implements TextProvider {
  readonly name = "claude";
  private readonly apiKey: string;
  private readonly defaultModel: string;

  constructor(apiKey?: string, defaultModel: string = DEFAULT_MODEL) {
    this.apiKey = apiKey ?? process.env.ANTHROPIC_API_KEY ?? "";
    this.defaultModel = defaultModel;
  }

  async complete(req: TextCompletionRequest): Promise<TextCompletionResult> {
    if (!this.apiKey) {
      throw new Error("Missing ANTHROPIC_API_KEY");
    }

    const model = req.model ?? this.defaultModel;
    const system = req.json
      ? `${req.system ?? ""}\n\nRespond with a single valid JSON document and nothing else.`.trim()
      : req.system;

    const res = await fetchWithRetry(
      ANTHROPIC_URL,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model,
          max_tokens: req.maxTokens ?? 4096,
          temperature: req.temperature ?? 0.7,
          ...(system ? { system } : {}),
          messages: [{ role: "user", content: req.prompt }],
        }),
      },
      {
        timeoutMs: req.timeoutMs ?? HTTP_TIMEOUT_MS.ai,
        maxAttempts: req.maxTransportAttempts ?? HTTP_MAX_ATTEMPTS.ai,
        label: "claude:messages",
      },
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Claude request failed (${res.status}): ${detail}`);
    }

    const data = (await res.json()) as AnthropicResponse;
    const text = (data.content ?? [])
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text as string)
      .join("");
    const usage = extractProviderUsage(data);

    return {
      text,
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
