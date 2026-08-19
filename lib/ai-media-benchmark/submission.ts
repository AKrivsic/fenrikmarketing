import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { classifyCreateFailure } from "@/lib/ai-media-benchmark/createFailure";
import {
  isAiMediaBenchmarkTerminalStatus,
  type AiMediaBenchmarkRunRow,
} from "@/lib/ai-media-benchmark/types";

export const AI_MEDIA_BENCHMARK_SUBMISSION_CLAIM_STALE_MS = 5 * 60 * 1000;

export interface BenchmarkSubmissionDeps {
  now?: () => Date;
  submissionClaimOwner?: string;
}

function nowIso(deps?: BenchmarkSubmissionDeps): string {
  return (deps?.now ?? (() => new Date()))().toISOString();
}

export function submissionOwner(deps?: BenchmarkSubmissionDeps): string {
  return deps?.submissionClaimOwner ?? randomUUID();
}

export function isSubmissionClaimStale(
  row: AiMediaBenchmarkRunRow,
  deps?: BenchmarkSubmissionDeps,
): boolean {
  if (!row.submission_claimed_at || !row.submission_claim_owner) return false;
  const claimedAt = Date.parse(row.submission_claimed_at);
  if (!Number.isFinite(claimedAt)) return false;
  const now = (deps?.now ?? (() => new Date()))().getTime();
  return now - claimedAt >= AI_MEDIA_BENCHMARK_SUBMISSION_CLAIM_STALE_MS;
}

export async function loadBenchmarkRun(
  supabase: SupabaseClient,
  id: string,
): Promise<AiMediaBenchmarkRunRow> {
  const { data, error } = await supabase
    .from("ai_media_benchmark_runs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("benchmark_run_not_found");
  return data as AiMediaBenchmarkRunRow;
}

export async function markStaleSubmissionUnknown(
  supabase: SupabaseClient,
  row: AiMediaBenchmarkRunRow,
  deps?: BenchmarkSubmissionDeps,
): Promise<AiMediaBenchmarkRunRow> {
  let query = supabase
    .from("ai_media_benchmark_runs")
    .update({
      status: "submission_unknown",
      error_message:
        "Submission claim expired without provider_task_id — manual review required.",
      failure_code: "submission_claim_stale",
      completed_at: nowIso(deps),
      submission_claimed_at: null,
      submission_claim_owner: null,
    })
    .eq("id", row.id)
    .eq("status", "submitting")
    .is("provider_task_id", null);

  if (row.submission_claim_owner && row.submission_claimed_at) {
    query = query
      .eq("submission_claim_owner", row.submission_claim_owner)
      .eq("submission_claimed_at", row.submission_claimed_at);
  }

  const { data, error } = await query.select("*").maybeSingle();
  if (error) throw error;
  if (data) return data as AiMediaBenchmarkRunRow;
  return loadBenchmarkRun(supabase, row.id);
}

export async function resolveSubmittingRowForSync(
  supabase: SupabaseClient,
  row: AiMediaBenchmarkRunRow,
  deps?: BenchmarkSubmissionDeps,
): Promise<AiMediaBenchmarkRunRow> {
  if (row.status !== "submitting" || row.provider_task_id) {
    return row;
  }
  if (isSubmissionClaimStale(row, deps)) {
    return markStaleSubmissionUnknown(supabase, row, deps);
  }
  return row;
}

/**
 * Atomic submission claim before provider create POST.
 * Never reclaims a stale claim for another POST — stale → submission_unknown.
 */
export async function claimSubmission(
  supabase: SupabaseClient,
  row: AiMediaBenchmarkRunRow,
  owner: string,
  deps?: BenchmarkSubmissionDeps,
): Promise<AiMediaBenchmarkRunRow | null> {
  if (row.provider_task_id) return null;

  const current = await loadBenchmarkRun(supabase, row.id);
  if (current.provider_task_id) return null;

  if (current.status === "submitting") {
    if (isSubmissionClaimStale(current, deps)) {
      await markStaleSubmissionUnknown(supabase, current, deps);
      return null;
    }
    return null;
  }

  if (current.status !== "created") return null;

  const nowDate = (deps?.now ?? (() => new Date()))();
  const { data, error } = await supabase
    .from("ai_media_benchmark_runs")
    .update({
      status: "submitting",
      submission_claimed_at: nowDate.toISOString(),
      submission_claim_owner: owner,
    })
    .eq("id", row.id)
    .eq("status", "created")
    .is("provider_task_id", null)
    .is("submission_claim_owner", null)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? (data as AiMediaBenchmarkRunRow) : null;
}

export async function markOwnedSubmissionTerminal(
  supabase: SupabaseClient,
  id: string,
  owner: string,
  status: "failed" | "submission_unknown" | "download_failed",
  errorMessage: string,
  failureCode: string | null,
  deps?: BenchmarkSubmissionDeps,
): Promise<AiMediaBenchmarkRunRow | "claim_lost"> {
  const { data, error } = await supabase
    .from("ai_media_benchmark_runs")
    .update({
      status,
      error_message: errorMessage.slice(0, 1000),
      failure_code: failureCode,
      completed_at: nowIso(deps),
      submission_claimed_at: null,
      submission_claim_owner: null,
    })
    .eq("id", id)
    .eq("status", "submitting")
    .eq("submission_claim_owner", owner)
    .is("provider_task_id", null)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) return "claim_lost";
  return data as AiMediaBenchmarkRunRow;
}

