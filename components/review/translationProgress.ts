// Shared presentation helpers for the package translation-progress UI. Used by
// both the package header badge and the detailed status summary so the wording
// and tone stay in sync. Pure (no React), so it's safe to import anywhere.

import type {
  TranslationOverallState,
  TranslationProgress,
  TranslationVideoState,
} from "@/lib/api/project-review-admin";

export type ProgressTone = "green" | "yellow" | "red" | "muted";

// Compact badge text for the whole package, e.g. "Translations 2/4 complete".
// Returns null when there is nothing to translate (no target languages / no
// approved video platforms yet) so the badge can be hidden.
export function translationBadgeLabel(
  progress: TranslationProgress,
): string | null {
  const { overall, completeCount, targetCount } = progress;
  switch (overall) {
    case "none":
      return null;
    case "not_started":
      return "Translations not started";
    case "running":
      return `Translations ${completeCount}/${targetCount} running`;
    case "partial":
      return `Translations ${completeCount}/${targetCount} complete`;
    case "complete":
      return "Translations complete";
    case "failed":
      return "Translations failed";
    default:
      return null;
  }
}

export function translationBadgeTone(
  overall: TranslationOverallState,
): ProgressTone {
  if (overall === "complete") return "green";
  if (overall === "running" || overall === "partial") return "yellow";
  if (overall === "failed") return "red";
  return "muted";
}

export const VIDEO_STATE_LABEL: Record<TranslationVideoState, string> = {
  completed: "completed",
  rendering: "rendering",
  failed: "failed",
  missing: "missing",
};

export function videoStateTone(state: TranslationVideoState): ProgressTone {
  if (state === "completed") return "green";
  if (state === "rendering") return "yellow";
  if (state === "failed") return "red";
  return "muted";
}
