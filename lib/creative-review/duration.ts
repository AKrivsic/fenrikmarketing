/**
 * Creative Review voiceover duration estimates (warnings only).
 *
 * Reuses the same WORDS_PER_SECOND constant as the video storyboard estimator.
 */

import { WORDS_PER_SECOND } from "@/lib/video-engine/storyboard";

export { WORDS_PER_SECOND };

export interface CreativeReviewDurationEstimate {
  originalSeconds: number;
  estimatedSeconds: number;
  differenceSeconds: number;
  wordsOriginal: number;
  wordsEstimated: number;
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

/** Estimate spoken duration in seconds from voiceover text. */
export function estimateVoiceoverDurationSeconds(text: string): number {
  const words = countWords(text);
  if (words <= 0) return 0;
  return words / WORDS_PER_SECOND;
}

/**
 * Compare original AI voiceover duration vs current localized edit.
 * Warnings only — never blocks approval.
 */
export function computeCreativeReviewDurationEstimate(args: {
  originalAi: string;
  localizedEdit: string;
}): CreativeReviewDurationEstimate {
  const wordsOriginal = countWords(args.originalAi);
  const wordsEstimated = countWords(args.localizedEdit);
  const originalSeconds =
    wordsOriginal > 0 ? wordsOriginal / WORDS_PER_SECOND : 0;
  const estimatedSeconds =
    wordsEstimated > 0 ? wordsEstimated / WORDS_PER_SECOND : 0;
  return {
    originalSeconds,
    estimatedSeconds,
    differenceSeconds: estimatedSeconds - originalSeconds,
    wordsOriginal,
    wordsEstimated,
  };
}

export function formatDurationSeconds(seconds: number): string {
  if (!Number.isFinite(seconds)) return "—";
  const rounded = Math.round(seconds * 10) / 10;
  return `${rounded.toFixed(1)}s`;
}
