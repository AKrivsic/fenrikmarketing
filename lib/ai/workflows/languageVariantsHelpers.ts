import type { ApprovalStatus, LanguageCode } from "@/lib/supabase/types";

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

// Picks the content item to attach the variant video job to: prefer TikTok
// (vertical-first), otherwise the first item. Returns null for an empty list.
export function pickVideoJobItem<T extends { platform: string }>(
  items: T[],
): T | null {
  if (items.length === 0) return null;
  return items.find((item) => item.platform === "tiktok") ?? items[0];
}
