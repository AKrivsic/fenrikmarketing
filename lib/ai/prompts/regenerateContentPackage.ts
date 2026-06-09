import {
  buildGenerateContentPackagePrompt,
  type GenerateContentPackagePromptInput,
} from "@/lib/ai/prompts/generateContentPackage";
import { buildRegenerateCreativeSeedSalt } from "@/lib/ai/prompts/creativeDirectives";
import { FUNNEL_STAGE_LABELS } from "@/lib/ai/types";

const REGENERATE_SYSTEM_INTRO =
  "You are the Creative Engine regenerating an existing content package. You " +
  "MUST preserve the strategic context (funnel_stage, topic, strategy item). " +
  "Produce a fresh creative take that addresses the feedback. ";

// Builds the regenerate system message. requireVideo=true keeps the historical
// "Video remains mandatory." wording; false switches to the text-only variant.
export function buildRegeneratePackageSystem(requireVideo: boolean): string {
  return (
    REGENERATE_SYSTEM_INTRO +
    (requireVideo
      ? "Video remains mandatory."
      : "This is a TEXT-ONLY package: do NOT produce a video — omit the video " +
        "concept/script. Still produce platform copy, captions, CTA, hashtags " +
        "and the required body/narration fields.")
  );
}

// Backwards-compatible constant: the video-mandatory system message.
export const REGENERATE_PACKAGE_SYSTEM = buildRegeneratePackageSystem(true);

export interface RegenerateContentPackagePromptInput
  extends GenerateContentPackagePromptInput {
  previousTitle: string;
  feedback?: string | null;
}

export function buildRegenerateContentPackagePrompt(
  input: RegenerateContentPackagePromptInput,
): string {
  // Content Quality V3 — fold the previous title + feedback into the creative
  // seed so a regeneration deterministically lands on a DIFFERENT creative
  // directive (mode / hook archetype / voice persona) than the original
  // package, which used no salt. (When the workflow injects `directives`, the
  // base prompt uses those directly and this salt is moot — but kept identical
  // so any non-injected caller still resolves the same directive.)
  const creativeSeedSalt = buildRegenerateCreativeSeedSalt(
    input.previousTitle,
    input.feedback ?? null,
  );
  const base = buildGenerateContentPackagePrompt({ ...input, creativeSeedSalt });
  return [
    base,
    "",
    "REGENERATION CONTEXT (preserve strategic context, change the creative):",
    `- previous_title: "${input.previousTitle}"`,
    `- funnel_stage is fixed at: ${FUNNEL_STAGE_LABELS[input.funnelStage]}`,
    `- feedback to address: ${input.feedback ?? "(none provided — improve hook, clarity and platform fit)"}`,
  ].join("\n");
}
