/**
 * Approximate public list pricing for cost analysis (USD).
 * Estimates only — not billing truth. Null when usage is missing.
 */

export interface CostEstimateInput {
  provider: string | null | undefined;
  model: string | null | undefined;
  promptTokens: number | null | undefined;
  completionTokens: number | null | undefined;
  cachedTokens?: number | null | undefined;
}

/** Per-1M-token rates (input / output / cached-input). */
const RATES: Record<
  string,
  { input: number; output: number; cachedInput?: number }
> = {
  "claude-sonnet-4-6": { input: 3, output: 15, cachedInput: 0.3 },
  "claude-sonnet-4-5": { input: 3, output: 15, cachedInput: 0.3 },
  "claude-sonnet-4": { input: 3, output: 15, cachedInput: 0.3 },
  "claude-3-5-sonnet": { input: 3, output: 15, cachedInput: 0.3 },
  "gpt-4o-mini": { input: 0.15, output: 0.6, cachedInput: 0.075 },
  "gpt-4o": { input: 2.5, output: 10, cachedInput: 1.25 },
  "gpt-image-1": { input: 5, output: 0 },
  "gpt-4o-mini-tts": { input: 0.6, output: 0 },
  "whisper-1": { input: 0.006 /* per minute — handled separately */, output: 0 },
};

function matchRate(model: string | null | undefined) {
  if (!model) return null;
  const key = model.toLowerCase();
  if (RATES[key]) return RATES[key];
  for (const [name, rate] of Object.entries(RATES)) {
    if (key.includes(name) || name.includes(key)) return rate;
  }
  if (key.includes("claude") && key.includes("sonnet")) {
    return RATES["claude-sonnet-4-6"];
  }
  if (key.includes("gpt-4o-mini")) return RATES["gpt-4o-mini"];
  if (key.includes("gpt-4o")) return RATES["gpt-4o"];
  return null;
}

export function estimateTokenCostUsd(input: CostEstimateInput): number | null {
  const prompt = input.promptTokens;
  const completion = input.completionTokens;
  if (
    (prompt === null || prompt === undefined) &&
    (completion === null || completion === undefined)
  ) {
    return null;
  }
  const rate = matchRate(input.model);
  if (!rate) return null;

  const cached = Math.max(0, input.cachedTokens ?? 0);
  const promptN = Math.max(0, prompt ?? 0);
  const uncachedPrompt = Math.max(0, promptN - cached);
  const completionN = Math.max(0, completion ?? 0);
  const cachedRate = rate.cachedInput ?? rate.input;

  const usd =
    (uncachedPrompt / 1_000_000) * rate.input +
    (cached / 1_000_000) * cachedRate +
    (completionN / 1_000_000) * rate.output;

  return Math.round(usd * 1_000_000) / 1_000_000;
}
