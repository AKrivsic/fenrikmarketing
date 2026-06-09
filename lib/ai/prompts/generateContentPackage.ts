import type { Project } from "@/lib/supabase/types";
import {
  antiRepetitionBlock,
  constraintsBlock,
  projectBrainBlock,
  proofBlock,
  scenarioBlock,
} from "@/lib/ai/prompts/context";
import {
  buildCreativeDirectiveBlock,
  pickCreativeDirectives,
} from "@/lib/ai/prompts/creativeDirectives";
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
  // P3 runtime — whether this package must include a video (true when at least
  // one selected platform is video-typed). Defaults to true (video required),
  // which keeps the historical prompt unchanged for video packages.
  requireVideo?: boolean;
  // The subset of targetPlatforms that are video-typed. Used only to phrase a
  // mixed-package note; empty when unknown.
  videoPlatforms?: readonly string[];
  // Content Quality V3 — optional extra salt mixed into the creative-directive
  // seed. Generation leaves it empty (seed = funnel/topic/angle); regeneration
  // sets it from the previous title + feedback so a regenerated package gets a
  // different creative directive than the original.
  creativeSeedSalt?: string;
}

const PACKAGE_SYSTEM_INTRO =
  "You are the Creative Engine for an AI Content Manager. You generate a " +
  "complete content PACKAGE derived from a weekly strategy item. ";

const PACKAGE_SYSTEM_VIDEO =
  "Video is MANDATORY for every package and is a fast-paced vertical SHORT (TikTok / " +
  "Instagram Reels / YouTube Shorts share ONE video). The first 3 seconds (the " +
  "hook) decide everything. Produce platform-specific outputs.";

const PACKAGE_SYSTEM_TEXT_ONLY =
  "This is a TEXT-ONLY package: do NOT produce a video. Do not generate a video " +
  "concept or script. Produce platform-specific written copy (captions, CTA, " +
  "hashtags) plus the required body/narration fields. The first line (the hook) " +
  "still decides everything — it opens the copy.";

// Builds the system message for content-package generation. requireVideo=true
// keeps the historical, video-mandatory system message; false switches to the
// text-only variant.
export function buildGeneratePackageSystem(requireVideo: boolean): string {
  return (
    PACKAGE_SYSTEM_INTRO +
    (requireVideo ? PACKAGE_SYSTEM_VIDEO : PACKAGE_SYSTEM_TEXT_ONLY)
  );
}

