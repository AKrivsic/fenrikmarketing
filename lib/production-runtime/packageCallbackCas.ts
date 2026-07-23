/**
 * Phase 6G — package callback compare-and-set rules.
 *
 * Minimal legal transitions (existing product statuses only):
 *   draft → ready | approved | published | archived | draft (idempotent)
 *   ready → approved | published | archived | ready
 *   approved → published | archived | approved
 *   published → archived | published
 *   archived → archived (idempotent only)
 *
 * Stale / illegal transitions are ignored (not applied).
 */

import type { PackageStatus } from "@/lib/supabase/types";

export type PackageCallbackOutcome =
  | "accepted"
  | "ignored"
  | "rejected"
  | "idempotent";

export interface PackageCallbackDecision {
  outcome: PackageCallbackOutcome;
  reason: string;
  applyStatus: boolean;
}

const RANK: Record<PackageStatus, number> = {
  draft: 0,
  ready: 1,
  approved: 2,
  published: 3,
  archived: 4,
};

export function decidePackageCallbackTransition(
  current: PackageStatus,
  next: PackageStatus,
): PackageCallbackDecision {
  if (current === next) {
    return {
      outcome: "idempotent",
      reason: "duplicate_same_status",
      applyStatus: false,
    };
  }

  // Never revive archived via callback.
  if (current === "archived" && next !== "archived") {
    return {
      outcome: "rejected",
      reason: "cannot_revive_archived",
      applyStatus: false,
    };
  }

  // Do not move backwards in the lifecycle via callback (stale n8n delivery).
  if (RANK[next] < RANK[current]) {
    return {
      outcome: "ignored",
      reason: "stale_or_backward_transition",
      applyStatus: false,
    };
  }

  return {
    outcome: "accepted",
    reason: "legal_forward_transition",
    applyStatus: true,
  };
}
