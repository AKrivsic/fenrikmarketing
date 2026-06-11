import type { ContentItem, Json, LanguageCode } from "@/lib/supabase/types";

// Shared, server-only read helpers over content_items / video_jobs. These were
// previously duplicated across review-queue.ts, project-content-admin.ts and
// review-runs-admin.ts; consolidated here so the review surfaces agree on how
// raw jsonb blobs are interpreted. No DB access — pure parsing/reduction.

// Pulls the artifact URLs out of a video_jobs.output jsonb blob. Free-form at
// the DB level, so every field is read defensively. Callers that only need
// mp4/thumbnail can ignore subtitleUrl.
export function readVideoOutput(output: Json | null): {
  mp4Url: string | null;
  thumbnailUrl: string | null;
  subtitleUrl: string | null;
} {
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    return { mp4Url: null, thumbnailUrl: null, subtitleUrl: null };
  }
  const record = output as Record<string, unknown>;
  const str = (key: string) =>
    typeof record[key] === "string" ? (record[key] as string) : null;
  return {
    mp4Url: str("mp4_url"),
    thumbnailUrl: str("thumbnail_url"),
    subtitleUrl: str("subtitle_url"),
  };
}

// Extracts variant metadata from a content_items.generation_metadata blob.
export function readVariantMeta(metadata: Json | null): {
  kind: string | null;
  sourceLanguage: LanguageCode | null;
  targetLanguage: LanguageCode | null;
} {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return { kind: null, sourceLanguage: null, targetLanguage: null };
  }
  const record = metadata as Record<string, unknown>;
  const kind = typeof record.kind === "string" ? record.kind : null;
  const sourceLanguage =
    typeof record.source_language === "string"
      ? (record.source_language as LanguageCode)
      : null;
  const targetLanguage =
    typeof record.target_language === "string"
      ? (record.target_language as LanguageCode)
      : null;
  return { kind, sourceLanguage, targetLanguage };
}

// Reads the owning production run id from a content_items.generation_metadata
// blob (stamped by the generator). Returns null when absent — older items
// predate production runs.
export function readProductionRunId(metadata: Json | null): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const value = (metadata as Record<string, unknown>).production_run_id;
  return typeof value === "string" && value.length > 0 ? value : null;
}

// A content item is a language variant when it carries an explicit language OR
// its generation_metadata marks it as a language_variant.
export function isVariantItem(item: ContentItem): boolean {
  if (item.language !== null) return true;
  return readVariantMeta(item.generation_metadata).kind === "language_variant";
}

// Reduces a list of video jobs to the newest job per content_item_id. Input is
// expected to be ordered created_at desc, so the first seen wins.
export function newestByContentItem<
  T extends { content_item_id: string | null },
>(jobs: T[]): Map<string, T> {
  const byItem = new Map<string, T>();
  for (const job of jobs) {
    const itemId = job.content_item_id;
    if (!itemId) continue;
    if (!byItem.has(itemId)) byItem.set(itemId, job);
  }
  return byItem;
}
