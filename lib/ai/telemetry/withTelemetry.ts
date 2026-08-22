import { getTelemetryCollector } from "@/lib/ai/telemetry/collector";
import {
  estimateTokenCostUsd,
  PRICING_SOURCE,
  PRICING_VERSION,
} from "@/lib/ai/telemetry/cost";
import type {
  PipelineTelemetryStep,
  WithTelemetryOptions,
} from "@/lib/ai/telemetry/types";
import { characterLength, utf8ByteLength } from "@/lib/ai/telemetry/usage";
import { HttpTimeoutError } from "@/lib/http/fetchWithRetry";

function resolveSummary(
  value: string | (() => string | null | undefined) | null | undefined,
): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "function") {
    try {
      return value() ?? null;
    } catch {
      return null;
    }
  }
  return value;
}

function safePush(
  collector: { push: (step: PipelineTelemetryStep) => void },
  step: PipelineTelemetryStep,
): void {
  try {
    collector.push(step);
  } catch (err) {
    console.warn(
      "[telemetry] failed to record step (ignored):",
      err instanceof Error ? err.message : String(err),
    );
  }
}

/**
 * Classify a thrown provider/transport error for telemetry.
 * Does not invent HTTP status or request ids.
 */
export function classifyProviderTransportError(err: unknown): {
  outcome: NonNullable<PipelineTelemetryStep["outcome"]>;
  httpStatus: number | null;
  errorType: string;
} {
  if (err instanceof HttpTimeoutError) {
    return {
      outcome: "timeout",
      httpStatus: null,
      errorType: "HttpTimeoutError",
    };
  }
  if (err instanceof Error && err.name === "AbortError") {
    return {
      outcome: "timeout",
      httpStatus: null,
      errorType: "AbortError",
    };
  }
  const message = err instanceof Error ? err.message : String(err);
  const httpMatch = /(?:Claude|OpenAI|request) failed \((\d{3})\)/i.exec(
    message,
  );
  if (httpMatch) {
    return {
      outcome: "http_error",
      httpStatus: Number(httpMatch[1]),
      errorType: err instanceof Error ? err.name || "Error" : "Error",
    };
  }
  if (err instanceof TypeError) {
    return {
      outcome: "transport_error",
      httpStatus: null,
      errorType: "TypeError",
    };
  }
  return {
    outcome: "transport_error",
    httpStatus: null,
    errorType: err instanceof Error ? err.name || "Error" : "Error",
  };
}

function buildStepFields(args: {
  options: WithTelemetryOptions<unknown>;
  startedAt: Date;
  startMs: number;
  inputSummary: string | null;
  inputSize: number | null;
  promptCharacters: number | null;
  success: boolean;
  retryCount: number;
  warnings: string[];
  errorMessage: string | null;
  usage: {
    prompt_tokens: number | null;
    completion_tokens: number | null;
    cached_tokens: number | null;
    model?: string | null;
  } | null;
  estimatedCost: number | null;
  pricingVersion: string | null;
  pricingSource: string | null;
  rawUsage: Record<string, unknown> | null;
  providerRequestId: string | null;
  outputSizeBytes: number | null;
  completionCharacters: number | null;
  outputSummary: string | null;
  finishedAt: Date;
  outcome: PipelineTelemetryStep["outcome"];
  httpStatus: number | null;
  errorType: string | null;
}): PipelineTelemetryStep {
  return {
    step_name: args.options.stepName,
    provider: args.options.provider ?? null,
    model: args.usage?.model ?? args.options.model ?? null,
    started_at: args.startedAt.toISOString(),
    finished_at: args.finishedAt.toISOString(),
    duration_ms: Date.now() - args.startMs,
    success: args.success,
    retry_count: args.retryCount,
    repair: args.options.repair ?? false,
    input_size_bytes: args.inputSize,
    output_size_bytes: args.outputSizeBytes,
    prompt_characters: args.promptCharacters,
    completion_characters: args.completionCharacters,
    prompt_tokens: args.usage?.prompt_tokens ?? null,
    completion_tokens: args.usage?.completion_tokens ?? null,
    cached_tokens: args.usage?.cached_tokens ?? null,
    estimated_cost: args.estimatedCost,
    pricing_version: args.pricingVersion,
    pricing_source: args.pricingSource,
    raw_usage: args.rawUsage,
    provider_request_id: args.providerRequestId,
    timeout_ms: args.options.timeoutMs ?? null,
    transport_attempt: args.options.transportAttempt ?? null,
    max_transport_attempts: args.options.maxTransportAttempts ?? null,
    outcome: args.outcome,
    http_status: args.httpStatus,
    error_type: args.errorType,
    temperature: args.options.temperature ?? null,
    max_tokens: args.options.maxTokens ?? null,
    response_format: args.options.responseFormat ?? null,
    warnings: args.warnings,
    error_message: args.errorMessage,
    input_summary: args.inputSummary,
    output_summary: args.outputSummary,
  };
}

