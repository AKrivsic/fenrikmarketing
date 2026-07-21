import { getCopywritingProvider } from "@/lib/ai/index";
import { generateValidatedJson } from "@/lib/ai/runWithRepair";
import type { TextProvider } from "@/lib/ai/types";
import type { ValidationIssue } from "@/lib/ai/validateAiOutput";
import {
  buildCreativeIdeationPrompt,
  CREATIVE_IDEATION_SYSTEM,
} from "@/lib/creative-engine-v3/ideationPrompt";
import {
  CREATIVE_IDEATION_EXPECTED_SHAPE,
  creativeIdeationResultValidator,
  validateCreativeIdeationResult,
} from "@/lib/creative-engine-v3/ideationSchema";
import type {
  CreativeBrief,
  CreativeDirection,
  CreativeIdeationResult,
} from "@/lib/creative-engine-v3/types";

/** Transport retries ≥ 3 (do not inherit Presentation's maxTransportAttempts: 1). */
export const CREATIVE_IDEATION_MAX_TRANSPORT_ATTEMPTS = 1;
export const CREATIVE_IDEATION_TIMEOUT_MS = 600_000;
export const CREATIVE_IDEATION_MAX_ATTEMPTS = 3;

export async function runCreativeIdeation(args: {
  brief: CreativeBrief;
  selectedDirections: readonly CreativeDirection[];
  rejectionAppendix?: string | null;
  textProvider?: TextProvider;
  model?: string;
}): Promise<
  | { ok: true; value: CreativeIdeationResult; attempts: number }
  | {
      ok: false;
      error: "generation_failed";
      attempts: number;
      validationErrors: ValidationIssue[];
    }
> {
  const provider = args.textProvider ?? getCopywritingProvider();
  const requiredDirectionIds = args.selectedDirections.map((d) => d.direction_id);
  const prompt = buildCreativeIdeationPrompt({
    brief: args.brief,
    selectedDirections: args.selectedDirections,
    rejectionAppendix: args.rejectionAppendix,
  });

  const result = await generateValidatedJson({
    textProvider: provider,
    system: CREATIVE_IDEATION_SYSTEM,
    prompt,
    validator: creativeIdeationResultValidator,
    expectedShape: CREATIVE_IDEATION_EXPECTED_SHAPE,
    maxAttempts: CREATIVE_IDEATION_MAX_ATTEMPTS,
    temperature: 0.9,
    maxTokens: 8192,
    timeoutMs: CREATIVE_IDEATION_TIMEOUT_MS,
    maxTransportAttempts: CREATIVE_IDEATION_MAX_TRANSPORT_ATTEMPTS,
    telemetry: {
      stepName: "Creative Ideation",
      inputSummary: `topic=${args.brief.strategy.topic}; directions=${args.selectedDirections.length}`,
      outputSummary: (r) =>
        r.ok
          ? `concepts=${(r.value as CreativeIdeationResult).concepts.length}`
          : `failed: ${r.validationErrors.map((e) => e.message).slice(0, 2).join("; ")}`,
    },
  });

  if (!result.ok) {
    return {
      ok: false,
      error: "generation_failed",
      attempts: result.attempts,
      validationErrors: result.validationErrors,
    };
  }

  const checked = validateCreativeIdeationResult(result.value, {
    requiredDirectionIds,
  });
  if (!checked.ok) {
    return {
      ok: false,
      error: "generation_failed",
      attempts: result.attempts,
      validationErrors: checked.issues,
    };
  }

  return {
    ok: true,
    value: checked.value,
    attempts: result.attempts,
  };
}
