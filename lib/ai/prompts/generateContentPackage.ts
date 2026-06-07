import type { Project } from "@/lib/supabase/types";
import { constraintsBlock, projectBrainBlock } from "@/lib/ai/prompts/context";
import {
  CTA_TYPES_BY_GOAL,
  FUNNEL_STAGE_LABELS,
  REQUIRED_PACKAGE_PLATFORMS,
  type FunnelStage,
} from "@/lib/ai/types";

export interface AssetRef {
  id: string;
  title: string;
  // static | editable | reference
  asset_class: string;
  media_type: string;
}

export interface GenerateContentPackagePromptInput {
  project: Project;
  funnelStage: FunnelStage;
  topic: string;
  angle?: string | null;
  platform?: string | null;
  format?: string | null;
  availableAssets: AssetRef[];
}

export const GENERATE_PACKAGE_SYSTEM =
  "You are the Creative Engine for an AI Content Manager. You generate a " +
  "complete content PACKAGE derived from a weekly strategy item. Video is " +
  "MANDATORY for every package. Produce platform-specific outputs.";

export function buildGenerateContentPackagePrompt(
  input: GenerateContentPackagePromptInput,
): string {
  const { project, funnelStage, topic, angle, availableAssets } = input;
  const allowedCtas = CTA_TYPES_BY_GOAL[project.goal_type] ?? [];
  const funnelLabel = FUNNEL_STAGE_LABELS[funnelStage];

  return [
    projectBrainBlock(project),
    "",
    constraintsBlock(project),
    "",
    `STRATEGY ITEM: funnel_stage="${funnelLabel}" topic="${topic}" angle="${angle ?? ""}"`,
    `CTA type MUST be one of (goal=${project.goal_type}): ${allowedCtas.join(", ")}`,
    "",
    "AVAILABLE ASSETS (asset_usage rules: STATIC must not be modified; " +
      "EDITABLE may have a variant; REFERENCE is inspiration only):",
    availableAssets.length
      ? availableAssets
          .map(
            (a) =>
              `- id=${a.id} class=${a.asset_class} type=${a.media_type} "${a.title}"`,
          )
          .join("\n")
      : "(none)",
    "",
    "TASK: Produce ONE content package as JSON with this exact shape:",
    `{
  "title": "string",
  "funnel_stage": "${funnelLabel}",
  "hook": "string",
  "voiceover_text": "string",
  "subtitles": "string",
  "cta": { "type": "one of allowed cta types", "text": "string" },
  "video": { "concept": "string", "script": "string", "duration_seconds": "string" },
  "platform_outputs": {
${REQUIRED_PACKAGE_PLATFORMS.map(
  (p) =>
    `    "${p}": { "caption": "string", "cta": "string", "hashtags": ["string"], "format": "string" }`,
).join(",\n")}
  },
  "hashtags": ["string"],
  "image_prompts": ["string"],
  "asset_usage": [ { "asset_id": "uuid", "used_as": "string", "modify": "true|false" } ]
}`,
    `Rules: funnel_stage MUST equal "${funnelLabel}". video is mandatory. ` +
      "Provide outputs for ALL required platforms. Never modify a STATIC asset.",
  ].join("\n");
}
