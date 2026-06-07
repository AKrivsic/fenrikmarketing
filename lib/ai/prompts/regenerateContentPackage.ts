import {
  buildGenerateContentPackagePrompt,
  type GenerateContentPackagePromptInput,
} from "@/lib/ai/prompts/generateContentPackage";
import { FUNNEL_STAGE_LABELS } from "@/lib/ai/types";

export const REGENERATE_PACKAGE_SYSTEM =
  "You are the Creative Engine regenerating an existing content package. You " +
  "MUST preserve the strategic context (funnel_stage, topic, strategy item). " +
  "Produce a fresh creative take that addresses the feedback. Video remains " +
  "mandatory.";

export interface RegenerateContentPackagePromptInput
  extends GenerateContentPackagePromptInput {
  previousTitle: string;
  feedback?: string | null;
}

export function buildRegenerateContentPackagePrompt(
  input: RegenerateContentPackagePromptInput,
): string {
  const base = buildGenerateContentPackagePrompt(input);
  return [
    base,
    "",
    "REGENERATION CONTEXT (preserve strategic context, change the creative):",
    `- previous_title: "${input.previousTitle}"`,
    `- funnel_stage is fixed at: ${FUNNEL_STAGE_LABELS[input.funnelStage]}`,
    `- feedback to address: ${input.feedback ?? "(none provided — improve hook, clarity and platform fit)"}`,
  ].join("\n");
}