export type PaidCreateResult =
  | { kind: "async"; providerTaskId: string }
  | { kind: "sync_success"; patch: Record<string, unknown> };

function shouldSkipPaidPost(row: AiMediaBenchmarkRunRow): boolean {
  if (row.provider_task_id) return true;
  if (isAiMediaBenchmarkTerminalStatus(row.status)) return true;
  if (row.status === "pending" || row.status === "running") return true;
  return false;
}

/**
 * Claim then POST. Active claims never POST twice. Stale claims become
 * submission_unknown and never auto re-POST.
 */
export async function submitPaidCreate(args: {
  supabase: SupabaseClient;
  row: AiMediaBenchmarkRunRow;
  deps?: BenchmarkSubmissionDeps;
  prepare?: (claimed: AiMediaBenchmarkRunRow) => Promise<void>;
  post: (claimed: AiMediaBenchmarkRunRow) => Promise<PaidCreateResult>;
}): Promise<AiMediaBenchmarkRunRow> {
  const { supabase, deps } = args;
  const row = args.row;

  if (row.status === "submission_unknown") {
    throw new Error("submission_unknown");
  }
  if (shouldSkipPaidPost(row)) {
    return row;
  }

  const owner = submissionOwner(deps);
  const claimed = await claimSubmission(supabase, row, owner, deps);
  if (!claimed) {
    const current = await loadBenchmarkRun(supabase, row.id);
    if (
      current.status === "submitting" &&
      !current.provider_task_id &&
      isSubmissionClaimStale(current, deps)
    ) {
      await markStaleSubmissionUnknown(supabase, current, deps);
      throw new Error("submission_unknown");
    }
    if (current.status === "submission_unknown") {
      throw new Error("submission_unknown");
    }
    return current;
  }

  if (args.prepare) {
    try {
      await args.prepare(claimed);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "prepare_failed";
      const marked = await markOwnedSubmissionTerminal(
        supabase,
        claimed.id,
        owner,
        "failed",
        message,
        "prepare_failed",
        deps,
      );
      if (marked === "claim_lost") {
        return loadBenchmarkRun(supabase, claimed.id);
      }
      throw err;
    }
  }

  try {
    const created = await args.post(claimed);
    if (created.kind === "async") {
      const { data: updated, error: updateError } = await supabase
        .from("ai_media_benchmark_runs")
        .update({
          provider_task_id: created.providerTaskId,
          status: "pending",
          submission_claimed_at: null,
          submission_claim_owner: null,
        })
        .eq("id", claimed.id)
        .eq("status", "submitting")
        .eq("submission_claim_owner", owner)
        .is("provider_task_id", null)
        .select("*")
        .maybeSingle();
      if (updateError) throw updateError;
      if (!updated) {
        return loadBenchmarkRun(supabase, claimed.id);
      }
      return updated as AiMediaBenchmarkRunRow;
    }

    const { data: updated, error: updateError } = await supabase
      .from("ai_media_benchmark_runs")
      .update({
        ...created.patch,
        submission_claimed_at: null,
        submission_claim_owner: null,
      })
      .eq("id", claimed.id)
      .eq("status", "submitting")
      .eq("submission_claim_owner", owner)
      .is("provider_task_id", null)
      .select("*")
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updated) {
      return loadBenchmarkRun(supabase, claimed.id);
    }
    return updated as AiMediaBenchmarkRunRow;
  } catch (err) {
    const message =
      err instanceof Error ? err.message.slice(0, 1000) : "provider_create_failed";
    const classified = classifyCreateFailure(err);
    const marked = await markOwnedSubmissionTerminal(
      supabase,
      claimed.id,
      owner,
      classified,
      message,
      classified === "submission_unknown"
        ? "provider_create_ambiguous"
        : "provider_create_failed",
      deps,
    );
    if (marked === "claim_lost") {
      return loadBenchmarkRun(supabase, claimed.id);
    }
    if (classified === "submission_unknown") {
      throw new Error("submission_unknown");
    }
    throw err;
  }
}