/**
 * Wrap any pipeline step (AI or deterministic). When no collector is active,
 * runs `fn` unchanged (passthrough). Never swallows errors — records failure
 * then rethrows so behavior is identical. Telemetry recording never fails `fn`.
 */
export async function withTelemetry<T>(
  options: WithTelemetryOptions<T>,
  fn: () => Promise<T>,
): Promise<T> {
  const collector = getTelemetryCollector();
  if (!collector) {
    return fn();
  }

  const startedAt = new Date();
  const startMs = Date.now();
  let inputSummary: string | null = null;
  let inputSize: number | null = null;
  let promptCharacters: number | null = null;
  try {
    inputSummary = resolveSummary(options.inputSummary);
    inputSize = utf8ByteLength(options.measureInput);
    promptCharacters =
      options.measureInput !== undefined
        ? characterLength(options.measureInput)
        : null;
  } catch {
    // Measurement must never block the call.
  }

  try {
    const result = await fn();
    const finishedAt = new Date();
    try {
      const usage = options.usageFromResult?.(result) ?? null;
      const retryCount =
        typeof options.retryCount === "function"
          ? options.retryCount(result)
          : (options.retryCount ?? 0);
      const warnings =
        typeof options.warnings === "function"
          ? options.warnings(result)
          : (options.warnings ?? []);
      const outputMeasured = options.measureOutput
        ? options.measureOutput(result)
        : undefined;
      const customCost = options.estimatedCostFromResult?.(result);
      const estimatedCost =
        customCost !== undefined
          ? (customCost ?? null)
          : estimateTokenCostUsd({
              provider: options.provider,
              model: usage?.model ?? options.model,
              promptTokens: usage?.prompt_tokens ?? null,
              completionTokens: usage?.completion_tokens ?? null,
              cachedTokens: usage?.cached_tokens ?? null,
            });
      const success = options.successFromResult
        ? options.successFromResult(result)
        : true;
      const softError = options.errorMessageFromResult?.(result) ?? null;
      const rawUsage = options.rawUsageFromResult?.(result) ?? null;
      const providerRequestId =
        options.providerRequestIdFromResult?.(result) ?? null;
      const pricingVersion =
        estimatedCost != null
          ? (options.pricingVersion ?? PRICING_VERSION)
          : (options.pricingVersion ?? null);
      const pricingSource =
        estimatedCost != null ? PRICING_SOURCE : null;
      const outcome =
        options.outcomeFromResult?.(result) ??
        (success ? "success" : "transport_error");

      safePush(
        collector,
        buildStepFields({
          options: options as WithTelemetryOptions<unknown>,
          startedAt,
          startMs,
          inputSummary,
          inputSize,
          promptCharacters,
          success,
          retryCount,
          warnings,
          errorMessage: softError,
          usage,
          estimatedCost,
          pricingVersion,
          pricingSource,
          rawUsage,
          providerRequestId,
          outputSizeBytes:
            outputMeasured !== undefined
              ? utf8ByteLength(outputMeasured)
              : null,
          completionCharacters:
            outputMeasured !== undefined
              ? characterLength(outputMeasured)
              : null,
          outputSummary: options.outputSummary?.(result) ?? null,
          finishedAt,
          outcome: outcome ?? null,
          httpStatus: null,
          errorType: null,
        }),
      );
    } catch (recordErr) {
      console.warn(
        "[telemetry] failed to build success step (ignored):",
        recordErr instanceof Error ? recordErr.message : String(recordErr),
      );
    }
    return result;
  } catch (err) {
    const finishedAt = new Date();
    try {
      const message = err instanceof Error ? err.message : String(err);
      const classified = options.outcomeFromError?.(err) ?? null;
      const fallback = classifyProviderTransportError(err);
      safePush(
        collector,
        buildStepFields({
          options: options as WithTelemetryOptions<unknown>,
          startedAt,
          startMs,
          inputSummary,
          inputSize,
          promptCharacters,
          success: false,
          retryCount:
            typeof options.retryCount === "number" ? options.retryCount : 0,
          warnings: [],
          errorMessage: message.slice(0, 2000),
          usage: null,
          estimatedCost: null,
          pricingVersion: null,
          pricingSource: null,
          rawUsage: null,
          providerRequestId: classified?.providerRequestId ?? null,
          outputSizeBytes: null,
          completionCharacters: null,
          outputSummary: null,
          finishedAt,
          outcome: classified?.outcome ?? fallback.outcome,
          httpStatus: classified?.httpStatus ?? fallback.httpStatus,
          errorType: classified?.errorType ?? fallback.errorType,
        }),
      );
    } catch (recordErr) {
      console.warn(
        "[telemetry] failed to build failure step (ignored):",
        recordErr instanceof Error ? recordErr.message : String(recordErr),
      );
    }
    throw err;
  }
}

