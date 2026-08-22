import { getCopywritingProvider } from "@/lib/ai/index";
import { generateValidatedJson } from "@/lib/ai/runWithRepair";
import {
  buildContentPackageSchema,
  type ContentPackageOutput,
} from "@/lib/ai/schemas/contentPackage";
import type { WorkflowResult } from "@/lib/ai/workflows/shared";
import type { makePackageGuardrails } from "@/lib/ai/workflows/packageShared";
import {
  buildContentPackagePrompt,
  buildContentPackageSystem,
  type ContentPackagePromptInput,
} from "@/lib/content-pipeline/prompts/contentPackage";
import { buildContentPackageExpectedShape } from "@/lib/content-pipeline/prompts/contentPackageVisualScenes";
import {
  allowedCtaTypesForFunnelStage,
  ctaRequirementForFunnelStage,
} from "@/lib/content-pipeline/prompts/contentPackageContract";
import { alignOpeningVoiceover } from "@/lib/content-pipeline/alignOpeningVoiceover";
import { packageNeedsSocialImage } from "@/lib/content-package/socialImage";

const TIMEOUT_MS = 180_000;

/** Explicit primary Claude attempts after prompt+repair hardening (was implicit 3). */
export const CONTENT_PACKAGE_MAX_ATTEMPTS = 2;

export async function runContentPackageGeneration(args: {
  promptInput: ContentPackagePromptInput;
  guardrails: ReturnType<typeof makePackageGuardrails>;
}): Promise<WorkflowResult<ContentPackageOutput>> {
  const { promptInput, guardrails } = args;
  const allowedCtaTypes = allowedCtaTypesForFunnelStage({
    funnelStage: promptInput.funnelStage,
    goalType: promptInput.project.goal_type,
  });
  const ctaRequired =
    ctaRequirementForFunnelStage(promptInput.funnelStage) ===
    "required_business";
  const requireSocialImage = packageNeedsSocialImage(
    promptInput.targetPlatforms,
  );

  const generated = await generateValidatedJson({
    textProvider: getCopywritingProvider(),
    system: buildContentPackageSystem(
      promptInput.requireVideo,
      requireSocialImage,
      promptInput.packageVideoMode === "text_to_video",
    ),
    prompt: buildContentPackagePrompt(promptInput),
    validator: buildContentPackageSchema(promptInput.targetPlatforms, {
      requireVideo: promptInput.requireVideo,
      allowedCtaTypes,
      ctaRequired,
      requireSocialImage,
    }),
    expectedShape: buildContentPackageExpectedShape({
      goalType: promptInput.project.goal_type,
      funnelStage: promptInput.funnelStage,
      allowedCtaTypes,
      ctaRequired,
      requireSocialImage,
    }),
    // Allow one OpenAI repair pass on guardrail failures (voiceover length, etc.)
    // before a Claude regenerate — still capped by CONTENT_PACKAGE_MAX_ATTEMPTS.
    repairGuardrailFailures: true,
    guardrails,
    timeoutMs: TIMEOUT_MS,
    maxTransportAttempts: 1,
    maxAttempts: CONTENT_PACKAGE_MAX_ATTEMPTS,
    telemetry: {
      stepName: "Content Package",
      inputSummary:
        "Content Package input:\n- Video Concept\n- Opening Impact\n- Visual Identity\n- Product Brain\n- Strategy Item",
      outputSummary: (result) =>
        result.ok
          ? `Package: ${(result.value as ContentPackageOutput).title}`
          : "failed",
    },
  });

  if (!generated.ok) {
    return {
      ok: false,
      error: "generation_failed",
      validationErrors: generated.validationErrors,
      attempts: generated.attempts,
      lastRaw: generated.lastRaw,
    };
  }

  // Still path: Opening Impact owns hook. T2V: Claude package owns hook — do not rewrite.
  if (promptInput.packageVideoMode !== "text_to_video") {
    const aligned = alignOpeningVoiceover({
      opening: promptInput.openingImpact.first_spoken_sentence,
      voiceover: generated.value.voiceover_text,
    });
    if (aligned.hook) {
      generated.value.hook = aligned.hook;
      generated.value.voiceover_text = aligned.voiceover_text;
    }
  }

  return { ok: true, data: generated.value };
}
