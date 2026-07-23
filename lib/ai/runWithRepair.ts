import { getJsonRepairProvider } from "@/lib/ai/index";
import type { TextProvider } from "@/lib/ai/types";
import {
  buildJsonRepairPrompt,
  JSON_REPAIR_SYSTEM,
} from "@/lib/ai/prompts/jsonRepair";
import {
  safeJsonParse,
  validate,
  type ValidationIssue,
  type Validator,
} from "@/lib/ai/validateAiOutput";
import { withTelemetry } from "@/lib/ai/telemetry/withTelemetry";
import type { ProviderUsageMetrics } from "@/lib/ai/telemetry/types";
import { PRICING_VERSION } from "@/lib/ai/telemetry/cost";

export interface GenerateValidatedJsonTelemetry {
  stepName: string;
  inputSummary?: string;
  outputSummary?: (result: GenerateValidatedJsonResult<unknown>) => string | null;
  /** Mark this LLM call as a repair regenerate (fidelity/story). */
  repair?: boolean;
}

export interface GenerateValidatedJsonInput<T> {
  textProvider: TextProvider;
  system: string;
  prompt: string;
  validator: Validator<T>;
  // Optional business guardrails run after structural validation passes.
  guardrails?: (value: T) => ValidationIssue[];
  // Shape hint forwarded to the JSON repair prompt.
  expectedShape?: string;
  // When true, one JSON repair pass runs after guardrail failure (before retry).
  repairGuardrailFailures?: boolean;
  // Appended to the user prompt on attempts after the first (e.g. validation errors).
  retryPromptAppend?: (ctx: {
    attempt: number;
    issues: ValidationIssue[];
  }) => string;
  maxAttempts?: number;
  temperature?: number;
  maxTokens?: number;
  /** Optional model override forwarded to textProvider.complete. */
  model?: string;
  // Per-call Claude/OpenAI transport overrides forwarded to textProvider.complete.
  timeoutMs?: number;
  maxTransportAttempts?: number;
  // Optional override for the JSON repair provider. Defaults to the OpenAI
  // helper (getJsonRepairProvider); injectable for tests to avoid network.
  repairProvider?: TextProvider;
  /**
   * Optional telemetry label. When a TelemetryCollector is active (via
   * runWithTelemetrySession), records one chronological step. Omitted → no
   * telemetry (backwards compatible).
   */
  telemetry?: GenerateValidatedJsonTelemetry;
}

export type GenerateValidatedJsonResult<T> =
  | { ok: true; value: T; attempts: number; raw: string }
  | {
      ok: false;
      error: "generation_failed";
      attempts: number;
      validationErrors: ValidationIssue[];
      lastRaw?: string;
    };

// Core error-handling flow:
//   1. ask the text provider for JSON
//   2. parse; on parse failure run the OpenAI JSON repair prompt and re-parse
//   3. validate the schema
//   4. run business guardrails (forbidden_claims / product_is_not / etc.)
//   5. on any failure, regenerate — up to maxAttempts (default 3)
//   6. after the final failed attempt return generation_failed + errors
//
// Cost accounting: primary text-provider tokens stay on the outer telemetry
// step. OpenAI JSON repair calls are recorded as separate "JSON Repair" steps
// so Claude and OpenAI pricing are never mixed in one aggregated usage blob.
export async function generateValidatedJson<T>(
  input: GenerateValidatedJsonInput<T>,
): Promise<GenerateValidatedJsonResult<T>> {
  if (!input.telemetry) {
    return runGenerateValidatedJson(input);
  }

  const measureInput = `${input.system ?? ""}\n${input.prompt}`;
  return withTelemetry(
    {
      stepName: input.telemetry.stepName,
      provider: input.textProvider.name,
      repair: input.telemetry.repair ?? false,
      temperature: input.temperature ?? null,
      maxTokens: input.maxTokens ?? null,
      responseFormat: "json",
      inputSummary: input.telemetry.inputSummary ?? null,
      measureInput,
      measureOutput: (result) =>
        result.ok ? result.raw : (result.lastRaw ?? null),
      outputSummary: (result) =>
        input.telemetry?.outputSummary?.(result) ??
        (result.ok
          ? `ok after ${result.attempts} attempt(s)`
          : `failed after ${result.attempts} attempt(s)`),
      retryCount: (result) => Math.max(0, result.attempts - 1),
      successFromResult: (result) => result.ok,
      errorMessageFromResult: (result) =>
        result.ok
          ? null
          : result.validationErrors
              .map((i) => `${i.path}: ${i.message}`)
              .slice(0, 3)
              .join("; ") || "generation_failed",
      warnings: (result) =>
        result.ok
          ? []
          : result.validationErrors.map((i) => `${i.path}: ${i.message}`).slice(0, 8),
      usageFromResult: (result) => {
        const meta = (result as { __telemetryUsage?: ProviderUsageMetrics })
          .__telemetryUsage;
        return meta ?? null;
      },
      pricingVersion: PRICING_VERSION,
      rawUsageFromResult: (result) => {
        const meta = (result as { __telemetryUsage?: ProviderUsageMetrics })
          .__telemetryUsage;
        if (!meta) return null;
        return {
          prompt_tokens: meta.prompt_tokens,
          completion_tokens: meta.completion_tokens,
          cached_tokens: meta.cached_tokens,
          model: meta.model ?? null,
        };
      },
    },
    async () => {
      const result = await runGenerateValidatedJson(input);
      return result;
    },
  );
}

