/**
 * Aggregate Creative Review run progress for display + Continue readiness.
 */

import type { CreativeReview } from "@/lib/creative-review/types";
import type { ProductionRunStatus } from "@/lib/supabase/types";

export interface CreativeReviewRunProgress {
  total: number;
  approved: number;
  ready: number;
  /** Draft packages that still need translation confirmation. */
  waitingForTranslation: number;
  /** All draft packages (not ready / not approved). */
  pending: number;
}

export function computeCreativeReviewRunProgress(
  reviews: ReadonlyArray<CreativeReview | null | undefined>,
): CreativeReviewRunProgress {
  let approved = 0;
  let ready = 0;
  let waitingForTranslation = 0;
  let pending = 0;
  let total = 0;

  for (const review of reviews) {
    if (!review) continue;
    total += 1;
    if (review.status === "approved") {
      approved += 1;
      continue;
    }
    if (review.status === "ready") {
      ready += 1;
      continue;
    }
    pending += 1;
    if (!review.voiceover.english_confirmed) {
      waitingForTranslation += 1;
    }
  }

  return {
    total,
    approved,
    ready,
    waitingForTranslation,
    pending,
  };
}

/**
 * UI hint only — server re-validates on Continue.
 * True when the run is waiting and every loaded package is approved.
 */
export function canContinueCreativeReviewGeneration(args: {
  runStatus: ProductionRunStatus;
  progress: CreativeReviewRunProgress;
}): boolean {
  if (args.runStatus !== "waiting_for_creative_review") return false;
  if (args.progress.total <= 0) return false;
  return args.progress.approved === args.progress.total;
}
