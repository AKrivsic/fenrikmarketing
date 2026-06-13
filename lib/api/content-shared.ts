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

// Primary content item a language variant was generated from (language_variant
// workflow stamps generation_metadata.source_content_item_id).
export function readSourceContentItemId(metadata: Json | null): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const value = (metadata as Record<string, unknown>).source_content_item_id;
  return typeof value === "string" && value.length > 0 ? value : null;
}

// A content item is a language variant when it carries an explicit language OR
// its generation_metadata marks it as a language_variant.
export function isVariantItem(item: ContentItem): boolean {
  if (item.language !== null) return true;
  return readVariantMeta(item.generation_metadata).kind === "language_variant";
}

// The render-diagnostics blob persisted under video_jobs.output.debug by the
// worker. All fields optional / nullable — older jobs omit it. Single source of
// truth shared by the run list, the exceptions dashboard and the project review
// video panel.
export interface RenderDebug {
  subtitle_source?: "whisper" | "proportional";
  match_ratio?: number | null;
  fallback_used?: boolean;
  language_hint?: string | null;
  language_detected?: string | null;
  whisper_word_count?: number | null;
  audio_duration?: number | null;
  video_duration?: number | null;
  srt_last_cue_end?: number | null;
  duration_delta?: number | null;
  subtitle_warning?: boolean;
  render_warning?: boolean;
  render_warnings?: string[];
}

// Pulls the render-diagnostics blob out of a video_jobs.output jsonb. Returns
// null when absent (older jobs) or malformed.
export function readDebug(output: Json | null): RenderDebug | null {
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    return null;
  }
  const debug = (output as Record<string, unknown>).debug;
  if (!debug || typeof debug !== "object" || Array.isArray(debug)) return null;
  return debug as RenderDebug;
}

// A job "has a warning" when the worker flagged a render or subtitle warning.
export function jobHasWarning(debug: RenderDebug | null): boolean {
  if (!debug) return false;
  return Boolean(debug.render_warning) || Boolean(debug.subtitle_warning);
}

// A subtitle fallback happened when the worker had to synthesize proportional
// subtitles instead of using usable Whisper output.
export function isSubtitleFallback(debug: RenderDebug | null): boolean {
  if (!debug) return false;
  return (
    debug.fallback_used === true ||
    debug.subtitle_warning === true ||
    debug.subtitle_source === "proportional"
  );
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
