import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listHistoryEntries, type HistoryEntry } from "@/lib/api/history-admin";

// Read-only MVP dashboard summary for the internal admin UI. Simple global
// counts only — no analytics, no content_performance, no video_jobs, no charts.
// Uses the service-role admin client (RLS bypassed); keep server-only.
// This is a UI read model, not a global DB entity type.

// Content item statuses that count as "pending review" — same semantics as the
// Review Queue (lib/api/review-queue.ts).
const REVIEW_STATUSES = ["draft", "in_review"] as const;

const RECENT_ACTIVITY_LIMIT = 5;

export interface DashboardSummary {
  projectCount: number;
  pendingReviewCount: number;
  approvedCount: number;
  assetCount: number;
  scheduledCount: number;
  recentActivity: HistoryEntry[];
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const supabase = createSupabaseAdminClient();

  const [
    projects,
    pendingReview,
    approved,
    assets,
    scheduled,
    recentActivity,
  ] = await Promise.all([
    supabase.from("projects").select("*", { count: "exact", head: true }),
    supabase
      .from("content_items")
      .select("*", { count: "exact", head: true })
      .in("status", REVIEW_STATUSES),
    supabase
      .from("content_items")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved"),
    supabase.from("assets").select("*", { count: "exact", head: true }),
    supabase
      .from("publishing_schedule")
      .select("*", { count: "exact", head: true })
      .eq("status", "scheduled"),
    listHistoryEntries(RECENT_ACTIVITY_LIMIT),
  ]);

  if (projects.error) throw projects.error;
  if (pendingReview.error) throw pendingReview.error;
  if (approved.error) throw approved.error;
  if (assets.error) throw assets.error;
  if (scheduled.error) throw scheduled.error;

  return {
    projectCount: projects.count ?? 0,
    pendingReviewCount: pendingReview.count ?? 0,
    approvedCount: approved.count ?? 0,
    assetCount: assets.count ?? 0,
    scheduledCount: scheduled.count ?? 0,
    recentActivity,
  };
}
