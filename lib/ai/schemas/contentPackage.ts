import {
  vArray,
  vEnum,
  vFunnelStage,
  vNonEmptyString,
  vObject,
  vOptional,
  vString,
  type Infer,
  type Validator,
} from "@/lib/ai/validateAiOutput";
import { REQUIRED_PACKAGE_PLATFORMS } from "@/lib/ai/types";
import {
  generatedVisualScenesArrayValidator,
  type PackageVisualSceneEntry,
} from "@/lib/content-package/generatedVisualScene";
import { MAX_VIDEO_SCENE_STILLS } from "@/lib/video-engine/storyboard";

// Phase 2A ownership:
//   Decision: JSON Schema
//   Owner: buildContentPackageSchema / contentPackageSchema (this module)
//   Readers: generateValidatedJson, runWithRepair, workers
//   Illegal writers: prompt JSON inventing new required fields

const platformOutputSchema = vObject({
  caption: vNonEmptyString(),
  // Organic social: platform CTA is optional. null/omit = caption stands alone.
  // Empty string is rejected (not a fake CTA).
  cta: vOptional(vNonEmptyString()),
  hashtags: vOptional(vArray(vString())),
  format: vOptional(vString()),
  // Content Quality Sprint (Multiplier Variants MVP-1) — when a production run
  // sets a text platform's multiplier > 1, the model returns multiple DISTINCT
  // captions here (one per output), so fan-out persists real variants (A/B/C)
  // instead of duplicating one caption. Optional + backward compatible: a
  // multiplier of 1 (or any non-run generation) simply omits it and `caption`
  // is used as before.
  caption_variants: vOptional(vArray(vString())),
  // X Native Variants — generated alongside caption_variants (one per output,
  // each a different angle). Persist fan-out picks title_variants[index] and
  // falls back to the package base title when a slot is missing. Optional +
  // backward compatible: omitted for single-output / non-run generation.
  title_variants: vOptional(vArray(vString())),
});

// Builds a platform_outputs validator requiring an explicit output object for
// each of the given platform surfaces. vObject ignores extra keys, so a package
// may still carry outputs for non-required platforms.
function buildPlatformOutputsSchema(
  platforms: readonly string[],
): Validator<Record<string, Infer<typeof platformOutputSchema>>> {
  return vObject(
    Object.fromEntries(
      platforms.map((p) => [p, platformOutputSchema]),
    ) as Record<string, typeof platformOutputSchema>,
  ) as Validator<Record<string, Infer<typeof platformOutputSchema>>>;
}

// Require an explicit output object for every mandatory platform surface.
const platformOutputsSchema: Validator<
  Record<(typeof REQUIRED_PACKAGE_PLATFORMS)[number], Infer<typeof platformOutputSchema>>
> = buildPlatformOutputsSchema(REQUIRED_PACKAGE_PLATFORMS) as Validator<
  Record<(typeof REQUIRED_PACKAGE_PLATFORMS)[number], Infer<typeof platformOutputSchema>>
>;

const videoSchema = vObject({
  concept: vNonEmptyString(),
  script: vNonEmptyString(),
  duration_seconds: vOptional(vString()),
});

function buildCtaObjectSchema(allowedCtaTypes?: readonly string[]) {
  const typeValidator =
    allowedCtaTypes && allowedCtaTypes.length > 0
      ? (vEnum(allowedCtaTypes as readonly string[]) as Validator<string>)
      : vNonEmptyString();
  return vObject({
    type: typeValidator,
    text: vNonEmptyString(),
  });
}

/**
 * Package CTA: null/omit OR { type, text }.
 * When ctaRequired, null/omit fails (Conversion). Empty string is never valid.
 */
function buildPackageCtaSchema(
  allowedCtaTypes?: readonly string[],
  ctaRequired = false,
): Validator<
  | { type: string; text: string }
  | null
  | undefined
> {
  const objectSchema = buildCtaObjectSchema(allowedCtaTypes);
  if (ctaRequired) {
    return objectSchema as Validator<{ type: string; text: string }>;
  }
  return vOptional(objectSchema);
}