/** Synchronous variant for pure deterministic steps (no await). */
export function withTelemetrySync<T>(
  options: WithTelemetryOptions<T>,
  fn: () => T,
): T {
  const collector = getTelemetryCollector();
  if (!collector) {
    return fn();
  }

  const startedAt = new Date();
  const startMs = Date.now();
  let inputSummary: string | null = null;
  let inputSize: number | null = null;
  let promptCharacters: number | null = null;
  try {
    inputSummary = resolveSummary(options.inputSummary);
    inputSize = utf8ByteLength(options.measureInput);
    promptCharacters =
      options.measureInput !== undefined
        ? characterLength(options.measureInput)
        : null;
  } catch {
    // Measurement must never block the call.
  }

  try {
    const result = fn();
    const finishedAt = new Date();
    try {
      const warnings =
        typeof options.warnings === "function"
          ? options.warnings(result)
          : (options.warnings ?? []);
      const outputMeasured = options.measureOutput
        ? options.measureOutput(result)
        : undefined;

      safePush(
        collector,
        buildStepFields({
          options: options as WithTelemetryOptions<unknown>,
          startedAt,
          startMs,
          inputSummary,
          inputSize,
          promptCharacters,
          success: true,
          retryCount: 0,
          warnings,
          errorMessage: null,
          usage: null,
          estimatedCost: null,
          pricingVersion: null,
          pricingSource: null,
          rawUsage: null,
          providerRequestId: null,
          outputSizeBytes:
            outputMeasured !== undefined
              ? utf8ByteLength(outputMeasured)
              : null,
          completionCharacters:
            outputMeasured !== undefined
              ? characterLength(outputMeasured)
              : null,
          outputSummary: options.outputSummary?.(result) ?? null,
          finishedAt,
          outcome: "success",
          httpStatus: null,
          errorType: null,
        }),
      );
    } catch (recordErr) {
      console.warn(
        "[telemetry] failed to build sync success step (ignored):",
        recordErr instanceof Error ? recordErr.message : String(recordErr),
      );
    }
    return result;
  } catch (err) {
    const finishedAt = new Date();
    try {
      const message = err instanceof Error ? err.message : String(err);
      const fallback = classifyProviderTransportError(err);
      safePush(
        collector,
        buildStepFields({
          options: options as WithTelemetryOptions<unknown>,
          startedAt,
          startMs,
          inputSummary,
          inputSize,
          promptCharacters,
          success: false,
          retryCount: 0,
          warnings: [],
          errorMessage: message.slice(0, 2000),
          usage: null,
          estimatedCost: null,
          pricingVersion: null,
          pricingSource: null,
          rawUsage: null,
          providerRequestId: null,
          outputSizeBytes: null,
          completionCharacters: null,
          outputSummary: null,
          finishedAt,
          outcome: fallback.outcome,
          httpStatus: fallback.httpStatus,
          errorType: fallback.errorType,
        }),
      );
    } catch (recordErr) {
      console.warn(
        "[telemetry] failed to build sync failure step (ignored):",
        recordErr instanceof Error ? recordErr.message : String(recordErr),
      );
    }
    throw err;
  }
}
