/**
 * Shared Content Package visual_scenes + expectedShape contract.
 * Aligned with generatedVisualSceneEntryValidator (legacy IMAGE preferred).
 */

import type { GoalType } from "@/lib/supabase/types";
import { MAX_VIDEO_SCENE_STILLS } from "@/lib/video-engine/storyboard";
import {
  allowedCtaTypesForFunnelStage,
  buildContentPackageCtaExpectedShapeLine,
  buildContentPackageVoiceoverExpectedShapeLine,
  exampleCtaTypeForGoal,
  exampleCtaTypeForStage,
} from "@/lib/content-pipeline/prompts/contentPackageContract";

/** Prompt block documenting legal visual_scenes shapes for Content Package. */
export function buildContentPackageVisualScenesBlock(args: {
  requireVideo: boolean;
}): string {
  const minScenes = args.requireVideo ? 3 : 1;
  const maxScenes = MAX_VIDEO_SCENE_STILLS;
  return [
    "VISUAL_SCENES CONTRACT (strict — validator rejects unrecognized shapes):",
    args.requireVideo
      ? `- For video packages, visual_scenes is REQUIRED with ${minScenes}–${maxScenes} entries.`
      : `- When present, visual_scenes must have ${minScenes}–${maxScenes} entries.`,
    "- Prefer flat legacy IMAGE scenes for ordinary video beats:",
    '  { "source": "ai", "image_prompt": "A concrete visual description for one scene" }',
    '  { "source": "asset", "asset_id": "existing-asset-uuid", "used_as": "background, product reference, screen content, or other clear usage" }',
    "- Do NOT invent field names like description, prompt, visual, scene_prompt, scene, or content.",
    "- Do NOT mix legacy and typed formats in one object.",
    '- Do NOT use { "type": "IMAGE", "image_prompt": "..." } — that shape is invalid.',
    '- Typed IMAGE (discouraged) would need { "type": "IMAGE", "payload": { "source": "ai", "image_prompt": "..." } }; prefer flat legacy instead.',
    "- Every AI scene needs a non-empty image_prompt.",
    "- Every asset scene needs a valid asset_id from AVAILABLE ASSETS and a non-empty used_as string.",
    "- Do not reference an asset_id that is not listed in AVAILABLE ASSETS.",
    "",
    "Optional typed non-image scenes (use only when truly needed; otherwise stay legacy IMAGE):",
    '  { "type": "CHECKLIST", "payload": { "title": "optional", "items": ["item one", "item two"] } }',
    '  { "type": "PHONE", "payload": { "asset_id": "uuid from AVAILABLE ASSETS", "caption": "optional" } }',
    '  { "type": "PHONE", "payload": { "image_prompt": "tight mobile UI only", "caption": "optional" } }',
    '  { "type": "QUOTE", "payload": { "quote": "string", "attribution": "string", "proof_id": "string", "context": "optional" } }',
    '  { "type": "STATISTIC", "payload": { "value": "string", "label": "string", "proof_id": "string", "unit": "optional", "source_line": "optional" } }',
    '  { "type": "CTA", "payload": { "headline": "string", "subline": "optional", "button_label": "optional", "show_logo": true } }',
    '- Typed scenes MUST be exactly { "type": "...", "payload": { ... } } with the fields above.',
    "",
    "EXAMPLE — valid IMAGE-only visual_scenes:",
    '  "visual_scenes": [',
    '    { "source": "ai", "image_prompt": "Owner at desk answering emails in warm office light" },',
    '    { "source": "ai", "image_prompt": "Empty website contact form at night on a laptop screen" },',
    '    { "source": "asset", "asset_id": "<uuid from AVAILABLE ASSETS>", "used_as": "product UI shown as framed insert" }',
    "  ]",
  ].join("\n");
}

/**
 * Shared platform_outputs caption / variants contract (prompt + expectedShape + repair).
 * Schema always requires caption; variants never replace it (incident b343).
 */
export function buildContentPackagePlatformOutputsContractBlock(): string {
  return [
    "PLATFORM_OUTPUTS FIELD TYPES (strict):",
    "- caption: REQUIRED non-empty string on EVERY platform (never an object, never omitted).",
    "- cta: OPTIONAL string or null/omit (never an object, never empty string, never the literals \"null\"/\"undefined\").",
    "- When package cta is null, omit platform cta or set null — captions must publish standalone.",
    "- When package cta is present, platform cta SHOULD mirror that text (short platform-native paraphrase ok).",
    "- hashtags: string[] when present.",
    "- format: string when present.",
    "- caption_variants: string[] ONLY when VARIANT COUNTS require them — they are IN ADDITION to caption, never a replacement.",
    "- title_variants: string[] ONLY for x when VARIANT COUNTS require them — IN ADDITION to caption.",
    "- When caption_variants is present, you MUST also set caption = caption_variants[0] (same string).",
    "- LinkedIn with variants: must include caption AND caption_variants.",
    "- X with variants: must include caption AND caption_variants AND title_variants.",
    "- Never put an object where a string is required.",
  ].join("\n");
}