const ctaSchema = buildPackageCtaSchema();

const assetUsageSchema = vObject({
  asset_id: vNonEmptyString(),
  used_as: vNonEmptyString(),
  modify: vOptional(vString()),
});

const visualScenesSchema = vOptional(
  generatedVisualScenesArrayValidator({
    min: 1,
    max: MAX_VIDEO_SCENE_STILLS,
  }) as Validator<PackageVisualSceneEntry[]>,
);

export const contentPackageSchema = vObject({
  title: vNonEmptyString(),
  funnel_stage: vFunnelStage(),
  hook: vNonEmptyString(),
  voiceover_text: vNonEmptyString(),
  subtitles: vNonEmptyString(),
  cta: ctaSchema as Validator<
    { type: string; text: string } | null | undefined
  >,
  video: videoSchema,
  platform_outputs: platformOutputsSchema,
  hashtags: vOptional(vArray(vString())),
  image_prompts: vOptional(vArray(vString())),
  visual_scenes: visualScenesSchema,
  asset_usage: vOptional(vArray(assetUsageSchema)),
  // Phase 2E — the SCENARIO POOL line the package drew on (verbatim), or empty
  // when none was used. Captured so anti-repetition memory can avoid reusing the
  // same scenario across content. Optional: legacy/scenario-less output omits it.
  scenario: vOptional(vString()),
});

export interface BuildContentPackageSchemaOptions {
  // When false, the package is text-only (no platform requires video): the
  // `video` block becomes optional so a valid package can omit it. Defaults to
  // true (video required) — backwards compatible with all existing callers.
  requireVideo?: boolean;
  /**
   * Allowed cta.type enum for this package (funnel-stage + goal scoped).
   * When provided, invalid types fail schema validation before guardrails.
   */
  allowedCtaTypes?: readonly string[];
  /**
   * When true (Conversion), cta object is required. When false, cta may be null.
   */
  ctaRequired?: boolean;
}

// Builds a content-package validator whose platform_outputs requires exactly
// the given platform surfaces. Used by the generation workflows to validate AI
// output against a project's selected platforms (instead of the hardcoded full
// set). Returns the same ContentPackageOutput shape (platform_outputs typing is
// intentionally widened at runtime — extra/fewer keys are tolerated by callers).
export function buildContentPackageSchema(
  platforms: readonly string[],
  options: BuildContentPackageSchemaOptions = {},
): Validator<ContentPackageOutput> {
  const effective = platforms.length > 0 ? platforms : REQUIRED_PACKAGE_PLATFORMS;
  const requireVideo = options.requireVideo ?? true;
  const ctaRequired = options.ctaRequired ?? false;
  return vObject({
    title: vNonEmptyString(),
    funnel_stage: vFunnelStage(),
    hook: vNonEmptyString(),
    voiceover_text: vNonEmptyString(),
    subtitles: vNonEmptyString(),
    cta: buildPackageCtaSchema(options.allowedCtaTypes, ctaRequired),
    // Text-only packages may omit video entirely; video packages still require
    // a fully-formed video block.
    video: requireVideo ? videoSchema : vOptional(videoSchema),
    platform_outputs: buildPlatformOutputsSchema(effective),
    hashtags: vOptional(vArray(vString())),
    image_prompts: vOptional(vArray(vString())),
    visual_scenes: visualScenesSchema,
    asset_usage: vOptional(vArray(assetUsageSchema)),
    scenario: vOptional(vString()),
  }) as unknown as Validator<ContentPackageOutput>;
}

export type ContentPackageOutput = Omit<
  Infer<typeof contentPackageSchema>,
  "cta"
> & {
  cta?: { type: string; text: string } | null;
  /** Phase 5 — compact rollout / frequency log (optional, not LLM-generated). */
  presentation_generation?: Record<string, unknown>;
};
export type PlatformOutput = Infer<typeof platformOutputSchema>;
export type PackageAssetUsage = Infer<typeof assetUsageSchema>;
