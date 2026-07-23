import type { Project } from "@/lib/supabase/types";
import { buildSampleProductClarityBlock } from "@/lib/ai/prompts/sampleProductClarity";

export function buildSamplePackageRulesBlock(): string {
  return [
    "SAMPLE PACKAGE RULES",
    "",
    "This content serves as a sample for the product owner.",
    "",
    "The goal is NOT to create the best organic content.",
    "",
    "The goal is for the product owner to recognize themselves within seconds.",
    "",
    "If quality product assets exist:",
    "- prefer product UI when the renderer can show it in a framed insert (laptop, phone, monitor, floating card)",
    "- prefer homepage visuals",
    "- prefer logo",
    "- prefer hero image",
    "",
    "Use 0–2 assets when they improve the story — never force an asset.",
    "",
    "It is better to use a relevant framed asset than a generic AI image when placement is concrete.",
    "",
    "Assets are NOT mandatory. Empty asset_usage is always valid.",
    "If a static asset cannot be shown well (full scene with people, unknown video_usage, raw crop), use IMAGE instead.",
    "If assets are not quality or not relevant, do not use them.",
  ].join("\n");
}

/** Prompt appendix inserted only when generationMode === "sample". */
export function buildSampleModePromptAppendix(project: Project): string {
  return [buildSamplePackageRulesBlock(), buildSampleProductClarityBlock(project)].join(
    "\n\n",
  );
}