export interface BuildContentPackageExpectedShapeOptions {
  goalType?: GoalType | string | null;
  funnelStage?: string | null;
  allowedCtaTypes?: readonly string[];
  ctaRequired?: boolean;
}

/** Compact expectedShape forwarded to JSON repair for Content Package. */
export function buildContentPackageExpectedShape(
  options: BuildContentPackageExpectedShapeOptions = {},
): string {
  const ctaRequired = options.ctaRequired ?? false;
  const allowed =
    options.allowedCtaTypes ??
    allowedCtaTypesForFunnelStage({
      funnelStage: options.funnelStage ?? null,
      goalType: options.goalType ?? null,
    });
  const exampleType =
    exampleCtaTypeForStage({
      funnelStage: options.funnelStage ?? null,
      goalType: options.goalType ?? null,
    }) ?? exampleCtaTypeForGoal(options.goalType ?? null);
  const ctaTypeHint =
    allowed.length > 0
      ? `one of: ${allowed.join(" | ")}`
      : "follow | save | comment | share | lead | contact | book | request_quote | sign_up";

  const ctaSkeleton = ctaRequired
    ? { type: ctaTypeHint, text: "non-empty string" }
    : null;

  return [
    "Return a single JSON object. Preserve valid creative content; fix structure/types only.",
    "Use ONLY these visual_scenes shapes (prefer legacy IMAGE):",
    '{ "source": "ai", "image_prompt": "string" }',
    '{ "source": "asset", "asset_id": "uuid", "used_as": "string" }',
    'Optional typed: { "type": "CHECKLIST"|"PHONE"|"QUOTE"|"STATISTIC"|"CTA", "payload": { ... } }',
    'Do NOT use { "type": "IMAGE", "image_prompt": "..." } or invented fields (description, prompt, visual).',
    "video.duration_seconds must be a string when present.",
    buildContentPackagePlatformOutputsContractBlock(),
    "If $.platform_outputs.<platform>.caption is missing/invalid and caption_variants[0] is a non-empty string, set caption = caption_variants[0].",
    buildContentPackageCtaExpectedShapeLine({ allowedCtaTypes: allowed, ctaRequired }),
    ctaRequired
      ? `If cta is missing/null, add a business CTA with type "${exampleType}" and a short non-empty text. If cta.type is invalid, change ONLY cta.type to the closest allowed value; preserve cta.text when valid.`
      : `If cta is invalid for this funnel stage, set cta to null OR change cta.type to a soft CTA (e.g. "follow"). Never use project.goal_type as cta.type. Never use empty string.`,
    buildContentPackageVoiceoverExpectedShapeLine(),
    "If voiceover_text exceeds the hard maximum, shorten it to at most 80 words (prefer 40–70): keep the hook and main argument" +
      (ctaRequired ? ", and CTA" : "") +
      "; remove repetition; keep the same language; sync subtitles to the shortened spoken words; keep video.script scene directions but align spoken VO lines with voiceover_text. Do not blindly truncate mid-sentence.",
    "asset_usage[].used_as must be a string when asset_usage is present.",
    "",
    "Minimal skeleton:",
    JSON.stringify(
      {
        title: "string",
        funnel_stage: "string",
        hook: "string",
        voiceover_text: "40–70 words preferred; maximum 80 words",
        subtitles: "string matching spoken voiceover",
        cta: ctaSkeleton,
        video: {
          concept: "string",
          script: "string",
          duration_seconds: "string",
        },
        platform_outputs: {
          "<platform>": {
            caption:
              "string (REQUIRED; if caption_variants exist use caption_variants[0])",
            cta: "optional string or null",
            hashtags: ["string"],
            format: "string",
            caption_variants: ["optional string[] — never omit caption"],
            title_variants: ["optional string[] — x only when required"],
          },
        },
        hashtags: ["string"],
        image_prompts: ["string"],
        visual_scenes: [
          { source: "ai", image_prompt: "string" },
          {
            source: "asset",
            asset_id: "uuid",
            used_as: "string",
          },
        ],
        asset_usage: [{ asset_id: "uuid", used_as: "string" }],
        scenario: "optional string",
      },
      null,
      2,
    ),
  ].join("\n");
}