async function runGenerateValidatedJson<T>(
  input: GenerateValidatedJsonInput<T>,
): Promise<GenerateValidatedJsonResult<T> & { __telemetryUsage?: ProviderUsageMetrics }> {
  const {
    textProvider,
    system,
    prompt,
    validator,
    guardrails,
    expectedShape,
    repairGuardrailFailures,
    retryPromptAppend,
    maxAttempts = 3,
    temperature,
    maxTokens,
    model,
    timeoutMs,
    maxTransportAttempts,
    repairProvider,
  } = input;

  let lastIssues: ValidationIssue[] = [];
  let lastRaw: string | undefined;
  let usageAcc: ProviderUsageMetrics = {
    prompt_tokens: null,
    completion_tokens: null,
    cached_tokens: null,
  };
  let sawUsage = false;

  const addPrimaryUsage = (u: TextProviderCompleteUsage | null | undefined) => {
    if (!u) return;
    const hasAny =
      u.prompt_tokens != null ||
      u.completion_tokens != null ||
      u.cached_tokens != null;
    if (!hasAny && !u.model) return;
    sawUsage = true;
    usageAcc = {
      prompt_tokens:
        u.prompt_tokens != null
          ? (usageAcc.prompt_tokens ?? 0) + u.prompt_tokens
          : usageAcc.prompt_tokens,
      completion_tokens:
        u.completion_tokens != null
          ? (usageAcc.completion_tokens ?? 0) + u.completion_tokens
          : usageAcc.completion_tokens,
      cached_tokens:
        u.cached_tokens != null
          ? (usageAcc.cached_tokens ?? 0) + u.cached_tokens
          : usageAcc.cached_tokens,
      // Keep the primary text-provider model — never overwrite with repair model.
      model: usageAcc.model ?? u.model ?? model ?? textProvider.name,
    };
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const effectivePrompt =
      attempt > 1 && retryPromptAppend
        ? prompt + retryPromptAppend({ attempt, issues: lastIssues })
        : prompt;

    const completion = await textProvider.complete({
      system,
      prompt: effectivePrompt,
      json: true,
      temperature,
      maxTokens,
      model,
      timeoutMs,
      maxTransportAttempts,
    });
    lastRaw = completion.text;
    addPrimaryUsage({
      prompt_tokens: completion.usage?.prompt_tokens ?? null,
      completion_tokens: completion.usage?.completion_tokens ?? null,
      cached_tokens: completion.usage?.cached_tokens ?? null,
      model: completion.model,
    });

    // Step 2: parse, with one repair pass if needed.
    let parsed = safeJsonParse(completion.text);
    if (!parsed.ok) {
      const repaired = await repairJson(
        completion.text,
        [],
        repairProvider,
        expectedShape,
      );
      if (repaired) {
        lastRaw = repaired.text;
        parsed = safeJsonParse(repaired.text);
      }
    }

    if (!parsed.ok) {
      lastIssues = [{ path: "$", message: parsed.error ?? "JSON parse failed" }];
      continue;
    }

    // Step 3: structural validation, with one repair pass if needed.
    let result = validate(validator, parsed.value);
    if (!result.ok) {
      const repaired = await repairJson(
        JSON.stringify(parsed.value),
        result.issues,
        repairProvider,
        expectedShape,
      );
      if (repaired) {
        const reparsed = safeJsonParse(repaired.text);
        if (reparsed.ok) {
          lastRaw = repaired.text;
          result = validate(validator, reparsed.value);
        }
      }
    }

    if (!result.ok) {
      lastIssues = result.issues;
      continue;
    }

    // Step 4: business guardrails. Optional one repair pass, then retry/regenerate.
    const guardrailIssues = guardrails ? guardrails(result.value) : [];
    if (guardrailIssues.length > 0) {
      if (repairGuardrailFailures && expectedShape) {
        const repaired = await repairJson(
          JSON.stringify(result.value),
          guardrailIssues,
          repairProvider,
          expectedShape,
        );
        if (repaired) {
          const reparsed = safeJsonParse(repaired.text);
          if (reparsed.ok) {
            const revalidated = validate(validator, reparsed.value);
            if (revalidated.ok) {
              const repairGuardIssues = guardrails
                ? guardrails(revalidated.value)
                : [];
              if (repairGuardIssues.length === 0) {
                return attachUsage({
                  ok: true,
                  value: revalidated.value,
                  attempts: attempt,
                  raw: repaired.text,
                }, sawUsage ? usageAcc : undefined);
              }
            }
          }
        }
      }
      lastIssues = guardrailIssues;
      continue;
    }

    return attachUsage(
      {
        ok: true,
        value: result.value,
        attempts: attempt,
        raw: lastRaw ?? completion.text,
      },
      sawUsage ? usageAcc : undefined,
    );
  }

  return attachUsage(
    {
      ok: false,
      error: "generation_failed",
      attempts: maxAttempts,
      validationErrors: lastIssues,
      lastRaw,
    },
    sawUsage ? usageAcc : undefined,
  );
}

