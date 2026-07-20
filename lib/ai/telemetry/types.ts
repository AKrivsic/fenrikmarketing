/**
 * Pipeline telemetry — permanent production instrumentation for AI steps.
 * Additive only: never alters prompts, model outputs, or control flow.
 */

export const PIPELINE_TELEMETRY_VERSION = "pipeline-telemetry@1" as const;

export type PipelineTelemetryProvider =
  | "claude"
  | "openai"
  | "anthropic"
  | "whisper"
  | "tts"
  | "image"
  | "video"
  | "deterministic"
  | "unknown"
  | string;

/** One chronological step in a generation pipeline. */
export interface PipelineTelemetryStep {
  step_name: string;
  provider: PipelineTelemetryProvider | null;
  model: string | null;
  started_at: string;
  finished_at: string;
  duration_ms: number;
  success: boolean;
  retry_count: number;
  repair: boolean;
  input_size_bytes: number | null;
  output_size_bytes: number | null;
  prompt_characters: number | null;
  completion_characters: number | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  cached_tokens: number | null;
  /** USD estimate when token/pricing data is available; otherwise null. */
  estimated_cost: number | null;
  temperature: number | null;
  max_tokens: number | null;
  response_format: string | null;
  warnings: string[];
  error_message: string | null;
  /** Compact description — never the full prompt. */
  input_summary: string | null;
  /** Compact description of what the step produced. */
  output_summary: string | null;
}

/** Optional usage extracted from provider raw responses. */
export interface ProviderUsageMetrics {
  prompt_tokens: number | null;
  completion_tokens: number | null;
  cached_tokens: number | null;
  model?: string | null;
}

export interface WithTelemetryOptions<T = unknown> {
  stepName: string;
  provider?: PipelineTelemetryProvider | null;
  model?: string | null;
  repair?: boolean;
  temperature?: number | null;
  maxTokens?: number | null;
  responseFormat?: string | null;
  /** Compact input description (or builder). */
  inputSummary?: string | (() => string | null | undefined) | null;
  /** Compact output description from the result. */
  outputSummary?: (result: T) => string | null | undefined;
  /** Serialize for byte-size measurement (prompt/system/etc.). */
  measureInput?: unknown;
  measureOutput?: (result: T) => unknown;
  /** Extra warnings recorded when the step succeeds. */
  warnings?: string[] | ((result: T) => string[]);
  /** Override retry count (e.g. from generateValidatedJson attempts). */
  retryCount?: number | ((result: T) => number);
  /** Merge provider usage after success. */
  usageFromResult?: (result: T) => ProviderUsageMetrics | null | undefined;
  estimatedCostFromResult?: (result: T) => number | null | undefined;
  /**
   * When the wrapped function returns a soft-failure object instead of throwing
   * (e.g. generateValidatedJson `{ ok: false }`), map to telemetry success.
   * Defaults to true when the function completes without throwing.
   */
  successFromResult?: (result: T) => boolean;
  errorMessageFromResult?: (result: T) => string | null;
}

export interface GenerationTelemetryDocument {
  version: typeof PIPELINE_TELEMETRY_VERSION;
  strategy_item_id?: string | null;
  production_run_id?: string | null;
  full_package_generations?: number;
  fidelity_first_pass_passed?: boolean | null;
  fidelity_first_pass_failure_reasons?: string[];
  fidelity_final_passed?: boolean | null;
  hook_deterministic_enforce_reason?: string | null;
  candidate_repair_reasons?: string[];
  /** Legacy repair-phase entries (fidelity_repair / story_repair). */
  phases: Array<Record<string, unknown>>;
  /** Chronological detailed steps (pipeline-telemetry@1). */
  steps: PipelineTelemetryStep[];
}
