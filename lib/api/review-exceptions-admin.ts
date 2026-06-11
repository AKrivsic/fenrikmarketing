import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  jobHasWarning,
  listReviewRuns,
  readDebug,
  type RenderDebug,
} from "@/lib/api/review-runs-admin";
import type { Json } from "@/lib/supabase/types";

// Read-only CROSS-PROJECT exceptions dashboard backing /review-queue. It surfaces
// only what needs attention (failures + warnings) across all projects. It reuses
// the existing run health (ReviewRunCard.health, computed by runHealth) and the
// existing job-warning extraction (readDebug + jobHasWarning) — no duplicated
// classification logic, no mutations, no new tables / workflows / AI. Service-role
// admin client, same single-tenant pattern as the other review reads.

// Bound the cross-project scans so the dashboard stays cheap. Failures/warnings
// are surfaced from the most recent N rows.
const MAX_JOB_SCAN = 300;
const MAX_ITEM_SCAN = 200;

export type ReviewExceptionKind =
  | "run_failed"
  | "run_warning"
  | "item_failed"
  | "job_failed"
  | "job_warning";

export interface ReviewExceptionCard {
  // Stable, kind-prefixed id (so a run and a job can't collide).
  id: string;
  kind: ReviewExceptionKind;
  projectId: string;
  projectName: string | null;
  title: string;
  detail: string | null;
  // Extra warning tags (e.g. "Subtitle fallback", "Render warning").
  badges: string[];
  createdAt: string;
  // Project Brain Improvements V1 (Part 5) — terminal timestamp for run-based
  // exceptions (the run's completed/failed time). null for item/job cards and
  // for runs still in progress.
  completedAt: string | null;
}

export interface ReviewExceptionsSummary {
  failedRuns: number;
  failedJobs: number;
  warningRuns: number;
  fallbackJobs: number;
}

export interface ReviewExceptions {
  summary: ReviewExceptionsSummary;
  cards: ReviewExceptionCard[];
}

// A subtitle fallback happened when the worker had to synthesize proportional
// subtitles instead of using usable Whisper output.
function isSubtitleFallback(debug: RenderDebug | null): boolean {
  if (!debug) return false;
  return (
    debug.fallback_used === true ||
    debug.subtitle_warning === true ||
    debug.subtitle_source === "proportional"
  );
}

function warningBadges(debug: RenderDebug | null): string[] {
  const badges: string[] = [];
  if (isSubtitleFallback(debug)) badges.push("Subtitle fallback");
  if (debug?.render_warning === true) badges.push("Render warning");
  return badges;
}

function warningDetail(debug: RenderDebug | null): string | null {
  if (debug?.render_warnings && debug.render_warnings.length > 0) {
    return debug.render_warnings.join("; ");
  }
  return null;
}

type VideoJobRow = {
  id: string;
  project_id: string;
  content_item_id: string | null;
  status: string;
  output: Json | null;
  error_message: string | null;
  created_at: string;
};

type RunItemRow = {
  id: string;
  project_id: string;
  platform: string;
  content_item_id: string | null;
  error_message: string | null;
  created_at: string;
};

// Ranks card kinds so failures sort above warnings.
const KIND_RANK: Record<ReviewExceptionKind, number> = {
  run_failed: 0,
  item_failed: 1,
  job_failed: 2,
  run_warning: 3,
  job_warning: 4,
};

