import { getJsonRepairProvider } from "@/lib/ai/index";
import { generateValidatedJson } from "@/lib/ai/runWithRepair";
import type { WorkflowResult } from "@/lib/ai/workflows/shared";
import {
  buildOpeningImpactPrompt,
  OPENING_IMPACT_SYSTEM,
  type OpeningImpactPromptInput,
} from "@/lib/content-pipeline/prompts/openingImpact";
import { openingImpactSchema } from "@/lib/content-pipeline/schemas";
import type { OpeningImpact } from "@/lib/content-pipeline/types";

const TIMEOUT_MS = 90_000;

/**
 * Opening Impact — OpenAI text provider (same stack as JSON Repair).
 * Creative opening only; JSON Repair remains nested for parse/schema recovery.
 */
export async function runOpeningImpact(
  input: OpeningImpactPromptInput,
): Promise<WorkflowResult<OpeningImpact>> {
  const generated = await generateValidatedJson({
    // OpenAI for Opening Impact (model ownership).
    textProvider: getJsonRepairProvider(),
    system: OPENING_IMPACT_SYSTEM,
    prompt: buildOpeningImpactPrompt(input),
    validator: openingImpactSchema,
    timeoutMs: TIMEOUT_MS,
    maxTransportAttempts: 1,
    telemetry: {
      stepName: "Opening Impact",
      inputSummary:
        "Opening Impact input:\n- Video Concept\n- Product Brain\n- Recent Content Memory",
      outputSummary: (result) =>
        result.ok
          ? `Opening: ${(result.value as OpeningImpact).first_spoken_sentence.slice(0, 80)}`
          : "failed",
    },
  });

  if (!generated.ok) {
    return {
      ok: false,
      error: "generation_failed",
      validationErrors: generated.validationErrors,
      attempts: generated.attempts,
    };
  }

  return { ok: true, data: generated.value };
}
