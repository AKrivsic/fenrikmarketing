import { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  unauthorizedResponse,
  verifyN8nSecret,
} from "@/lib/n8n/callback";
import { reconcileProductionRunForRecovery } from "@/lib/api/production-run-admin";
import { runScheduledProductionRecovery } from "@/lib/production-runtime";

/**
 * Phase 6G — dedicated production-run recovery entry point.
 * Auth: same x-n8n-secret as other internal automation routes.
 * Does not start AI, render videos, or retry failed jobs blindly —
 * only reconciles active runs (promote artifacts, fail stale, settle).
 */
export async function POST(request: NextRequest): Promise<Response> {
  if (!verifyN8nSecret(request)) {
    return unauthorizedResponse();
  }

  const supabase = createSupabaseAdminClient();
  const summary = await runScheduledProductionRecovery({
    supabase,
    reconcileFn: reconcileProductionRunForRecovery,
  });

  return Response.json({
    ok: true,
    summary: {
      scanned_runs: summary.scannedRuns,
      reconciled_runs: summary.reconciledRuns,
      promoted_video_jobs: summary.promotedVideoJobs,
      failed_stale_jobs: summary.failedStaleJobs,
      settled_runs: summary.settledRuns,
      skipped_busy: summary.skippedBusy,
      errors: summary.errors,
      duration_ms: summary.durationMs,
    },
  });
}

export async function GET(request: NextRequest): Promise<Response> {
  return POST(request);
}
