import { getCopywritingProvider } from "@/lib/ai/index";
import { generateValidatedJson } from "@/lib/ai/runWithRepair";
import type { WorkflowResult } from "@/lib/ai/workflows/shared";
import {
  buildVideoConceptPrompt,
  VIDEO_CONCEPT_SYSTEM,
  type VideoConceptPromptInput,
} from "@/lib/content-pipeline/prompts/videoConcept";
import { videoConceptSchema } from "@/lib/content-pipeline/schemas";
import type { VideoConcept } from "@/lib/content-pipeline/types";

const TIMEOUT_MS = 120_000;

export async function runVideoConcept(
  input: VideoConceptPromptInput,
): Promise<WorkflowResult<VideoConcept>> {
  const generated = await generateValidatedJson({
    textProvider: getCopywritingProvider(),
    system: VIDEO_CONCEPT_SYSTEM,
    prompt: buildVideoConceptPrompt(input),
    validator: videoConceptSchema,
    timeoutMs: TIMEOUT_MS,
    maxTransportAttempts: 1,
    telemetry: {
      stepName: "Video Concept",
      inputSummary:
        "Video Concept input:\n- Product Brain\n- Knowledge Base\n- Recent Content Memory\n- Content Strategy item",
      outputSummary: (result) =>
        result.ok
          ? `Concept: ${(result.value as VideoConcept).title}`
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
