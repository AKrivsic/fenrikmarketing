import type { LanguageCode, Project } from "@/lib/supabase/types";
import { projectBrainBlock } from "@/lib/ai/prompts/context";
import { canonicalWebsiteUrl } from "@/lib/knowledge/websiteUrl";

// Human-readable language names so the model gets an unambiguous target market
// rather than a bare ISO code. Falls back to the code itself for safety.
const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  cs: "Czech",
  en: "English",
  sk: "Slovak",
  de: "German",
  fr: "French",
  es: "Spanish",
  it: "Italian",
};

export function languageLabel(code: LanguageCode): string {
  return LANGUAGE_LABELS[code] ?? code;
}

// The source (primary-language) content to localize. voiceover_text / subtitles
// / cta come from the package; platformItems mirror the editable content_items.
export interface LocalizeSourcePlatformItem {
  platform: string;
  title?: string | null;
  body?: string | null;
  caption?: string | null;
  hashtags: string[];
  cta?: string | null;
}

export interface LocalizeContentPackagePromptInput {
  project: Project;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  source: {
    voiceoverText: string;
    subtitles: string;
    cta?: { type: string; text: string } | null;
    platformItems: LocalizeSourcePlatformItem[];
  };
}

export const LOCALIZE_PACKAGE_SYSTEM =
  "You are a senior native-market copywriter. You localize an APPROVED content " +
  "package from a source language into a target language. You translate AND " +
  "culturally adapt for the target market. You MUST NOT change the concept, the " +
  "claims, or the product meaning. Output a single valid JSON document only.";

function list(values: string[]): string {
  return values.length ? values.join("; ") : "(none)";
}

export function buildLocalizeContentPackagePrompt(
  input: LocalizeContentPackagePromptInput,
): string {
  const { project, sourceLanguage, targetLanguage, source } = input;
  const sourceLabel = languageLabel(sourceLanguage);
  const targetLabel = languageLabel(targetLanguage);
  const canonicalUrl = canonicalWebsiteUrl(project);

  const platformsBlock = source.platformItems.length
    ? source.platformItems
        .map((item) =>
          [
            `- platform: ${item.platform}`,
            `  title: ${JSON.stringify(item.title ?? "")}`,
            `  body: ${JSON.stringify(item.body ?? "")}`,
            `  caption: ${JSON.stringify(item.caption ?? "")}`,
            `  hashtags: ${JSON.stringify(item.hashtags ?? [])}`,
            `  cta: ${JSON.stringify(item.cta ?? "")}`,
          ].join("\n"),
        )
        .join("\n")
    : "(none)";

  return [
    projectBrainBlock(project),
    "",
    `LOCALIZATION TASK: translate and culturally adapt from ${sourceLabel} ` +
      `(${sourceLanguage}) to ${targetLabel} (${targetLanguage}).`,
    "",
    "HARD RULES:",
    `- Write naturally in ${targetLabel} for that market (not a literal translation).`,
    "- Do NOT change the concept, the claims, or the product meaning.",
    "- Do NOT translate brand or product names unless a common localized form exists.",
    `- Never produce any forbidden_claims: ${list(project.forbidden_claims)}`,
    `- Never describe the product as anything in product_is_not: ${list(project.product_is_not)}`,
    "- Localize hashtags idiomatically for the target market (not a mechanical translation).",
    "- Adapt the CTA so it feels culturally natural in the target language.",
    "- If any source field already contains a URL, keep that URL EXACTLY as-is " +
      "(same scheme, host and path). Do NOT translate, localize, shorten or otherwise modify it.",
    "- Localize ONLY the words around a URL (the CTA wording); never translate the hostname or path.",
    ...(canonicalUrl
      ? [
          `- The canonical website URL is ${canonicalUrl}. There are no localized ` +
            "landing pages yet, so reuse this SAME URL for every language wherever a URL appears.",
        ]
      : []),
    "- Keep voiceover_text length approximately similar to the source.",
    "- Preserve exactly the same set of platforms as the source.",
    "- Output must be a single valid JSON document, no prose, no code fences.",
    "",
    "SOURCE PACKAGE (primary language):",
    `- voiceover_text: ${JSON.stringify(source.voiceoverText)}`,
    `- subtitles: ${JSON.stringify(source.subtitles)}`,
    source.cta
      ? `- cta: ${JSON.stringify(source.cta)}`
      : "- cta: (none — omit the cta field in the output)",
    "",
    "SOURCE PLATFORM OUTPUTS:",
    platformsBlock,
    "",
    "TASK: Produce the localized package as JSON with this exact shape:",
    `{
  "voiceover_text": "string",
  "subtitles": "string",${
    source.cta ? '\n  "cta": { "type": "string", "text": "string" },' : ""
  }
  "platform_outputs": [
    {
      "platform": "same platform value as the source",
      "title": "string (optional)",
      "body": "string (optional)",
      "caption": "string",
      "hashtags": ["string"],
      "cta": "string"
    }
  ]
}`,
    "Provide one platform_outputs entry per source platform, same platform values.",
  ].join("\n");
}
