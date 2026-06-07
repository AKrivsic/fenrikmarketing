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
});

// Require an explicit output object for every mandatory platform surface.
const platformOutputsSchema: Validator<
  Record<(typeof REQUIRED_PACKAGE_PLATFORMS)[number], Infer<typeof platformOutputSchema>>
> = vObject(
  Object.fromEntries(
    REQUIRED_PACKAGE_PLATFORMS.map((p) => [p, platformOutputSchema]),
  ) as Record<string, typeof platformOutputSchema>,
) as Validator<
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
});

export type ContentPackageOutput = Infer<typeof contentPackageSchema>;
export type PlatformOutput = Infer<typeof platformOutputSchema>;
export type PackageAssetUsage = Infer<typeof assetUsageSchema>;
