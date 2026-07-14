import type { SeriesCreativeContext } from "@/lib/series/loadSeriesCreativeContext";
import { parseVisualMedium } from "@/lib/visual-medium/visualMedium";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function readVisualMediumKeyFromBrief(
  brief: Record<string, unknown>,
): string | null {
  const pg = asRecord(brief.presentation_generation);
  const medium = parseVisualMedium(pg?.visual_medium);
  return medium ?? null;
}

export function aggregateRecentMediumCounts(
  series: SeriesCreativeContext,
  window = 8,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const fp of series.fingerprints.slice(0, window)) {
    const m = fp.visual_medium?.trim().toUpperCase();
    if (!m) continue;
    counts[m] = (counts[m] ?? 0) + 1;
  }
  return counts;
}

export function readRecentVisualMediumKeys(
  series: SeriesCreativeContext,
  limit = 12,
): string[] {
  const keys: string[] = [];
  for (const fp of series.fingerprints) {
    const m = fp.visual_medium?.trim().toUpperCase();
    if (!m || keys.includes(m)) continue;
    keys.push(m);
    if (keys.length >= limit) break;
  }
  return keys;
}
