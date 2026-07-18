import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { JobStatus, ProductionRunStatus } from "@/lib/supabase/types";
import {
  PRODUCTION_RUN_CANCELLED_MESSAGE,
  cancelOpenVideoJobsForProductionRun,
  notifyWorkerOfCancelledJobs,
} from "@/lib/api/production-run-cancel";
import {
  computeProductionPlan,
  expandPlanToItemSlots,
  isPersistableProductionPlatform,
  primaryPlatformForPlan,
  productionPlatformLabel,
  type ProductionConfig,
  type ProductionPlan,
  type ProductionPlatformKind,
  type ProductionPlatformOutput,
} from "@/lib/projects/productionRun";

// ---------------------------------------------------------------------------
// Production run data layer — V3 Package Based Model (service-role admin client,
// same single-tenant pattern as the other project-workflow-admin reads). Every
// query is scoped by project_id.
//
// A production run is a TRACKING layer: it never generates content itself. The
// existing pipeline (n8n → /api/n8n/generate-content-package → runGenerate...)
// creates the real content_packages / content_items / video_jobs; reconcile()
// pairs those real PACKAGES back onto the run's package items so the UI can show
// genuine progress. Per-platform output counts are DERIVED from the run's
// multipliers (1 package fans out to N platform outputs), so they need no rows.
// No new AI / video / storage / n8n internals are introduced.
// ---------------------------------------------------------------------------

export interface ProductionRunPlatformProgress {
  platform: string;
  label: string;
  kind: ProductionPlatformKind;
  multiplier: number;
  // Outputs requested for this platform (= round(packageCount × multiplier)).
  requested: number;
  completed: number;
  running: number;
  failed: number;
}

export interface ProductionRunView {
  id: string;
  status: ProductionRunStatus;
  // Run-level counters (one per package).
  requestedTotal: number;
  generatedTotal: number;
  failedTotal: number;
  errorMessage: string | null;
  // Package = video. Primary quantity + progress.
  packageCount: number;
  packagesCompleted: number;
  packagesRunning: number;
  packagesFailed: number;
  videoCount: number;
  videosCompleted: number;
  // Derived per-platform outputs.
  platforms: ProductionRunPlatformProgress[];
  totalOutputsRequested: number;
  totalOutputsCompleted: number;
  createdAt: string;
  updatedAt: string;
}

