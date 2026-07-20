import type { ProviderUsageMetrics } from "@/lib/ai/telemetry/types";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asFiniteInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.round(value));
}

/**
 * Extract token usage from Anthropic Messages or OpenAI Chat/Image raw payloads.
 * Returns nulls when the provider did not include usage (never throws).
 */
export function extractProviderUsage(raw: unknown): ProviderUsageMetrics {
  const empty: ProviderUsageMetrics = {
    prompt_tokens: null,
    completion_tokens: null,
    cached_tokens: null,
  };
  const data = asRecord(raw);
  if (!data) return empty;

  const usage = asRecord(data.usage);
  if (!usage) {
    return { ...empty, model: typeof data.model === "string" ? data.model : null };
  }

  // Anthropic Messages API
  const inputTokens = asFiniteInt(usage.input_tokens);
  const outputTokens = asFiniteInt(usage.output_tokens);
  if (inputTokens !== null || outputTokens !== null) {
    const cached =
      asFiniteInt(usage.cache_read_input_tokens) ??
      asFiniteInt(usage.cache_creation_input_tokens);
    return {
      prompt_tokens: inputTokens,
      completion_tokens: outputTokens,
      cached_tokens: cached,
      model: typeof data.model === "string" ? data.model : null,
    };
  }

  // OpenAI Chat Completions
  const promptTokens = asFiniteInt(usage.prompt_tokens);
  const completionTokens = asFiniteInt(usage.completion_tokens);
  const details = asRecord(usage.prompt_tokens_details);
  const cached = asFiniteInt(details?.cached_tokens) ?? asFiniteInt(usage.cached_tokens);

  return {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    cached_tokens: cached,
    model: typeof data.model === "string" ? data.model : null,
  };
}

export function utf8ByteLength(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  try {
    const text =
      typeof value === "string" ? value : JSON.stringify(value);
    if (typeof text !== "string") return null;
    return Buffer.byteLength(text, "utf8");
  } catch {
    return null;
  }
}

export function characterLength(value: unknown): number | null {
  if (typeof value === "string") return value.length;
  if (value === null || value === undefined) return null;
  try {
    return JSON.stringify(value).length;
  } catch {
    return null;
  }
}
