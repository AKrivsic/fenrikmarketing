import type { Project } from "@/lib/supabase/types";
import {
  antiRepetitionBlock,
  constraintsBlock,
  projectBrainBlock,
  proofBlock,
  scenarioBlock,
} from "@/lib/ai/prompts/context";
import {
  type AntiRepetitionMemory,
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
  // Phase 2E — recent hooks/topics/CTAs/scenarios to avoid repeating.
  memory?: AntiRepetitionMemory;
  // Platform surfaces the package must produce. Defaults to the full required
  // set; callers pass the project's resolved platforms to respect
  // projects.platforms.
  targetPlatforms?: readonly string[];
}

export const GENERATE_PACKAGE_SYSTEM =
  "You are the Creative Engine for an AI Content Manager. You generate a " +
  "complete content PACKAGE derived from a weekly strategy item. Video is " +
  "MANDATORY for every package and is a fast-paced vertical SHORT (TikTok / " +
  "Instagram Reels / YouTube Shorts share ONE video). The first 3 seconds (the " +
  "hook) decide everything. Produce platform-specific outputs.";

export function buildGenerateContentPackagePrompt(
  input: GenerateContentPackagePromptInput,
): string {
  const { project, funnelStage, topic, angle, availableAssets } = input;
  const allowedCtas = CTA_TYPES_BY_GOAL[project.goal_type] ?? [];
  const funnelLabel = FUNNEL_STAGE_LABELS[funnelStage];
  const targetPlatforms =
    input.targetPlatforms && input.targetPlatforms.length > 0
      ? input.targetPlatforms
      : REQUIRED_PACKAGE_PLATFORMS;
  const proof = proofBlock(project);
  const scenarios = scenarioBlock(project);
  const memory = input.memory ? antiRepetitionBlock(input.memory) : "";

  return [
    projectBrainBlock(project),
    "",
    constraintsBlock(project),
    ...(proof ? ["", proof] : []),
    ...(scenarios ? ["", scenarios] : []),
    ...(memory ? ["", memory] : []),
    "",
    `STRATEGY ITEM: funnel_stage="${funnelLabel}" topic="${topic}" angle="${angle ?? ""}"`,
    `CTA type MUST be one of (goal=${project.goal_type}): ${allowedCtas.join(", ")}`,
    "",
    "HOOK V2 (the first 3 seconds — make it dramatically stronger):",
    "- Open on a concrete moment: pull from the SCENARIO POOL, a sharp PAIN",
    "  POINT, or a striking PROOF point above. Avoid generic intros.",
    "- The hook must create curiosity or tension in one short, punchy line.",
    "- voiceover_text MUST start with that hook, then flow Problem -> Scenario",
    "  -> Proof -> CTA so the narration maps onto fast visual beats.",
    "",
    "VISUAL BEATS: provide 5–8 image_prompts, one per distinct visual moment of",
    "the arc (hook, problem, scenario, proof, CTA). They will be shown as short",
    "moving beats, so make them visually distinct from each other.",
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
${targetPlatforms
  .map(
    (p) =>
      `    "${p}": { "caption": "string", "cta": "string", "hashtags": ["string"], "format": "string" }`,
  )
  .join(",\n")}
  },
  "hashtags": ["string"],
  "image_prompts": ["string"],
  "asset_usage": [ { "asset_id": "uuid", "used_as": "string", "modify": "true|false" } ],
  "scenario": "the SCENARIO POOL line you drew on (verbatim), or \"\" if none"
}`,
    `Rules: funnel_stage MUST equal "${funnelLabel}". video is mandatory. ` +
      `Provide outputs for ALL of these platforms: ${targetPlatforms.join(", ")}. ` +
      "Never modify a STATIC asset. " +
      "If you used a scenario, set \"scenario\" to that pool line verbatim; " +
      "otherwise set it to an empty string.",
  ].join("\n");
}
