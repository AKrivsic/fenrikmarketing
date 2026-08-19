import {
  AI_MEDIA_BENCHMARK_NOTE_MAX_CHARS,
  AI_MEDIA_BENCHMARK_RATING_MAX,
  AI_MEDIA_BENCHMARK_RATING_MIN,
} from "@/lib/ai-media-benchmark/types";

export function parseBenchmarkRating(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error("rating_invalid");
  }
  if (
    value < AI_MEDIA_BENCHMARK_RATING_MIN ||
    value > AI_MEDIA_BENCHMARK_RATING_MAX
  ) {
    throw new Error("rating_invalid");
  }
  return value;
}

export function parseBenchmarkNote(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new Error("note_invalid");
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > AI_MEDIA_BENCHMARK_NOTE_MAX_CHARS) {
    throw new Error("note_too_long");
  }
  return trimmed;
}
