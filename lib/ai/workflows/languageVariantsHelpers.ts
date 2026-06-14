import type {
  ApprovalStatus,
  LanguageCode,
  TranslationJobStatus,
} from "@/lib/supabase/types";

// Pure helpers for the generate-language-variants workflow. Kept free of
// Supabase / WorkflowError imports so they can be unit-tested under Node's
// strip-only loader (the workflow itself orchestrates these + side effects).

// Target languages = enabled_languages minus the primary language, deduped and
// order-preserving. The primary language is never a variant target.
export function resolveTargetLanguages(
  primaryLanguage: LanguageCode,
  enabledLanguages: LanguageCode[],
): LanguageCode[] {
  const seen = new Set<LanguageCode>();
  const result: LanguageCode[] = [];
  for (const lang of enabledLanguages) {
    if (lang === primaryLanguage) continue;
    if (seen.has(lang)) continue;
    seen.add(lang);
    result.push(lang);
  }
  return result;
}

// All primary content items must be approved before variants may be generated.
// An empty list is NOT considered approved (there is nothing to localize).
export function allItemsApproved(statuses: ApprovalStatus[]): boolean {
  return statuses.length > 0 && statuses.every((s) => s === "approved");
}

// Platforms whose primary output is a video. Mirrors the product defaults in
// DEFAULT_PLATFORM_CONTENT_TYPES (lib/projects/contentControls.ts): tiktok /
// instagram / youtube / facebook produce a video, while linkedin / x /
// google_business are text-only. Used by the item-level variant flow to decide
// whether an approved primary item should also produce a localized video job.
const VIDEO_PLATFORMS = new Set<string>([
  "tiktok",
  "instagram",
  "youtube",
  "facebook",
]);

export function isVideoPlatform(platform: string): boolean {
  return VIDEO_PLATFORMS.has(platform);
}

// Target languages that do NOT yet have a variant for a given source item.
// Order-preserving over targetLanguages.
export function pendingVariantLanguages(
  targetLanguages: LanguageCode[],
  existingLanguages: Iterable<LanguageCode>,
): LanguageCode[] {
  const have = new Set<LanguageCode>(existingLanguages);
  return targetLanguages.filter((lang) => !have.has(lang));
}

// Item-level eligibility for "Generate language variants" on a SINGLE approved
// primary item. True when the item is primary (language NULL), approved, the
// project has at least one target language, and at least one target language is
// still missing a variant for this item. Independent of any OTHER item's status
// in the same package — a draft X item never blocks an approved TikTok item.
export function canGenerateItemVariants(args: {
  itemLanguage: LanguageCode | null;
  itemStatus: ApprovalStatus;
  targetLanguages: LanguageCode[];
  // Languages that already have a variant for THIS source item.
  coveredLanguages: Iterable<LanguageCode>;
}): boolean {
  if (args.itemLanguage !== null) return false;
  if (args.itemStatus !== "approved") return false;
  if (args.targetLanguages.length === 0) return false;
  return (
    pendingVariantLanguages(args.targetLanguages, args.coveredLanguages).length >
    0
  );
}

// Extracts the persisted scenes array from a video_jobs.output blob, or null
// when no usable render_spec.scenes[] is present. Scenes are returned verbatim
// so they can be fed back into a new job's input (triggering visual reuse).
export function extractRenderSpecScenes(
  output: unknown,
): Record<string, unknown>[] | null {
  if (!output || typeof output !== "object" || Array.isArray(output)) return null;
  const renderSpec = (output as Record<string, unknown>).render_spec;
  if (!renderSpec || typeof renderSpec !== "object" || Array.isArray(renderSpec)) {
    return null;
  }
  const scenes = (renderSpec as Record<string, unknown>).scenes;
  if (!Array.isArray(scenes) || scenes.length === 0) return null;
  // Every scene must carry a durable storage path, otherwise reuse is impossible.
  const usable = scenes.every(
    (scene) =>
      scene &&
      typeof scene === "object" &&
      !Array.isArray(scene) &&
      typeof (scene as Record<string, unknown>).image_path === "string",
  );
  if (!usable) return null;
  return scenes as Record<string, unknown>[];
}

// Collapsed async-localization state for ONE target language, rolled up from the
// translation_jobs rows of that language (a language can have several units, one
// per video platform). Drives the "running / failed" signal in the review
// translation progress BEFORE any variant content_item exists yet.
//   "active" — at least one unit is still pending or processing (Claude running).
//   "failed" — no unit is active and at least one failed.
//   null     — no outstanding unit (idle, or every unit completed).
export type TranslationTextJobState = "active" | "failed" | null;

export function rollupTranslationTextJob(
  statuses: TranslationJobStatus[],
): TranslationTextJobState {
  if (statuses.length === 0) return null;
  if (statuses.some((s) => s === "pending" || s === "processing")) {
    return "active";
  }
  if (statuses.some((s) => s === "failed")) return "failed";
  return null;
}

// Picks the content item to attach the variant video job to: prefer TikTok
// (vertical-first), otherwise the first item. Returns null for an empty list.
export function pickVideoJobItem<T extends { platform: string }>(
  items: T[],
): T | null {
  if (items.length === 0) return null;
  return items.find((item) => item.platform === "tiktok") ?? items[0];
}
