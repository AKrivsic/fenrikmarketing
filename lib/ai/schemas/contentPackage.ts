import {
  vArray,
  vFunnelStage,
  vNonEmptyString,
  vObject,
  vOptional,
  vString,
  type Infer,
  type Validator,
} from "@/lib/ai/validateAiOutput";
import { REQUIRED_PACKAGE_PLATFORMS } from "@/lib/ai/types";

const platformOutputSchema = vObject({
  caption: vNonEmptyString(),
  cta: vNonEmptyString(),
  hashtags: vOptional(vArray(vString())),
  format: vOptional(vString()),
  // Content Quality Sprint (Multiplier Variants MVP-1) — when a production run
  // sets a text platform's multiplier > 1, the model returns multiple DISTINCT
  // captions here (one per output), so fan-out persists real variants (A/B/C)
  // instead of duplicating one caption. Optional + backward compatible: a
  // multiplier of 1 (or any non-run generation) simply omits it and `caption`
  // is used as before.
  caption_variants: vOptional(vArray(vString())),
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

const ctaSchema = vObject({
  type: vNonEmptyString(),
  text: vNonEmptyString(),
});

const assetUsageSchema = vObject({
  asset_id: vNonEmptyString(),
  used_as: vNonEmptyString(),
  modify: vOptional(vString()),
});

export const contentPackageSchema = vObject({
  title: vNonEmptyString(),
  funnel_stage: vFunnelStage(),
  hook: vNonEmptyString(),
  voiceover_text: vNonEmptyString(),
  subtitles: vNonEmptyString(),
  cta: ctaSchema,
  video: videoSchema,
  platform_outputs: platformOutputsSchema,
  hashtags: vOptional(vArray(vString())),
  image_prompts: vOptional(vArray(vString())),
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
  return vObject({
    title: vNonEmptyString(),
    funnel_stage: vFunnelStage(),
    hook: vNonEmptyString(),
    voiceover_text: vNonEmptyString(),
    subtitles: vNonEmptyString(),
    cta: ctaSchema,
    // Text-only packages may omit video entirely; video packages still require
    // a fully-formed video block.
    video: requireVideo ? videoSchema : vOptional(videoSchema),
    platform_outputs: buildPlatformOutputsSchema(effective),
    hashtags: vOptional(vArray(vString())),
    image_prompts: vOptional(vArray(vString())),
    asset_usage: vOptional(vArray(assetUsageSchema)),
    scenario: vOptional(vString()),
  }) as unknown as Validator<ContentPackageOutput>;
}

export type ContentPackageOutput = Infer<typeof contentPackageSchema>;
export type PlatformOutput = Infer<typeof platformOutputSchema>;
export type PackageAssetUsage = Infer<typeof assetUsageSchema>;
