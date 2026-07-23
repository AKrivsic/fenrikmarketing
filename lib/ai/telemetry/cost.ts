/**
 * Approximate public list pricing for cost analysis (USD).
 * Estimates only — not billing truth. Null when usage is missing.
 *
 * ## Historical cost immutability (invariant)
 *
 * These helpers and rate tables are for WRITE-TIME only:
 * call them inside `withTelemetry` / worker metering when creating a new step.
 *
 * After `estimated_cost` is persisted on a telemetry step, historical reports and
 * rollups MUST sum the stored number. Never re-run these estimators (or read
 * these constants) to rebuild package / video / run costs for past work.
 *
 * Bump PRICING_VERSION when rates change so new steps self-identify the table
 * used; old steps keep their stored estimated_cost forever.
 */

export const PRICING_VERSION = "list-price@2026-07-23" as const;

/** Informational label stored alongside estimated_cost at write time. */
export const PRICING_SOURCE = "list_price_estimate" as const;

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
};

/** gpt-image-1 medium ~1024x1536 list approximation (USD per still). */
export const IMAGE_USD_PER_STILL = 0.042;

/** gpt-4o-mini-tts list approximation (USD per 1k characters). */
export const TTS_USD_PER_1K_CHARS = 0.015;

/** whisper-1 list approximation (USD per minute of audio). */
export const WHISPER_USD_PER_MIN = 0.006;

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

function roundUsd(usd: number): number {
  return Math.round(usd * 1_000_000) / 1_000_000;
}

/**
 * WRITE-TIME ONLY. Do not call from historical rollups or reports.
 * Prefer reading `step.estimated_cost` after persistence.
 */
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

  return roundUsd(usd);
}

/** WRITE-TIME ONLY. */
export function estimateImageCostUsd(generatedStillCount: number): number | null {
  const n = Math.max(0, Math.floor(generatedStillCount));
  if (n <= 0) return 0;
  return roundUsd(n * IMAGE_USD_PER_STILL);
}

/** WRITE-TIME ONLY. */
export function estimateTtsCostUsd(characterCount: number): number | null {
  const n = Math.max(0, characterCount);
  if (n <= 0) return 0;
  return roundUsd((n / 1000) * TTS_USD_PER_1K_CHARS);
}

/** WRITE-TIME ONLY. */
export function estimateWhisperCostUsd(
  durationSeconds: number | null | undefined,
): number | null {
  if (durationSeconds == null || !Number.isFinite(durationSeconds)) return null;
  const seconds = Math.max(0, durationSeconds);
  if (seconds <= 0) return 0;
  return roundUsd((seconds / 60) * WHISPER_USD_PER_MIN);
}
