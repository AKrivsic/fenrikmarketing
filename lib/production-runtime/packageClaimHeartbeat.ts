/**
 * Phase 6G — package-generation claim heartbeat.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PACKAGE_GENERATION_HEARTBEAT_INTERVAL_MS,
  PACKAGE_GENERATION_LEASE_SECONDS,
  PACKAGE_GENERATION_RENEW_MAX_FAILURES,
} from "@/lib/production-runtime/constants";
import { renewPackageGenerationClaim } from "@/lib/production-runtime/packageGenerationClaim";
import { runtimeLog } from "@/lib/production-runtime/runtimeLog";

export class PackageGenerationClaimLostError extends Error {
  readonly code = "generation_claim_lost" as const;
  readonly retryable = true;

  constructor(message = "package-generation claim ownership lost") {
    super(message);
    this.name = "PackageGenerationClaimLostError";
  }
}

export interface PackageClaimHeartbeatHandle {
  stop: () => void;
  /** True after ownership was definitively lost. */
  isLost: () => boolean;
  assertOwned: (phase: string) => void;
}

export function assertPackageClaimHeartbeatConfig(
  leaseSeconds = PACKAGE_GENERATION_LEASE_SECONDS,
  heartbeatMs = PACKAGE_GENERATION_HEARTBEAT_INTERVAL_MS,
): void {
  if (heartbeatMs >= leaseSeconds * 1000) {
    throw new Error(
      `PACKAGE_GENERATION_HEARTBEAT_INTERVAL_MS (${heartbeatMs}) must be shorter than lease (${leaseSeconds}s)`,
    );
  }
}

export function startPackageGenerationHeartbeat(
  supabase: SupabaseClient,
  args: {
    strategyItemId: string;
    ownerToken: string;
    projectId?: string | null;
    productionRunId?: string | null;
    phase?: string;
  },
): PackageClaimHeartbeatHandle {
  assertPackageClaimHeartbeatConfig();

  let stopped = false;
  let lost = false;
  let consecutiveFailures = 0;
  let currentPhase = args.phase ?? "generating";
  let timer: ReturnType<typeof setInterval> | null = null;

  const renewOnce = async (): Promise<void> => {
    if (stopped || lost) return;
    try {
      const ok = await renewPackageGenerationClaim(supabase, {
        strategyItemId: args.strategyItemId,
        ownerToken: args.ownerToken,
      });
      if (!ok) {
        consecutiveFailures += 1;
        runtimeLog("warn", {
          event: "package_claim_renewal_failed",
          strategy_item_id: args.strategyItemId,
          owner_token: args.ownerToken,
          project_id: args.projectId,
          production_run_id: args.productionRunId,
          phase: currentPhase,
          outcome: "renew_returned_false",
          detail: `failures=${consecutiveFailures}`,
        });
        if (consecutiveFailures >= PACKAGE_GENERATION_RENEW_MAX_FAILURES) {
          lost = true;
          runtimeLog("error", {
            event: "package_claim_lost",
            strategy_item_id: args.strategyItemId,
            owner_token: args.ownerToken,
            project_id: args.projectId,
            production_run_id: args.productionRunId,
            phase: currentPhase,
            outcome: "ownership_lost",
          });
        }
        return;
      }
      consecutiveFailures = 0;
      runtimeLog("info", {
        event: "package_claim_renewed",
        strategy_item_id: args.strategyItemId,
        owner_token: args.ownerToken,
        project_id: args.projectId,
        production_run_id: args.productionRunId,
        phase: currentPhase,
        outcome: "ok",
      });
    } catch (err) {
      consecutiveFailures += 1;
      runtimeLog("warn", {
        event: "package_claim_renewal_failed",
        strategy_item_id: args.strategyItemId,
        owner_token: args.ownerToken,
        project_id: args.projectId,
        production_run_id: args.productionRunId,
        phase: currentPhase,
        outcome: "renew_threw",
        detail: err instanceof Error ? err.message : String(err),
      });
      if (consecutiveFailures >= PACKAGE_GENERATION_RENEW_MAX_FAILURES) {
        lost = true;
        runtimeLog("error", {
          event: "package_claim_lost",
          strategy_item_id: args.strategyItemId,
          owner_token: args.ownerToken,
          project_id: args.projectId,
          production_run_id: args.productionRunId,
          phase: currentPhase,
          outcome: "ownership_lost",
        });
      }
    }
  };

  timer = setInterval(() => {
    void renewOnce();
  }, PACKAGE_GENERATION_HEARTBEAT_INTERVAL_MS);
  // Unref when available so heartbeat doesn't keep serverless/worker alive alone.
  if (typeof (timer as NodeJS.Timeout).unref === "function") {
    (timer as NodeJS.Timeout).unref();
  }

  return {
    stop: () => {
      stopped = true;
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
    isLost: () => lost,
    assertOwned: (phase: string) => {
      currentPhase = phase;
      if (lost) {
        throw new PackageGenerationClaimLostError(
          `package-generation claim lost before phase ${phase}`,
        );
      }
    },
  };
}
