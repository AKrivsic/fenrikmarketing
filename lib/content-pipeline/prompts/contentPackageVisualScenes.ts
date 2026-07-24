/**
 * Shared Content Package visual_scenes + expectedShape contract.
 * Aligned with generatedVisualSceneEntryValidator (legacy IMAGE preferred).
 */

import { MAX_VIDEO_SCENE_STILLS } from "@/lib/video-engine/storyboard";

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

/** Compact expectedShape forwarded to JSON repair for Content Package. */
export function buildContentPackageExpectedShape(): string {
  return [
    "Return a single JSON object. Preserve valid creative content; fix structure/types only.",
    "Use ONLY these visual_scenes shapes (prefer legacy IMAGE):",
    '{ "source": "ai", "image_prompt": "string" }',
    '{ "source": "asset", "asset_id": "uuid", "used_as": "string" }',
    'Optional typed: { "type": "CHECKLIST"|"PHONE"|"QUOTE"|"STATISTIC"|"CTA", "payload": { ... } }',
    'Do NOT use { "type": "IMAGE", "image_prompt": "..." } or invented fields (description, prompt, visual).',
    "video.duration_seconds must be a string when present.",
    "platform_outputs.<platform>.caption and .cta must be strings (never objects).",
    "hashtags is string[]; format is string; caption_variants/title_variants are string[] only when needed.",
    "asset_usage[].used_as must be a string when asset_usage is present.",
    "",
    "Minimal skeleton:",
    JSON.stringify(
      {
        title: "string",
        funnel_stage: "string",
        hook: "string",
        voiceover_text: "string",
        subtitles: "string",
        cta: { type: "string", text: "string" },
        video: {
          concept: "string",
          script: "string",
          duration_seconds: "string",
        },
        platform_outputs: {
          "<platform>": {
            caption: "string",
            cta: "string",
            hashtags: ["string"],
            format: "string",
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
