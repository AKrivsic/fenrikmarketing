import {
  vArray,
  vNonEmptyString,
  vObject,
  vOptional,
  vString,
  type Infer,
} from "@/lib/ai/validateAiOutput";

// Output schema for localizing an approved content package into a target
// language. The visual spec (scenes / storyboard / render_spec) is NOT part of
// this output — only text is localized. Each platform output mirrors the
// editable fields of a content_items row so a future action can persist them.
const localizedCtaSchema = vObject({
  type: vNonEmptyString(),
  text: vNonEmptyString(),
});

const localizedPlatformOutputSchema = vObject({
  // Kept as a string (matches the source content_item.platform). The persisting
  // action maps it to the platform_type enum. title/body are optional because
  // content_items.title/body are nullable.
  platform: vNonEmptyString(),
  title: vOptional(vString()),
  body: vOptional(vString()),
  caption: vNonEmptyString(),
  hashtags: vOptional(vArray(vString())),
  cta: vNonEmptyString(),
});

export const localizeContentPackageSchema = vObject({
  voiceover_text: vNonEmptyString(),
  subtitles: vNonEmptyString(),
  // Optional: only present when the source package has a package-level CTA.
  cta: vOptional(localizedCtaSchema),
  platform_outputs: vArray(localizedPlatformOutputSchema, { min: 1 }),
});

export type LocalizedPlatformOutput = Infer<typeof localizedPlatformOutputSchema>;
export type LocalizeContentPackageOutput = Infer<
  typeof localizeContentPackageSchema
>;