// Backwards-compatible constant: the video-mandatory system message.
export const GENERATE_PACKAGE_SYSTEM = buildGeneratePackageSystem(true);

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
  const requireVideo = input.requireVideo ?? true;
  const videoPlatforms = input.videoPlatforms ?? [];
  const textOnlyPlatforms = targetPlatforms.filter(
    (p) => !videoPlatforms.includes(p),
  );
  // Mixed only matters for video packages: ≥1 video platform AND ≥1 text-only.
  const isMixed =
    requireVideo && videoPlatforms.length > 0 && textOnlyPlatforms.length > 0;

  const proof = proofBlock(project);
  const scenarios = scenarioBlock(project);
  const memory = input.memory ? antiRepetitionBlock(input.memory) : "";

  // Content Quality V3 — deterministic creative directives derived from the
  // strategy item (and an optional regeneration salt). Same inputs -> same
  // directive; different topic/angle -> different directive. Prompt-only: no
  // new JSON output field, no DB, no workflow change.
  const directives = pickCreativeDirectives(
    [funnelLabel, topic, angle ?? "", input.creativeSeedSalt ?? ""].join("|"),
  );
  const creativeDirective = buildCreativeDirectiveBlock(directives);

  // Hook block. The final narration line differs for text-only (no visual beats).
  const hookLines = [
    "HOOK V2 (the first 3 seconds — make it dramatically stronger):",
    `- Write the hook in the "${directives.hook.id}" HOOK ARCHETYPE above: ${directives.hook.instruction}`,
    "- Open on a concrete moment: pull from the SCENARIO POOL, a sharp PAIN",
    "  POINT, or a striking PROOF point above. Never use a generic intro.",
    "- The hook must create curiosity or tension in one short, punchy line.",
    ...(requireVideo
      ? [
          "- voiceover_text MUST start with that hook, then flow Problem -> Scenario",
          "  -> Proof -> CTA, narrated in the VOICE PERSONA and MODE above so the",
          "  narration maps onto fast visual beats.",
        ]
      : [
          "- voiceover_text MUST start with that hook, then flow Problem -> Scenario",
          "  -> Proof -> CTA, written in the VOICE PERSONA and MODE above. It is the",
          "  core body copy for this TEXT-ONLY package (no video, no visual beats).",
        ]),
  ];

  // Visual beats / image prompts only apply to video packages.
  const visualBeatsLines = requireVideo
    ? [
        "",
        "VISUAL BEATS: provide 5–8 image_prompts, one per distinct visual moment of",
        "the arc (hook, problem, scenario, proof, CTA). They will be shown as short",
        "moving beats, so make them visually distinct from each other.",
      ]
    : [];

  // JSON shape, assembled so the video/image_prompts fields are present only
  // when a video is required (video packages keep the exact historical shape).
  const platformOutputsBlock = targetPlatforms
    .map(
      (p) =>
        `    "${p}": { "caption": "string", "cta": "string", "hashtags": ["string"], "format": "string" }`,
    )
    .join(",\n");
  const jsonShape = [
    "{",
    `  "title": "string",`,
    `  "funnel_stage": "${funnelLabel}",`,
    `  "hook": "string",`,
    `  "voiceover_text": "string",`,
    `  "subtitles": "string",`,
    `  "cta": { "type": "one of allowed cta types", "text": "string" },`,
    ...(requireVideo
      ? [
          `  "video": { "concept": "string", "script": "string", "duration_seconds": "string" },`,
        ]
      : []),
    `  "platform_outputs": {`,
    platformOutputsBlock,
    `  },`,
    `  "hashtags": ["string"],`,
    ...(requireVideo ? [`  "image_prompts": ["string"],`] : []),
    `  "asset_usage": [ { "asset_id": "uuid", "used_as": "string", "modify": "true|false" } ],`,
    `  "scenario": "the SCENARIO POOL line you drew on (verbatim), or \"\" if none"`,
    "}",
  ].join("\n");

  // Rules line. Video packages keep the historical wording verbatim; text-only
  // packages explicitly forbid a video and keep the schema-required narration.
  const rulesLine = requireVideo
    ? `Rules: funnel_stage MUST equal "${funnelLabel}". video is mandatory. ` +
      `Provide outputs for ALL of these platforms: ${targetPlatforms.join(", ")}. ` +
      "Never modify a STATIC asset. " +
      'If you used a scenario, set "scenario" to that pool line verbatim; ' +
      "otherwise set it to an empty string."
    : `Rules: funnel_stage MUST equal "${funnelLabel}". This is a TEXT-ONLY package: ` +
      'do NOT generate a video — omit the "video" field entirely. ' +
      `Provide outputs for ALL of these platforms: ${targetPlatforms.join(", ")}. ` +
      "Still produce voiceover_text (use it as the body copy) and subtitles (a short " +
      "text version) — they are required. Never modify a STATIC asset. " +
      'If you used a scenario, set "scenario" to that pool line verbatim; ' +
      "otherwise set it to an empty string.";

  // Mixed-package clarification (video packages that also target text-only
  // platforms). Appended only when mixed, so pure-video packages are unchanged.
  const mixedNote = isMixed
    ? [
        "",
        `MIXED PLATFORMS: video is required because ${videoPlatforms.join(", ")} ` +
          `${videoPlatforms.length === 1 ? "is a video platform" : "are video platforms"}. ` +
          "Produce ONE shared video for the package. The text-only platforms " +
          `(${textOnlyPlatforms.join(", ")}) still need their own platform-specific ` +
          "caption, CTA and hashtags — they simply do not get a separate video.",
      ]
    : [];

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
    creativeDirective,
    "",
    ...hookLines,
    ...visualBeatsLines,
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
    jsonShape,
    rulesLine,
    ...mixedNote,
  ].join("\n");
}
