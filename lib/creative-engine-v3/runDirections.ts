import { getCopywritingProvider } from "@/lib/ai/index";
import { generateValidatedJson } from "@/lib/ai/runWithRepair";
import type { TextProvider } from "@/lib/ai/types";
import type { ValidationIssue } from "@/lib/ai/validateAiOutput";
import {
  buildCreativeDirectionPrompt,
  CREATIVE_DIRECTION_SYSTEM,
} from "@/lib/creative-engine-v3/directionPrompt";
import {
  CREATIVE_DIRECTION_EXPECTED_SHAPE,
  creativeDirectionGenerationValidator,
} from "@/lib/creative-engine-v3/directionSchema";
import type {
  CreativeBrief,
  CreativeDirectionGenerationResult,
} from "@/lib/creative-engine-v3/types";

export const CREATIVE_DIRECTION_MAX_TRANSPORT_ATTEMPTS = 3;
export const CREATIVE_DIRECTION_TIMEOUT_MS = 90_000;

export async function runCreativeDirectionGeneration(args: {
  brief: CreativeBrief;
  rejectionAppendix?: string | null;
  textProvider?: TextProvider;
}): Promise<
  | { ok: true; value: CreativeDirectionGenerationResult; attempts: number }
  | {
      ok: false;
      error: "generation_failed";
      attempts: number;
      validationErrors: ValidationIssue[];
    }
> {
  const provider = args.textProvider ?? getCopywritingProvider();
  const result = await generateValidatedJson({
    textProvider: provider,
    system: CREATIVE_DIRECTION_SYSTEM,
    prompt: buildCreativeDirectionPrompt({
      brief: args.brief,
      rejectionAppendix: args.rejectionAppendix,
    }),
    validator: creativeDirectionGenerationValidator,
    expectedShape: CREATIVE_DIRECTION_EXPECTED_SHAPE,
    maxAttempts: 3,
    temperature: 0.85,
    maxTokens: 4096,
    timeoutMs: CREATIVE_DIRECTION_TIMEOUT_MS,
    maxTransportAttempts: CREATIVE_DIRECTION_MAX_TRANSPORT_ATTEMPTS,
    telemetry: {
      stepName: "Creative Direction Generation",
      inputSummary: `topic=${args.brief.strategy.topic}`,
      outputSummary: (r) =>
        r.ok
          ? `directions=${(r.value as CreativeDirectionGenerationResult).directions.length}`
          : `failed`,
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

  return {
    ok: true,
    value: {
      version: "creative-direction@1",
      directions: (result.value as CreativeDirectionGenerationResult).directions,
    },
    attempts: result.attempts,
  };
}