interface ProductionRunRow {
  id: string;
  project_id: string;
  status: ProductionRunStatus;
  requested_config: unknown;
  package_count: number;
  requested_total: number;
  generated_total: number;
  failed_total: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

interface ProductionRunItemRow {
  id: string;
  production_run_id: string;
  project_id: string;
  platform: string;
  content_type: string;
  status: ProductionRunStatus;
  content_package_id: string | null;
  content_item_id: string | null;
  video_job_id: string | null;
  error_message: string | null;
}

// Persisted alongside the submitted config so the view can report the derived
// figures (per-platform outputs, totals) without recomputing from items.
interface StoredPlan {
  packageCount: number;
  videoCount: number;
  platformOutputs: ProductionPlatformOutput[];
  videoOutputsTotal: number;
  textOutputsTotal: number;
  totalOutputs: number;
}

interface StoredConfig {
  config: ProductionConfig;
  plan: StoredPlan;
}

function toStoredPlan(plan: ProductionPlan): StoredPlan {
  return {
    packageCount: plan.packageCount,
    videoCount: plan.videoCount,
    platformOutputs: plan.platformOutputs,
    videoOutputsTotal: plan.videoOutputsTotal,
    textOutputsTotal: plan.textOutputsTotal,
    totalOutputs: plan.totalOutputs,
  };
}

// ---------------------------------------------------------------------------
// Create — insert the run + one item per requested PACKAGE. status starts
// queued. requested_total mirrors the package count (one item per package).
// ---------------------------------------------------------------------------
export async function createProductionRun(
  projectId: string,
  config: ProductionConfig,
): Promise<{ runId: string; plan: ProductionPlan }> {
  const supabase = createSupabaseAdminClient();
  const plan = computeProductionPlan(config);
  const slots = expandPlanToItemSlots(plan);

  const storedConfig: StoredConfig = { config, plan: toStoredPlan(plan) };

  const { data: runRow, error: runErr } = await supabase
    .from("production_runs")
    .insert({
      project_id: projectId,
      status: "queued",
      requested_config: storedConfig as unknown as Record<string, unknown>,
      package_count: plan.packageCount,
      requested_total: slots.length,
      generated_total: 0,
      failed_total: 0,
    })
    .select("id")
    .single();
  if (runErr) throw runErr;
  const runId = runRow.id as string;

  if (slots.length > 0) {
    const itemRows = slots.map((slot) => ({
      production_run_id: runId,
      project_id: projectId,
      platform: slot.platform,
      content_type: slot.contentType,
      status: "queued" as const,
    }));
    const { error: itemErr } = await supabase
      .from("production_run_items")
      .insert(itemRows);
    if (itemErr) throw itemErr;
  }

  return { runId, plan };
}

// Marks the run running (generation triggered) or failed (trigger could not be
// dispatched). error message is only set on failure.
export async function setProductionRunStatus(
  runId: string,
  status: ProductionRunStatus,
  errorMessage?: string,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const update: Record<string, unknown> = { status };
  if (status === "failed" || status === "cancelled") {
    update.error_message =
      errorMessage ??
      (status === "cancelled"
        ? "Zastaveno operátorem."
        : "Generování se nepodařilo spustit.");
  }
  const { error } = await supabase
    .from("production_runs")
    .update(update)
    .eq("id", runId);
  if (error) throw error;
}

// The newest run that is still queued/running, used to gate the GENERATE button
// (one active run at a time) — or null when none is active.
export async function getActiveProductionRun(
  projectId: string,
): Promise<{ id: string; status: ProductionRunStatus } | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("production_runs")
    .select("id, status")
    .eq("project_id", projectId)
    .in("status", ["queued", "running"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? { id: data.id as string, status: data.status } : null;
}

export { PRODUCTION_RUN_CANCELLED_MESSAGE };

export interface GenerationFailedDiagnostics {
  error: string;
  validation_errors?: Array<{ path?: string; message: string }>;
  attempts?: number;
}

/**
 * Sprint 4C.1 — when generateContentPackage returns generation_failed:
 * mark the matching production_run_item failed (with diagnostics), bump run
 * failed_total, and settle the run when every slot is terminal.
 * Does NOT require content_package_id. Safe no-op when the strategy item is
 * not part of a production run (weekly strategy path).
 */
export async function markProductionRunItemGenerationFailed(args: {
  projectId: string;
  strategyItemId: string;
  diagnostics: GenerationFailedDiagnostics;
}): Promise<{
  runId: string | null;
  itemId: string | null;
  runStatus: ProductionRunStatus | null;
}> {
  const supabase = createSupabaseAdminClient();
  const { data: strategyItem, error: stratErr } = await supabase
    .from("content_strategy_items")
    .select("id, brief")
    .eq("id", args.strategyItemId)
    .eq("project_id", args.projectId)
    .maybeSingle();
  if (stratErr) throw stratErr;
  if (!strategyItem) {
    return { runId: null, itemId: null, runStatus: null };
  }

  const brief =
    strategyItem.brief && typeof strategyItem.brief === "object"
      ? (strategyItem.brief as Record<string, unknown>)
      : {};
  const runId =
    typeof brief.production_run_id === "string" ? brief.production_run_id : null;
  if (!runId) {
    return { runId: null, itemId: null, runStatus: null };
  }

  const packageIndex =
    typeof brief.package_index === "number" && Number.isFinite(brief.package_index)
      ? Math.max(0, Math.trunc(brief.package_index))
      : 0;

  const items = await loadRunItems(supabase, runId);
  const target =
    items[packageIndex] ??
    items.find((i) => i.status === "queued" || i.status === "running") ??
    null;
  if (!target) {
    const run = await loadRun(supabase, runId);
    return { runId, itemId: null, runStatus: run.status };
  }

  // Do not overwrite an already-completed item that has a package.
  if (target.status === "completed" && target.content_package_id) {
    const run = await loadRun(supabase, runId);
    return { runId, itemId: target.id, runStatus: run.status };
  }

  const firstIssue = args.diagnostics.validation_errors?.[0];
  const detail =
    firstIssue?.message ||
    args.diagnostics.error ||
    "generation_failed";
  const errorMessage = JSON.stringify({
    error: args.diagnostics.error || "generation_failed",
    message: detail,
    validation_errors: args.diagnostics.validation_errors ?? [],
    attempts: args.diagnostics.attempts ?? null,
  }).slice(0, 4000);

  const { error: itemErr } = await supabase
    .from("production_run_items")
    .update({
      status: "failed",
      content_package_id: null,
      error_message: errorMessage,
    })
    .eq("id", target.id)
    .eq("project_id", args.projectId);
  if (itemErr) throw itemErr;

  target.status = "failed";
  target.content_package_id = null;
  target.error_message = errorMessage;

  const runStatus = await settleProductionRunAfterItemFailure(
    supabase,
    runId,
    items,
  );
  return { runId, itemId: target.id, runStatus };
}

/** Recount generated/failed and close the run when every slot is terminal. */
async function settleProductionRunAfterItemFailure(
  supabase: SupabaseClient,
  runId: string,
  items: ProductionRunItemRow[],
): Promise<ProductionRunStatus> {
  const run = await loadRun(supabase, runId);
  if (run.status === "cancelled" || run.status === "failed") {
    return run.status;
  }

  // Refresh items from the in-memory list (caller already updated target).
  const generated = items.filter(
    (i) => i.status === "completed" && i.content_package_id,
  ).length;
  const failed = items.filter((i) => i.status === "failed").length;
  const open = run.requested_total - generated - failed;
  const nextStatus: ProductionRunStatus =
    open <= 0 ? "completed" : "running";

  const firstFailMsg =
    items.find((i) => i.status === "failed" && i.error_message)?.error_message ??
    null;
  let humanError: string | null = null;
  if (firstFailMsg) {
    try {
      const parsed = JSON.parse(firstFailMsg) as { message?: string };
      humanError =
        typeof parsed.message === "string" && parsed.message.trim()
          ? parsed.message.trim().slice(0, 500)
          : firstFailMsg.slice(0, 500);
    } catch {
      humanError = firstFailMsg.slice(0, 500);
    }
  }

  const { error } = await supabase
    .from("production_runs")
    .update({
      generated_total: generated,
      failed_total: failed,
      status: nextStatus,
      ...(nextStatus === "completed" && failed > 0 && generated === 0
        ? { error_message: humanError ?? "Generování balíčku selhalo." }
        : {}),
    })
    .eq("id", runId);
  if (error) throw error;

  run.generated_total = generated;
  run.failed_total = failed;
  run.status = nextStatus;
  return nextStatus;
}

// Operator stop: reconcile progress, cancel open video jobs, close the run, and
// leave already-generated packages in place. Idempotent — re-stop on an already
// cancelled run still mop up any straggling queued/processing jobs.
export async function cancelProductionRun(
  runId: string,
  projectId: string,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const run = await loadRun(supabase, runId);
  if (run.project_id !== projectId) {
    throw new Error("Production run does not belong to this project.");
  }
  if (
    run.status !== "queued" &&
    run.status !== "running" &&
    run.status !== "cancelled"
  ) {
    throw new Error("Pouze aktivní běh lze zastavit.");
  }

  if (run.status === "queued" || run.status === "running") {
    await reconcileProductionRun(runId);
  }

  // Fail every still-open video job for this run BEFORE marking the run
  // cancelled, so late worker callbacks that only update `processing` rows
  // cannot revive cancelled work.
  const cancelledJobIds = await cancelOpenVideoJobsForProductionRun(
    supabase,
    projectId,
    runId,
  );

  // Fail ALL remaining package slots (with or without an assigned package).
  // Previously only slots without content_package_id were closed, so in-flight
  // package renders kept counting as "running" after Stop.
  const { error: itemErr } = await supabase
    .from("production_run_items")
    .update({
      status: "failed",
      error_message: PRODUCTION_RUN_CANCELLED_MESSAGE,
    })
    .eq("production_run_id", runId)
    .in("status", ["queued", "running"]);
  if (itemErr) throw itemErr;

  if (run.status !== "cancelled") {
    await setProductionRunStatus(
      runId,
      "cancelled",
      PRODUCTION_RUN_CANCELLED_MESSAGE,
    );
  }

  await notifyWorkerOfCancelledJobs(cancelledJobIds);
  await reconcileProductionRun(runId);
}

// ---------------------------------------------------------------------------
// Reconcile — pair real generated PACKAGES onto the run's package items, then
// refresh the run counters/status. Safe to call repeatedly (idempotent): only
// queued/running items get newly assigned, and a package is never assigned to
// two run items (here or across runs).
// ---------------------------------------------------------------------------
export async function reconcileProductionRun(
  runId: string,
): Promise<ProductionRunView> {
  const supabase = createSupabaseAdminClient();

  const run = await loadRun(supabase, runId);
  const items = await loadRunItems(supabase, runId);

  // Terminal trigger failures are returned as-is. Cancelled runs still reconcile
  // counters as in-flight videos finish, but never return to "running".
  let progress: RealProgress | null = null;
  if (run.status !== "failed") {
    progress = await reconcileFromRealContent(supabase, run);
    if (run.status !== "cancelled") {
      const markedStale = await failStaleProductionRunIfNeeded(
        supabase,
        run,
        progress,
      );
      if (!markedStale) {
        await syncRunItemsAndCounters(supabase, run, items, progress);
      }
    } else {
      await syncRunItemsAndCounters(supabase, run, items, progress);
    }
  }

  return buildView(run, items, progress);
}

// When a video job finishes (or is retried), refresh the tagged production run
// so run.failed_total / health badges reflect the newest job per content item.
export async function reconcileProductionRunForContentItem(
  projectId: string,
  contentItemId: string | null | undefined,
): Promise<void> {
  if (!contentItemId) return;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("content_items")
    .select("generation_metadata")
    .eq("id", contentItemId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.generation_metadata || typeof data.generation_metadata !== "object") {
    return;
  }
  const runId = (data.generation_metadata as Record<string, unknown>)
    .production_run_id;
  if (typeof runId !== "string" || !runId) return;
  await reconcileProductionRun(runId);
}

// Read-only view of the latest run for a project (reconciled), or null.
export async function getLatestProductionRunView(
  projectId: string,
): Promise<ProductionRunView | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("production_runs")
    .select("id")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return reconcileProductionRun(data.id as string);
}

// ---------------------------------------------------------------------------
// internals
// ---------------------------------------------------------------------------

const STALE_PRODUCTION_RUN_MS = 12 * 60 * 1000;
const STALE_PRODUCTION_RUN_MESSAGE =
  "Generování se nezdařilo spustit (pipeline neprodukuje balíčky). Zkuste spustit běh znovu.";

// When strategy items exist but n8n never produced a package (e.g. webhook workflow
// error), stop showing an endless "running" run so the operator can retry.
async function failStaleProductionRunIfNeeded(
  supabase: SupabaseClient,
  run: ProductionRunRow,
  progress: RealProgress,
): Promise<boolean> {
  if (run.status !== "running" && run.status !== "queued") return false;
  if (progress.packages.length > 0) return false;

  const ageMs = Date.now() - new Date(run.updated_at).getTime();
  if (ageMs < STALE_PRODUCTION_RUN_MS) return false;

  const { count, error } = await supabase
    .from("content_strategy_items")
    .select("id", { count: "exact", head: true })
    .eq("brief->>production_run_id", run.id);
  if (error) throw error;
  if ((count ?? 0) === 0) return false;

  await setProductionRunStatus(run.id, "failed", STALE_PRODUCTION_RUN_MESSAGE);
  run.status = "failed";
  run.error_message = STALE_PRODUCTION_RUN_MESSAGE;
  return true;
}

async function loadRun(
  supabase: SupabaseClient,
  runId: string,
): Promise<ProductionRunRow> {
  const { data, error } = await supabase
    .from("production_runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`production run ${runId} not found`);
  return data as ProductionRunRow;
}

async function loadRunItems(
  supabase: SupabaseClient,
  runId: string,
): Promise<ProductionRunItemRow[]> {
  const { data, error } = await supabase
    .from("production_run_items")
    .select(
      "id, production_run_id, project_id, platform, content_type, status, content_package_id, content_item_id, video_job_id, error_message",
    )
    .eq("production_run_id", runId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProductionRunItemRow[];
}

type PackageItemStatus = "completed" | "running" | "failed";

interface RealContentItemRow {
  id: string;
  platform: string;
  package_id: string | null;
}

interface PlatformCount {
  completed: number;
  running: number;
  failed: number;
}

// The reconciled REAL state of a run, computed by counting actual DB rows
// (content_items tagged with the run id + their video_jobs) — never derived
// from `packages × multiplier`.
interface RealProgress {
  // Package status in created order (first appearance of each package_id).
  packages: { packageId: string; status: PackageItemStatus }[];
  // Real per-platform content_items counts, bucketed by their package status.
  perPlatform: Map<string, PlatformCount>;
  // Completed video_jobs (one shared video per video package).
  videosCompleted: number;
}

// Reconciles a run from the real content it produced. content_items carry
// generation_metadata.production_run_id (stamped by the generator), so this is
// an exact count of what exists in the DB, including X / multiplier fan-out
// rows. Returns the real progress; the caller persists run items + counters.
async function reconcileFromRealContent(
  supabase: SupabaseClient,
  run: ProductionRunRow,
): Promise<RealProgress> {
  // Primary-language content_items belonging to this run (variants excluded).
  const { data: itemRows, error: itemErr } = await supabase
    .from("content_items")
    .select("id, platform, package_id")
    .eq("project_id", run.project_id)
    .eq("generation_metadata->>production_run_id", run.id)
    .is("language", null)
    .order("created_at", { ascending: true });
  if (itemErr) throw itemErr;
  const items = (itemRows ?? []) as RealContentItemRow[];

  const jobByItem = await loadVideoJobsByItem(
    supabase,
    run.project_id,
    items.map((i) => i.id),
  );

  // Group items by package (created order preserved by the ordered query).
  const packageOrder: string[] = [];
  const itemsByPackage = new Map<string, RealContentItemRow[]>();
  for (const item of items) {
    if (!item.package_id) continue;
    let list = itemsByPackage.get(item.package_id);
    if (!list) {
      list = [];
      itemsByPackage.set(item.package_id, list);
      packageOrder.push(item.package_id);
    }
    list.push(item);
  }

  // Package status from its (shared) video job: failed > running > completed.
  // A package with no video job is text-only → completed once its copy exists.
  const packageStatus = new Map<string, PackageItemStatus>();
  let videosCompleted = 0;
  for (const packageId of packageOrder) {
    const pkgItems = itemsByPackage.get(packageId) ?? [];
    const jobs = pkgItems
      .map((i) => jobByItem.get(i.id))
      .filter((j): j is { id: string; status: JobStatus } => Boolean(j));
    let status: PackageItemStatus;
    if (jobs.some((j) => j.status === "failed")) {
      status = "failed";
    } else if (jobs.length === 0 || jobs.every((j) => j.status === "completed")) {
      status = "completed";
    } else {
      status = "running";
    }
    if (jobs.some((j) => j.status === "completed")) videosCompleted += 1;
    packageStatus.set(packageId, status);
  }

  // Per-platform REAL counts: each content_item inherits its package status.
  const perPlatform = new Map<string, PlatformCount>();
  for (const item of items) {
    const status = item.package_id
      ? (packageStatus.get(item.package_id) ?? "running")
      : "running";
    const bucket = perPlatform.get(item.platform) ?? {
      completed: 0,
      running: 0,
      failed: 0,
    };
    bucket[status] += 1;
    perPlatform.set(item.platform, bucket);
  }

  return {
    packages: packageOrder.map((packageId) => ({
      packageId,
      status: packageStatus.get(packageId) ?? "running",
    })),
    perPlatform,
    videosCompleted,
  };
}

// Maps content_item_id -> its latest video_job (id + status). Only items that
// actually have a video job appear.
async function loadVideoJobsByItem(
  supabase: SupabaseClient,
  projectId: string,
  contentItemIds: string[],
): Promise<Map<string, { id: string; status: JobStatus }>> {
  const result = new Map<string, { id: string; status: JobStatus }>();
  if (contentItemIds.length === 0) return result;
  const { data, error } = await supabase
    .from("video_jobs")
    .select("id, content_item_id, status, created_at")
    .eq("project_id", projectId)
    .in("content_item_id", contentItemIds)
    .order("created_at", { ascending: false });
  if (error) throw error;
  for (const row of (data ?? []) as {
    id: string;
    content_item_id: string | null;
    status: JobStatus;
  }[]) {
    if (!row.content_item_id || result.has(row.content_item_id)) continue;
    result.set(row.content_item_id, { id: row.id, status: row.status });
  }
  return result;
}

// Pairs each generated package onto the run's package items (in created order)
// and refreshes the run counters/status from the REAL package outcomes.
async function syncRunItemsAndCounters(
  supabase: SupabaseClient,
  run: ProductionRunRow,
  items: ProductionRunItemRow[],
  progress: RealProgress,
): Promise<void> {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const pkg = progress.packages[i];
    if (!pkg) continue; // not generated yet — leave queued/running
    const nextStatus = pkg.status;
    const errorMessage =
      nextStatus === "failed" ? "Renderování videa selhalo." : null;
    if (
      item.status === nextStatus &&
      item.content_package_id === pkg.packageId &&
      item.error_message === errorMessage
    ) {
      continue;
    }
    item.status = nextStatus;
    item.content_package_id = pkg.packageId;
    item.error_message = errorMessage;
    const { error } = await supabase
      .from("production_run_items")
      .update({
        status: item.status,
        content_package_id: item.content_package_id,
        error_message: item.error_message,
      })
      .eq("id", item.id);
    if (error) throw error;
  }

  const generated = progress.packages.filter(
    (p) => p.status === "completed",
  ).length;
  const failedFromPackages = progress.packages.filter(
    (p) => p.status === "failed",
  ).length;
  // Generation failures leave no package — count those failed items too.
  const generationFailedSlots = items.filter(
    (i) => i.status === "failed" && !i.content_package_id,
  ).length;
  const failed = failedFromPackages + generationFailedSlots;
  const cancelledSlots =
    run.status === "cancelled"
      ? Math.max(0, run.requested_total - progress.packages.length - generationFailedSlots)
      : 0;
  const failedWithCancelled = failed + cancelledSlots;
  // The run is done when every requested package reached a terminal state.
  const open = run.requested_total - generated - failedWithCancelled;
  const nextStatus: ProductionRunStatus =
    run.status === "cancelled"
      ? "cancelled"
      : open <= 0
        ? "completed"
        : run.status === "queued" &&
            progress.packages.length === 0 &&
            generationFailedSlots === 0
          ? "queued"
          : "running";

  const changed =
    run.generated_total !== generated ||
    run.failed_total !== failedWithCancelled ||
    run.status !== nextStatus;
  if (!changed) return;

  run.generated_total = generated;
  run.failed_total = failedWithCancelled;
  run.status = nextStatus;

  const { error } = await supabase
    .from("production_runs")
    .update({
      generated_total: generated,
      failed_total: failedWithCancelled,
      status: nextStatus,
    })
    .eq("id", run.id);
  if (error) throw error;
}

function buildView(
  run: ProductionRunRow,
  items: ProductionRunItemRow[],
  progress: RealProgress | null,
): ProductionRunView {
  const stored = readStoredConfig(run.requested_config);
  const plan = stored?.plan;

  const packageCount = plan?.packageCount ?? run.package_count ?? items.length;
  const packagesCompleted = progress
    ? progress.packages.filter((p) => p.status === "completed").length
    : 0;
  const packagesFailed = progress
    ? progress.packages.filter((p) => p.status === "failed").length
    : 0;
  const packagesRunning = progress
    ? progress.packages.filter((p) => p.status === "running").length
    : 0;

  const platformOutputs = plan?.platformOutputs ?? [];
  const platforms: ProductionRunPlatformProgress[] = platformOutputs.map(
    (output) => {
      const requested = output.outputs;
      const real = progress?.perPlatform.get(output.platform);
      const completed = Math.min(requested, real?.completed ?? 0);
      const failed = real?.failed ?? 0;
      const running = real?.running ?? 0;
      return {
        platform: output.platform,
        label: output.label ?? productionPlatformLabel(output.platform),
        kind: output.kind,
        multiplier: output.multiplier,
        requested,
        completed,
        running,
        failed,
      };
    },
  );

  const totalOutputsRequested =
    plan?.totalOutputs ?? platforms.reduce((s, p) => s + p.requested, 0);
  const totalOutputsCompleted = platforms.reduce(
    (s, p) => s + p.completed,
    0,
  );

  return {
    id: run.id,
    status: run.status,
    requestedTotal: run.requested_total,
    generatedTotal: run.generated_total,
    failedTotal: run.failed_total,
    errorMessage: run.error_message,
    packageCount,
    packagesCompleted,
    packagesRunning,
    packagesFailed,
    videoCount: plan?.videoCount ?? packageCount,
    videosCompleted: progress?.videosCompleted ?? 0,
    platforms,
    totalOutputsRequested,
    totalOutputsCompleted,
    createdAt: run.created_at,
    updatedAt: run.updated_at,
  };
}

function readStoredConfig(value: unknown): StoredConfig | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const plan = record.plan;
  if (!plan || typeof plan !== "object") return null;
  return value as StoredConfig;
}

// ---------------------------------------------------------------------------
// Seed generation inputs.
//
// The existing generator is strategy-item driven (n8n reads a
// content_strategy_items row, then calls runGenerateContentPackage with its
// id). To let the one-button flow generate content WITHOUT the user first
// running Weekly Strategy, the run synthesizes a minimal strategy + items it
// can consume. This is the "minimal orchestration over existing functions"
// the brief allows — it adds NO new generator, AI provider or video worker.
//
// One item is created per requested PACKAGE (capped). Each package fans out to
// all selected platforms at generation time, so no separate per-platform items
// are synthesized. Each item is tagged with the production_run_id for trace.
// ---------------------------------------------------------------------------
const SEED_ITEM_CAP = 50;

export async function seedProductionStrategyInputs(args: {
  projectId: string;
  projectName: string;
  goalType: string;
  plan: ProductionPlan;
  config: ProductionConfig;
  runId: string;
}): Promise<void> {
  const { projectId, projectName, goalType, plan, config, runId } = args;

  if (plan.packageCount <= 0) return;

  // Pick a persistable platform for the seed strategy items. Prefer the run's
  // primary (video) platform; fall back to the first persistable active one.
  const primary = primaryPlatformForPlan(plan);
  const persistable =
    (primary && isPersistableProductionPlatform(primary) ? primary : null) ??
    config.platforms.find(isPersistableProductionPlatform);
  if (!persistable) return;

  const isVideo = plan.activeVideoPlatforms.includes(
    persistable as ProductionPlan["activeVideoPlatforms"][number],
  );
  const format = isVideo ? "reel" : "post";
  const count = Math.min(plan.packageCount, SEED_ITEM_CAP);

  const supabase = createSupabaseAdminClient();
  const { data: strategyRow, error: strategyErr } = await supabase
    .from("content_strategies")
    .insert({
      project_id: projectId,
      name: `Production run ${new Date().toISOString().slice(0, 10)}`,
      objective: goalType,
      period_start: new Date().toISOString().slice(0, 10),
      strategy_brief: {
        source: "production_run",
        production_run_id: runId,
      } as unknown as Record<string, unknown>,
    })
    .select("id")
    .single();
  if (strategyErr) throw strategyErr;
  const strategyId = strategyRow.id as string;

  const itemRows = Array.from({ length: count }, (_unused, i) => ({
    strategy_id: strategyId,
    project_id: projectId,
    platform: persistable,
    format,
    funnel_stage: "awareness",
    priority: 3,
    brief: {
      topic: `${projectName} — auto téma ${i + 1}`,
      source: "production_run",
      production_run_id: runId,
      // 0-based package index drives the generator's text-output fan-out
      // distribution (so fractional multipliers spread evenly across packages).
      package_index: i,
    } as unknown as Record<string, unknown>,
  }));
  const { error: itemsErr } = await supabase
    .from("content_strategy_items")
    .insert(itemRows);
  if (itemsErr) throw itemsErr;
}
