/**
 * Phase 7A — Cancel Manual Review.
 *
 * Emergency cancellation for Manual Review runs waiting for creative review.
 * Does not create video jobs, does not delete packages / creative_review /
 * history. Production and Sample cancel paths remain untouched.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json, ProductionRunStatus } from "@/lib/supabase/types";
import {
  parseGenerationMode,
  type GenerationMode,
} from "@/lib/ai/generationMode";
import { settleProductionRunTerminal } from "@/lib/production-runtime/runSettlement";
import { runtimeLog } from "@/lib/production-runtime/runtimeLog";
import {
  appendCreativeReviewHistory,
} from "@/lib/creative-review/lifecycle";
import { readCreativeReviewFromBrief } from "@/lib/creative-review/read";
import { assertCreativeReview } from "@/lib/creative-review/validate";
import type { CreativeReviewActor } from "@/lib/creative-review/types";

export { canCancelManualReview } from "@/lib/creative-review/cancelGate";

/** Persisted on production_runs.error_message for Manual Review cancels. */
export const MANUAL_REVIEW_CANCELLED_MESSAGE = "Manual Review cancelled.";

export type CancelManualReviewCode =
  | "ok"
  | "already_cancelled"
  | "not_found"
  | "forbidden_mode"
  | "invalid_status"
  | "invalid_input";

export type CancelManualReviewResult =
  | {
      ok: true;
      code: "ok" | "already_cancelled";
      runId: string;
      status: ProductionRunStatus;
      packagesUpdated: number;
      itemsCancelled: number;
    }
  | {
      ok: false;
      code: Exclude<CancelManualReviewCode, "ok" | "already_cancelled">;
      error: string;
    };

export interface CancelManualReviewDeps {
  supabase?: SupabaseClient;
  now?: () => Date;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function generationModeFromRequestedConfig(raw: unknown): GenerationMode {
  const stored = asRecord(raw);
  const config = asRecord(stored?.config);
  return parseGenerationMode(
    config?.generation_mode ?? config?.generationMode,
  );
}

function fail(
  code: Exclude<CancelManualReviewCode, "ok" | "already_cancelled">,
  error: string,
): CancelManualReviewResult {
  return { ok: false, code, error };
}

async function appendCancelHistoryToPackages(args: {
  supabase: SupabaseClient;
  projectId: string;
  runId: string;
  actor: CreativeReviewActor;
  timestamp: string;
}): Promise<number> {
  const { data: items, error: itemErr } = await args.supabase
    .from("production_run_items")
    .select("content_package_id")
    .eq("production_run_id", args.runId)
    .eq("project_id", args.projectId)
    .not("content_package_id", "is", null);
  if (itemErr) throw itemErr;

  const packageIds = [
    ...new Set(
      (items ?? [])
        .map((row) => row.content_package_id as string | null)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];
  if (packageIds.length === 0) return 0;

  const { data: packages, error: pkgErr } = await args.supabase
    .from("content_packages")
    .select("id, package_brief")
    .eq("project_id", args.projectId)
    .in("id", packageIds);
  if (pkgErr) throw pkgErr;

  let updated = 0;
  for (const row of packages ?? []) {
    const packageId = row.id as string;
    const brief = asRecord(row.package_brief) ?? {};
    const read = readCreativeReviewFromBrief(brief);
    if (!read.ok || read.value === null) continue;

    const review = read.value;
    const last = review.history[review.history.length - 1];
    if (last?.event === "manual_review_cancelled") {
      continue;
    }

    const next = appendCreativeReviewHistory({
      review,
      event: "manual_review_cancelled",
      actor: args.actor,
      timestamp: args.timestamp,
    });
    assertCreativeReview(next);

    const nextBrief = {
      ...brief,
      creative_review: next,
    };
    const { error: updateErr } = await args.supabase
      .from("content_packages")
      .update({ package_brief: nextBrief as unknown as Json })
      .eq("id", packageId)
      .eq("project_id", args.projectId);
    if (updateErr) throw updateErr;
    updated += 1;
  }

  return updated;
}

/**
 * Cancel a Manual Review run that is waiting for creative review.
 *
 * Preserves packages, creative_review drafts, and prior history.
 * Does not create or dispatch video jobs.
 */
export async function cancelManualReview(args: {
  projectId: string;
  runId: string;
  actor: CreativeReviewActor;
  deps?: CancelManualReviewDeps;
}): Promise<CancelManualReviewResult> {
  const { projectId, runId, actor } = args;
  const deps = args.deps ?? {};
  const supabase = deps.supabase ?? createSupabaseAdminClient();
  const now = deps.now ?? (() => new Date());
  const timestamp = now().toISOString();

  if (!projectId || !runId) {
    return fail("invalid_input", "Missing project or run id.");
  }

  runtimeLog("info", {
    event: "manual_review_cancel_requested",
    project_id: projectId,
    production_run_id: runId,
  });

  const { data: run, error: runErr } = await supabase
    .from("production_runs")
    .select(
      "id, project_id, status, requested_config, package_count, generated_total, failed_total",
    )
    .eq("id", runId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (runErr) throw runErr;
  if (!run) {
    return fail("not_found", "Production run not found.");
  }

  const generationMode = generationModeFromRequestedConfig(run.requested_config);
  if (generationMode !== "manual_review") {
    return fail(
      "forbidden_mode",
      "Cancel Manual Review is available only for Manual Review runs.",
    );
  }

  if (run.status === "cancelled") {
    runtimeLog("info", {
      event: "manual_review_cancel_completed",
      project_id: projectId,
      production_run_id: runId,
      outcome: "already_cancelled",
    });
    return {
      ok: true,
      code: "already_cancelled",
      runId,
      status: "cancelled",
      packagesUpdated: 0,
      itemsCancelled: 0,
    };
  }

  if (run.status !== "waiting_for_creative_review") {
    return fail(
      "invalid_status",
      `Cancel Manual Review requires status waiting_for_creative_review (currently: ${run.status}).`,
    );
  }

  // Cancel only open slots. Completed package slots stay completed (packages kept).
  const { data: cancelledItems, error: itemErr } = await supabase
    .from("production_run_items")
    .update({
      status: "cancelled",
      error_message: MANUAL_REVIEW_CANCELLED_MESSAGE,
    })
    .eq("production_run_id", runId)
    .eq("project_id", projectId)
    .in("status", ["queued", "running"])
    .select("id");
  if (itemErr) throw itemErr;
  const itemsCancelled = cancelledItems?.length ?? 0;

  const packagesUpdated = await appendCancelHistoryToPackages({
    supabase,
    projectId,
    runId,
    actor,
    timestamp,
  });

  // Terminal settle recomputes counters; open items already cancelled above.
  await settleProductionRunTerminal(supabase, {
    runId,
    status: "cancelled",
    errorMessage: MANUAL_REVIEW_CANCELLED_MESSAGE,
    itemErrorMessage: MANUAL_REVIEW_CANCELLED_MESSAGE,
  });

  runtimeLog("info", {
    event: "manual_review_cancel_completed",
    project_id: projectId,
    production_run_id: runId,
    outcome: "ok",
    detail: `packages=${packagesUpdated} items=${itemsCancelled}`,
  });

  return {
    ok: true,
    code: "ok",
    runId,
    status: "cancelled",
    packagesUpdated,
    itemsCancelled,
  };
}