export async function listReviewExceptions(): Promise<ReviewExceptions> {
  const supabase = createSupabaseAdminClient();

  // 1) Production runs (cross-project, already health-classified by runHealth).
  const runs = await listReviewRuns();

  // 2) Failed production-run items (per-output failures within a run).
  const { data: itemRows, error: itemError } = await supabase
    .from("production_run_items")
    .select(
      "id, project_id, platform, content_item_id, error_message, created_at",
    )
    .eq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(MAX_ITEM_SCAN);
  if (itemError) throw itemError;
  const failedItems = (itemRows ?? []) as RunItemRow[];

  // 3) Video jobs: failed + recent completed (latter scanned for warnings).
  const { data: jobRows, error: jobError } = await supabase
    .from("video_jobs")
    .select(
      "id, project_id, content_item_id, status, output, error_message, created_at",
    )
    .in("status", ["failed", "completed"])
    .order("created_at", { ascending: false })
    .limit(MAX_JOB_SCAN);
  if (jobError) throw jobError;
  const jobs = (jobRows ?? []) as VideoJobRow[];

  const cards: ReviewExceptionCard[] = [];

  // --- Runs → failed / warning cards. ---
  let failedRuns = 0;
  let warningRuns = 0;
  for (const run of runs) {
    const isFailed = run.status === "failed" || run.failed > 0;
    const hasWarnings = run.warningsCount > 0;
    if (isFailed) failedRuns += 1;
    if (hasWarnings) warningRuns += 1;

    if (isFailed) {
      cards.push({
        id: `run-${run.id}`,
        kind: "run_failed",
        projectId: run.projectId,
        projectName: null,
        title: "Failed production run",
        detail: `${run.failed} failed · ${run.generated} generated · ${run.packageCount} packages`,
        badges: hasWarnings ? [`${run.warningsCount} warnings`] : [],
        createdAt: run.createdAt,
        completedAt: run.completedAt,
      });
    } else if (hasWarnings) {
      cards.push({
        id: `run-${run.id}`,
        kind: "run_warning",
        projectId: run.projectId,
        projectName: null,
        title: "Production run with warnings",
        detail: `${run.warningsCount} warning${run.warningsCount === 1 ? "" : "s"}`,
        badges: [],
        createdAt: run.createdAt,
        completedAt: run.completedAt,
      });
    }
  }

  // --- Failed content items (production_run_items). ---
  for (const item of failedItems) {
    cards.push({
      id: `item-${item.id}`,
      kind: "item_failed",
      projectId: item.project_id,
      projectName: null,
      title: `Failed content item · ${item.platform}`,
      detail: item.error_message,
      badges: [],
      createdAt: item.created_at,
      completedAt: null,
    });
  }

  // --- Video jobs: failed + warnings (incl. subtitle fallback / render). ---
  let fallbackJobs = 0;
  let failedJobs = 0;
  for (const job of jobs) {
    const debug = readDebug(job.output);
    if (isSubtitleFallback(debug)) fallbackJobs += 1;

    if (job.status === "failed") {
      failedJobs += 1;
      cards.push({
        id: `job-${job.id}`,
        kind: "job_failed",
        projectId: job.project_id,
        projectName: null,
        title: "Failed video job",
        detail: job.error_message,
        badges: warningBadges(debug),
        createdAt: job.created_at,
        completedAt: null,
      });
      continue;
    }

    // Completed jobs only surface when they carry a warning / fallback.
    if (jobHasWarning(debug) || isSubtitleFallback(debug)) {
      cards.push({
        id: `job-${job.id}`,
        kind: "job_warning",
        projectId: job.project_id,
        projectName: null,
        title: "Video job with warnings",
        detail: warningDetail(debug),
        badges: warningBadges(debug),
        createdAt: job.created_at,
        completedAt: null,
      });
    }
  }

  // Project names: one query for the distinct projects referenced by the cards.
  const projectIds = Array.from(new Set(cards.map((card) => card.projectId)));
  if (projectIds.length > 0) {
    const { data: projectRows, error: projectError } = await supabase
      .from("projects")
      .select("id, name")
      .in("id", projectIds);
    if (projectError) throw projectError;

    const nameById = new Map<string, string>();
    for (const row of (projectRows ?? []) as { id: string; name: string }[]) {
      nameById.set(row.id, row.name);
    }
    for (const card of cards) {
      card.projectName = nameById.get(card.projectId) ?? null;
    }
  }

  // Failures first, then warnings; newest first within each rank.
  cards.sort((a, b) => {
    if (KIND_RANK[a.kind] !== KIND_RANK[b.kind]) {
      return KIND_RANK[a.kind] - KIND_RANK[b.kind];
    }
    return b.createdAt.localeCompare(a.createdAt);
  });

  return {
    summary: { failedRuns, failedJobs, warningRuns, fallbackJobs },
    cards,
  };
}
