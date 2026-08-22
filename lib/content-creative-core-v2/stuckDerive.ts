/**
 * Pure stuck-derive detection (no DB). Kept separate to avoid circular imports
 * between derivedOutputsState and recoverDerive.
 */

import { readApprovedCreativeCoreSnapshot } from "@/lib/content-creative-core-v2/approvedSnapshot";
import { readDerivedOutputs } from "@/lib/content-creative-core-v2/derivedOutputsState";

/** After this age, stuck pending/expired-claim → operator error_retry. */
export const CREATIVE_CORE_V2_DERIVE_STUCK_MS = 10 * 60 * 1000;

function claimExpired(
  derived: NonNullable<ReturnType<typeof readDerivedOutputs>>,
  nowMs: number,
): boolean {
  if (!derived.claim?.lease_expires_at) return true;
  return Date.parse(derived.claim.lease_expires_at) <= nowMs;
}

function deriveRequestedAtMs(brief: Record<string, unknown>): number | null {
  const raw = brief.content_creative_core_v2_derive_requested_at;
  if (typeof raw !== "string" || !raw.trim()) return null;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : null;
}

export function shouldMarkDeriveStuckForOperatorRetry(
  brief: Record<string, unknown>,
  nowMs: number = Date.now(),
): boolean {
  if (!readApprovedCreativeCoreSnapshot(brief)) return false;
  const derived = readDerivedOutputs(brief);
  if (!derived || derived.status === "ready" || derived.status === "failed") {
    return false;
  }
  if (derived.status === "pending" || derived.stale) {
    const requested = deriveRequestedAtMs(brief);
    if (requested == null) return false;
    return nowMs - requested >= CREATIVE_CORE_V2_DERIVE_STUCK_MS;
  }
  if (
    (derived.status === "generating_texts" ||
      derived.status === "generating_social_image") &&
    claimExpired(derived, nowMs)
  ) {
    const leaseEnd = derived.claim?.lease_expires_at
      ? Date.parse(derived.claim.lease_expires_at)
      : 0;
    return nowMs - leaseEnd >= CREATIVE_CORE_V2_DERIVE_STUCK_MS;
  }
  return false;
}
