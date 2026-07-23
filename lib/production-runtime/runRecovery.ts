/**
 * Phase 6G — scheduled production-run recovery (no paid AI / render).
 */

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PRODUCTION_RUN_RECOVERY_BATCH_SIZE,
  PRODUCTION_RUN_RECOVERY_MAX_MS,
} from "@/lib/production-runtime/constants";
import { runtimeLog } from "@/lib/production-runtime/runtimeLog";

export interface RunRecoverySummary {
  scannedRuns: number;
  reconciledRuns: number;
  promotedVideoJobs: number;
  failedStaleJobs: number;
  settledRuns: number;
  skippedBusy: boolean;
  errors: Array<{ runId: string; message: string }>;
  durationMs: number;
}

export async function claimProductionRecoveryLease(
  supabase: SupabaseClient,
  args: { ownerToken: string; leaseSeconds?: number },
): Promise<{ status: "claimed" | "busy"; leaseExpiresAt?: string }> {
  const { data, error } = await supabase.rpc("claim_production_recovery_lease", {
    p_owner_token: args.ownerToken,
    p_lease_seconds: args.leaseSeconds ?? 120,
  });
  if (error) throw error;
  const row = (data ?? {}) as Record<string, unknown>;
  const status = row.status === "busy" ? "busy" : "claimed";
  return {
    status,
    leaseExpiresAt:
      typeof row.lease_expires_at === "string" ? row.lease_expires_at : undefined,
  };
}

export async function releaseProductionRecoveryLease(
  supabase: SupabaseClient,
  ownerToken: string,
): Promise<void> {
  await supabase.rpc("release_production_recovery_lease", {
    p_owner_token: ownerToken,
  });
}

/**
 * Scans non-terminal runs and reconciles in a bounded batch.
 * Caller supplies reconcileFn to avoid circular imports with production-run-admin.
 */
export async function runScheduledProductionRecovery(args: {
  supabase: SupabaseClient;
  reconcileFn: (runId: string) => Promise<{
    status: string;
    promotedVideoJobs?: number;
    failedStaleJobs?: number;
  } | null>;
  batchSize?: number;
  maxMs?: number;
  ownerToken?: string;
}): Promise<RunRecoverySummary> {
  const started = Date.now();
  const batchSize = args.batchSize ?? PRODUCTION_RUN_RECOVERY_BATCH_SIZE;
  const maxMs = args.maxMs ?? PRODUCTION_RUN_RECOVERY_MAX_MS;
  const ownerToken = args.ownerToken ?? randomUUID();

  const summary: RunRecoverySummary = {
    scannedRuns: 0,
    reconciledRuns: 0,
    promotedVideoJobs: 0,
    failedStaleJobs: 0,
    settledRuns: 0,
    skippedBusy: false,
    errors: [],
    durationMs: 0,
  };

  runtimeLog("info", {
    event: "run_recovery_started",
    owner_token: ownerToken,
    outcome: "start",
  });

  const claim = await claimProductionRecoveryLease(args.supabase, {
    ownerToken,
  });
  if (claim.status === "busy") {
    summary.skippedBusy = true;
    summary.durationMs = Date.now() - started;
    runtimeLog("info", {
      event: "run_recovery_busy",
      owner_token: ownerToken,
      outcome: "busy",
    });
    return summary;
  }

  try {
    const { data, error } = await args.supabase
      .from("production_runs")
      .select("id, status")
      .in("status", ["queued", "running"])
      .order("updated_at", { ascending: true })
      .limit(batchSize);
    if (error) throw error;

    const runs = data ?? [];
    summary.scannedRuns = runs.length;

    for (const row of runs) {
      if (Date.now() - started >= maxMs) break;
      const runId = row.id as string;
      try {
        const beforeStatus = row.status as string;
        const result = await args.reconcileFn(runId);
        summary.reconciledRuns += 1;
        summary.promotedVideoJobs += result?.promotedVideoJobs ?? 0;
        summary.failedStaleJobs += result?.failedStaleJobs ?? 0;
        if (
          result &&
          beforeStatus !== result.status &&
          ["completed", "failed", "cancelled"].includes(result.status)
        ) {
          summary.settledRuns += 1;
        }
      } catch (err) {
        summary.errors.push({
          runId,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
  } finally {
    await releaseProductionRecoveryLease(args.supabase, ownerToken).catch(
      () => undefined,
    );
  }

  summary.durationMs = Date.now() - started;
  runtimeLog("info", {
    event: "run_recovery_completed",
    owner_token: ownerToken,
    outcome: "ok",
    detail: JSON.stringify({
      scannedRuns: summary.scannedRuns,
      reconciledRuns: summary.reconciledRuns,
      settledRuns: summary.settledRuns,
      errors: summary.errors.length,
    }),
  });
  return summary;
}
