import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { JobStatus } from "@/lib/supabase/types";

// Project-scoped, read-only workflow visibility for the project owner. Uses the
// service-role admin client (RLS bypassed) because the MVP has no user session
// yet; keep this module server-only. Every query is scoped by project_id.
//
// IMPORTANT: there is NO workflow-run table and NO event sourcing in this
// architecture (and this sprint must not add one). Statuses are DERIVED from
// the existing output tables a workflow writes into:
//
//   trend_scan         -> trends
//   weekly_strategy    -> content_strategies
//   content_packages   -> content_packages
//   videos             -> video_jobs (the only stage with a real status column)
//   publishing_planner -> publishing_schedule
//
// Because triggers are fire-and-forget (n8n webhook → async callback), only the
// video stage exposes "running"/"failed". For the output-only stages we can
// honestly report "completed" (rows exist) or "idle" (no rows) — never a
// transient "running"/"failed". This limitation is surfaced in the UI copy.

export type WorkflowStatus = "idle" | "running" | "completed" | "failed";

export interface WorkflowStageStatus {
  status: WorkflowStatus;
  count: number;
}

export interface ProjectWorkflowStatus {
  trendScan: WorkflowStageStatus;
  weeklyStrategy: WorkflowStageStatus;
  contentPackages: WorkflowStageStatus;
  videos: WorkflowStageStatus;
  publishingPlanner: WorkflowStageStatus;
}

// Output-only stages: presence of rows = completed, otherwise idle.
function presenceStatus(count: number): WorkflowStageStatus {
  return { status: count > 0 ? "completed" : "idle", count };
}

// Derives the video stage status from the mix of job statuses. running wins
// over failed wins over completed (newest activity first), idle when no jobs.
function videoStatus(statuses: JobStatus[]): WorkflowStageStatus {
  const count = statuses.length;
  if (count === 0) return { status: "idle", count };
  if (statuses.some((s) => s === "queued" || s === "processing")) {
    return { status: "running", count };
  }
  if (statuses.some((s) => s === "completed")) {
    return { status: "completed", count };
  }
  if (statuses.some((s) => s === "failed")) {
    return { status: "failed", count };
  }
  return { status: "idle", count };
}

export async function getProjectWorkflowStatus(
  projectId: string,
): Promise<ProjectWorkflowStatus> {
  const supabase = createSupabaseAdminClient();

  const [trends, strategies, packages, publishing, videoJobs] =
    await Promise.all([
      supabase
        .from("trends")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId),
      supabase
        .from("content_strategies")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId),
      supabase
        .from("content_packages")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId),
      supabase
        .from("publishing_schedule")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId),
      supabase
        .from("video_jobs")
        .select("status")
        .eq("project_id", projectId),
    ]);

  if (trends.error) throw trends.error;
  if (strategies.error) throw strategies.error;
  if (packages.error) throw packages.error;
  if (publishing.error) throw publishing.error;
  if (videoJobs.error) throw videoJobs.error;

  const videoStatuses = ((videoJobs.data ?? []) as { status: JobStatus }[]).map(
    (row) => row.status,
  );

  return {
    trendScan: presenceStatus(trends.count ?? 0),
    weeklyStrategy: presenceStatus(strategies.count ?? 0),
    contentPackages: presenceStatus(packages.count ?? 0),
    videos: videoStatus(videoStatuses),
    publishingPlanner: presenceStatus(publishing.count ?? 0),
  };
}

// ---------------------------------------------------------------------------
// Approved Flow Visibility (P5). Content moves Review → Approved → Scheduled →
// Published. Counts are derived from content_items.status, except "scheduled"
// which also reflects publishing_schedule (a content item can be scheduled via
// the planner). Read-only; no workflow changes.
// ---------------------------------------------------------------------------

export interface ContentFlowCounts {
  review: number; // draft + in_review
  approved: number; // approved
  scheduled: number; // scheduled
  published: number; // published
}

export async function getProjectContentFlow(
  projectId: string,
): Promise<ContentFlowCounts> {
  const supabase = createSupabaseAdminClient();

  const [review, approved, scheduled, published] = await Promise.all([
    supabase
      .from("content_items")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      .in("status", ["draft", "in_review"]),
    supabase
      .from("content_items")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("status", "approved"),
    supabase
      .from("content_items")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("status", "scheduled"),
    supabase
      .from("content_items")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("status", "published"),
  ]);

  if (review.error) throw review.error;
  if (approved.error) throw approved.error;
  if (scheduled.error) throw scheduled.error;
  if (published.error) throw published.error;

  return {
    review: review.count ?? 0,
    approved: approved.count ?? 0,
    scheduled: scheduled.count ?? 0,
    published: published.count ?? 0,
  };
}
