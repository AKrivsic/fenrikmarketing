import { getTelemetryCollector } from "@/lib/ai/telemetry/collector";
import { estimateTokenCostUsd } from "@/lib/ai/telemetry/cost";
import type {
  PipelineTelemetryStep,
  WithTelemetryOptions,
} from "@/lib/ai/telemetry/types";
import { characterLength, utf8ByteLength } from "@/lib/ai/telemetry/usage";

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

/**
 * Wrap any pipeline step (AI or deterministic). When no collector is active,
 * runs `fn` unchanged (passthrough). Never swallows errors — records failure
 * then rethrows so behavior is identical.
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
  const inputSummary = resolveSummary(options.inputSummary);
  const inputSize = utf8ByteLength(options.measureInput);
  const promptCharacters =
    options.measureInput !== undefined
      ? characterLength(options.measureInput)
      : null;

  try {
    const result = await fn();
    const finishedAt = new Date();
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
    const estimatedCost =
      options.estimatedCostFromResult?.(result) ??
      estimateTokenCostUsd({
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

    const step: PipelineTelemetryStep = {
      step_name: options.stepName,
      provider: options.provider ?? null,
      model: usage?.model ?? options.model ?? null,
      started_at: startedAt.toISOString(),
      finished_at: finishedAt.toISOString(),
      duration_ms: Date.now() - startMs,
      success,
      retry_count: retryCount,
      repair: options.repair ?? false,
      input_size_bytes: inputSize,
      output_size_bytes:
        outputMeasured !== undefined ? utf8ByteLength(outputMeasured) : null,
      prompt_characters: promptCharacters,
      completion_characters:
        outputMeasured !== undefined ? characterLength(outputMeasured) : null,
      prompt_tokens: usage?.prompt_tokens ?? null,
      completion_tokens: usage?.completion_tokens ?? null,
      cached_tokens: usage?.cached_tokens ?? null,
      estimated_cost: estimatedCost,
      temperature: options.temperature ?? null,
      max_tokens: options.maxTokens ?? null,
      response_format: options.responseFormat ?? null,
      warnings,
      error_message: softError,
      input_summary: inputSummary,
      output_summary: options.outputSummary?.(result) ?? null,
    };
    collector.push(step);
    return result;
  } catch (err) {
    const finishedAt = new Date();
    const message = err instanceof Error ? err.message : String(err);
    collector.push({
      step_name: options.stepName,
      provider: options.provider ?? null,
      model: options.model ?? null,
      started_at: startedAt.toISOString(),
      finished_at: finishedAt.toISOString(),
      duration_ms: Date.now() - startMs,
      success: false,
      retry_count: typeof options.retryCount === "number" ? options.retryCount : 0,
      repair: options.repair ?? false,
      input_size_bytes: inputSize,
      output_size_bytes: null,
      prompt_characters: promptCharacters,
      completion_characters: null,
      prompt_tokens: null,
      completion_tokens: null,
      cached_tokens: null,
      estimated_cost: null,
      temperature: options.temperature ?? null,
      max_tokens: options.maxTokens ?? null,
      response_format: options.responseFormat ?? null,
      warnings: [],
      error_message: message.slice(0, 2000),
      input_summary: inputSummary,
      output_summary: null,
    });
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
  const inputSummary = resolveSummary(options.inputSummary);
  const inputSize = utf8ByteLength(options.measureInput);
  const promptCharacters =
    options.measureInput !== undefined
      ? characterLength(options.measureInput)
      : null;

  try {
    const result = fn();
    const finishedAt = new Date();
    const warnings =
      typeof options.warnings === "function"
        ? options.warnings(result)
        : (options.warnings ?? []);
    const outputMeasured = options.measureOutput
      ? options.measureOutput(result)
      : undefined;

    collector.push({
      step_name: options.stepName,
      provider: options.provider ?? "deterministic",
      model: options.model ?? null,
      started_at: startedAt.toISOString(),
      finished_at: finishedAt.toISOString(),
      duration_ms: Date.now() - startMs,
      success: true,
      retry_count: 0,
      repair: options.repair ?? false,
      input_size_bytes: inputSize,
      output_size_bytes:
        outputMeasured !== undefined ? utf8ByteLength(outputMeasured) : null,
      prompt_characters: promptCharacters,
      completion_characters:
        outputMeasured !== undefined ? characterLength(outputMeasured) : null,
      prompt_tokens: null,
      completion_tokens: null,
      cached_tokens: null,
      estimated_cost: null,
      temperature: null,
      max_tokens: null,
      response_format: null,
      warnings,
      error_message: null,
      input_summary: inputSummary,
      output_summary: options.outputSummary?.(result) ?? null,
    });
    return result;
  } catch (err) {
    const finishedAt = new Date();
    const message = err instanceof Error ? err.message : String(err);
    collector.push({
      step_name: options.stepName,
      provider: options.provider ?? "deterministic",
      model: options.model ?? null,
      started_at: startedAt.toISOString(),
      finished_at: finishedAt.toISOString(),
      duration_ms: Date.now() - startMs,
      success: false,
      retry_count: 0,
      repair: options.repair ?? false,
      input_size_bytes: inputSize,
      output_size_bytes: null,
      prompt_characters: promptCharacters,
      completion_characters: null,
      prompt_tokens: null,
      completion_tokens: null,
      cached_tokens: null,
      estimated_cost: null,
      temperature: null,
      max_tokens: null,
      response_format: null,
      warnings: [],
      error_message: message.slice(0, 2000),
      input_summary: inputSummary,
      output_summary: null,
    });
    throw err;
  }
}
