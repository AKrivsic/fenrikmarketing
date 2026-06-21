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
  // Per-call Claude/OpenAI transport overrides forwarded to textProvider.complete.
  timeoutMs?: number;
  maxTransportAttempts?: number;
  // Optional override for the JSON repair provider. Defaults to the OpenAI
  // helper (getJsonRepairProvider); injectable for tests to avoid network.
  repairProvider?: TextProvider;
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
export async function generateValidatedJson<T>(
  input: GenerateValidatedJsonInput<T>,
): Promise<GenerateValidatedJsonResult<T>> {
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
    timeoutMs,
    maxTransportAttempts,
    repairProvider,
  } = input;

  let lastIssues: ValidationIssue[] = [];
  let lastRaw: string | undefined;

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
      timeoutMs,
      maxTransportAttempts,
    });
    lastRaw = completion.text;

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
        lastRaw = repaired;
        parsed = safeJsonParse(repaired);
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
        const reparsed = safeJsonParse(repaired);
        if (reparsed.ok) {
          lastRaw = repaired;
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
          const reparsed = safeJsonParse(repaired);
          if (reparsed.ok) {
            const revalidated = validate(validator, reparsed.value);
            if (revalidated.ok) {
              const repairGuardIssues = guardrails
                ? guardrails(revalidated.value)
                : [];
              if (repairGuardIssues.length === 0) {
                return {
                  ok: true,
                  value: revalidated.value,
                  attempts: attempt,
                  raw: repaired,
                };
              }
            }
          }
        }
      }
      lastIssues = guardrailIssues;
      continue;
    }

    return { ok: true, value: result.value, attempts: attempt, raw: lastRaw };
  }

  return {
    ok: false,
    error: "generation_failed",
    attempts: maxAttempts,
    validationErrors: lastIssues,
    lastRaw,
  };
}

async function repairJson(
  brokenOutput: string,
  issues: ValidationIssue[],
  repairProvider: TextProvider | undefined,
  expectedShape?: string,
): Promise<string | null> {
  try {
    const provider = repairProvider ?? getJsonRepairProvider();
    const completion = await provider.complete({
      system: JSON_REPAIR_SYSTEM,
      prompt: buildJsonRepairPrompt({ brokenOutput, issues, expectedShape }),
      json: true,
      temperature: 0,
    });
    return completion.text;
  } catch {
    // Repair provider unavailable (e.g. missing key) — fall back to the
    // original output and let validation fail naturally.
    return null;
  }
}
