/**
 * Durable recovery for Creative Core v2 derive jobs.
 * Vercel after() is a kick only — brief pending/claim is the source of truth.
 * Automatic recovery transport: n8n Production Run Recovery cron (~2 min) →
 * `/api/internal/production-run-recovery` → `runScheduledProductionRecovery`.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { readApprovedCreativeCoreSnapshot } from "@/lib/content-creative-core-v2/approvedSnapshot";
import {
  markDerivedOutputsStale,
  readDerivedOutputs,
} from "@/lib/content-creative-core-v2/derivedOutputsState";
import { runDerivePlatformOutputsForPackage } from "@/lib/content-creative-core-v2/runDeriveOutputs";
import { shouldMarkDeriveStuckForOperatorRetry } from "@/lib/content-creative-core-v2/stuckDerive";
import type { Json } from "@/lib/supabase/types";

export {
  CREATIVE_CORE_V2_DERIVE_STUCK_MS,
  shouldMarkDeriveStuckForOperatorRetry,
} from "@/lib/content-creative-core-v2/stuckDerive";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function claimExpired(derived: ReturnType<typeof readDerivedOutputs>): boolean {
  if (!derived?.claim?.lease_expires_at) return true;
  return Date.parse(derived.claim.lease_expires_at) <= Date.now();
}

export function packageNeedsDeriveRecovery(
  brief: Record<string, unknown>,
): boolean {
  const approved = readApprovedCreativeCoreSnapshot(brief);
  if (!approved) return false;
  const derived = readDerivedOutputs(brief);
  if (!derived) return true;
  if (derived.stale) return true;
  if (derived.status === "failed") return true;
  if (derived.status === "pending") return true;
  if (
    (derived.status === "generating_texts" ||
      derived.status === "generating_social_image") &&
    claimExpired(derived)
  ) {
    return true;
  }
  if (
    derived.texts_ready &&
    derived.social_image_required &&
    !derived.social_image_ready
  ) {
    return true;
  }
  return false;
}

export function packageDeriveIsComplete(brief: Record<string, unknown>): boolean {
  const derived = readDerivedOutputs(brief);
  return Boolean(
    derived &&
      !derived.stale &&
      derived.status === "ready" &&
      derived.texts_ready &&
      (!derived.social_image_required || derived.social_image_ready),
  );
}

export async function markStuckDeriveOutputsForOperatorRetry(args: {
  supabase: SupabaseClient;
  projectId?: string;
  limit?: number;
  nowMs?: number;
}): Promise<{ marked: number }> {
  const nowMs = args.nowMs ?? Date.now();
  let query = args.supabase
    .from("content_packages")
    .select("id, project_id, package_brief, status, updated_at")
    .order("updated_at", { ascending: true })
    .limit(args.limit ?? 20);
  if (args.projectId) {
    query = query.eq("project_id", args.projectId);
  }
  const { data, error } = await query;
  if (error) throw error;

  let marked = 0;
  for (const row of data ?? []) {
    if (row.status === "cancelled") continue;
    const brief = asRecord(row.package_brief) ?? {};
    if (!shouldMarkDeriveStuckForOperatorRetry(brief, nowMs)) continue;
    const next = markDerivedOutputsStale(
      brief,
      "derive_stuck_pending_timeout",
    );
    const { error: updErr } = await args.supabase
      .from("content_packages")
      .update({ package_brief: next as unknown as Json })
      .eq("id", row.id as string)
      .eq("project_id", row.project_id as string);
    if (updErr) throw updErr;
    marked += 1;
  }
  return { marked };
}

export async function recoverCreativeCoreV2DeriveForPackage(args: {
  supabase: SupabaseClient;
  projectId: string;
  packageId: string;
}): Promise<{
  ok: boolean;
  recovered: boolean;
  skipped: boolean;
  error?: string;
  awaitingPaidConfirmation?: boolean;
}> {
  const { data, error } = await args.supabase
    .from("content_packages")
    .select("id, package_brief, status")
    .eq("id", args.packageId)
    .eq("project_id", args.projectId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    return { ok: false, recovered: false, skipped: true, error: "not_found" };
  }
  if (data.status === "cancelled") {
    return { ok: true, recovered: false, skipped: true };
  }
  const brief = asRecord(data.package_brief) ?? {};
  if (!packageNeedsDeriveRecovery(brief)) {
    return { ok: true, recovered: false, skipped: true };
  }

  const result = await runDerivePlatformOutputsForPackage({
    supabase: args.supabase,
    projectId: args.projectId,
    packageId: args.packageId,
  });
  if (!result.ok) {
    if (result.busy) {
      return { ok: true, recovered: false, skipped: true };
    }
    const nextFailed = markDerivedOutputsStale(
      brief,
      result.error ?? "derive_failed",
    );
    await args.supabase
      .from("content_packages")
      .update({ package_brief: nextFailed as unknown as Json })
      .eq("id", args.packageId)
      .eq("project_id", args.projectId);
    return {
      ok: false,
      recovered: false,
      skipped: false,
      error: result.error,
    };
  }

  return { ok: true, recovered: true, skipped: false };
}

export async function recoverPendingCreativeCoreV2DeriveJobs(args: {
  supabase: SupabaseClient;
  projectId?: string;
  limit?: number;
}): Promise<{ scanned: number; recovered: number; failed: number; busy: number }> {
  let query = args.supabase
    .from("content_packages")
    .select("id, project_id, package_brief, status, updated_at")
    .order("updated_at", { ascending: true })
    .limit(args.limit ?? 20);
  if (args.projectId) {
    query = query.eq("project_id", args.projectId);
  }
  const { data, error } = await query;
  if (error) throw error;

  let scanned = 0;
  let recovered = 0;
  let failed = 0;
  let busy = 0;
  for (const row of data ?? []) {
    const brief = asRecord(row.package_brief) ?? {};
    if (!readApprovedCreativeCoreSnapshot(brief)) continue;
    if (!packageNeedsDeriveRecovery(brief)) continue;
    scanned += 1;
    const result = await recoverCreativeCoreV2DeriveForPackage({
      supabase: args.supabase,
      projectId: row.project_id as string,
      packageId: row.id as string,
    });
    if (result.recovered) recovered += 1;
    else if (!result.ok) failed += 1;
    else if (result.skipped) busy += 1;
  }
  return { scanned, recovered, failed, busy };
}