type TextProviderCompleteUsage = ProviderUsageMetrics & { model?: string | null };

function attachUsage<T>(
  result: GenerateValidatedJsonResult<T>,
  usage: ProviderUsageMetrics | undefined,
): GenerateValidatedJsonResult<T> & { __telemetryUsage?: ProviderUsageMetrics } {
  if (!usage) return result;
  return Object.assign(result, { __telemetryUsage: usage });
}

async function repairJson(
  brokenOutput: string,
  issues: ValidationIssue[],
  repairProvider: TextProvider | undefined,
  expectedShape?: string,
): Promise<{ text: string; usage: TextProviderCompleteUsage | null } | null> {
  const provider = repairProvider ?? getJsonRepairProvider();
  try {
    return await withTelemetry(
      {
        stepName: "JSON Repair",
        provider: provider.name,
        model: null,
        repair: true,
        responseFormat: "json",
        temperature: 0,
        inputSummary: "JSON Repair input:\n- Broken model output\n- Validation issues",
        measureInput: brokenOutput,
        measureOutput: (r) => (r ? r.text : null),
        outputSummary: (r) => (r ? "repaired JSON" : "repair unavailable"),
        successFromResult: (r) => r != null,
        usageFromResult: (r) =>
          r?.usage
            ? {
                prompt_tokens: r.usage.prompt_tokens ?? null,
                completion_tokens: r.usage.completion_tokens ?? null,
                cached_tokens: r.usage.cached_tokens ?? null,
                model: r.usage.model ?? null,
              }
            : null,
        pricingVersion: PRICING_VERSION,
        rawUsageFromResult: (r) =>
          r?.usage
            ? {
                prompt_tokens: r.usage.prompt_tokens,
                completion_tokens: r.usage.completion_tokens,
                cached_tokens: r.usage.cached_tokens,
                model: r.usage.model ?? null,
              }
            : null,
      },
      async () => {
        const completion = await provider.complete({
          system: JSON_REPAIR_SYSTEM,
          prompt: buildJsonRepairPrompt({ brokenOutput, issues, expectedShape }),
          json: true,
          temperature: 0,
        });
        return {
          text: completion.text,
          usage: completion.usage
            ? { ...completion.usage, model: completion.model }
            : {
                prompt_tokens: null,
                completion_tokens: null,
                cached_tokens: null,
                model: completion.model,
              },
        };
      },
    );
  } catch {
    // Repair provider unavailable (e.g. missing key) — fall back to the
    // original output and let validation fail naturally.
    return null;
  }
}
