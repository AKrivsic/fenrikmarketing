import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  ContentItem,
  ContentPackage,
  Project,
  VideoJob,
} from "@/lib/supabase/types";
import {
  computeRunCoverage,
  type RunCoverageReport,
  type RunCoverageStrategyItem,
} from "@/lib/production-runs/runCoverage";

// Loads existing rows for one production run and derives a coverage report
// (no persistence, no schema changes).
export async function loadRunCoverageReport(
  runId: string,
  project: Project,
  supabase: SupabaseClient = createSupabaseAdminClient(),
): Promise<RunCoverageReport | null> {
  const { data: runRow, error: runErr } = await supabase
    .from("production_runs")
    .select("*")
    .eq("id", runId)
    .eq("project_id", project.id)
    .maybeSingle();
  if (runErr) throw runErr;
  if (!runRow) return null;

  const { data: strategyRows, error: strategyErr } = await supabase
    .from("content_strategy_items")
    .select("id, brief")
    .eq("project_id", project.id)
    .eq("brief->>production_run_id", runId);
  if (strategyErr) throw strategyErr;

  const strategyItems = (strategyRows ?? []) as RunCoverageStrategyItem[];
  const strategyItemIds = strategyItems.map((row) => row.id);

  let packages: ContentPackage[] = [];
  if (strategyItemIds.length > 0) {
    const { data: pkgRows, error: pkgErr } = await supabase
      .from("content_packages")
      .select("*")
      .eq("project_id", project.id)
      .in("strategy_item_id", strategyItemIds);
    if (pkgErr) throw pkgErr;
    packages = (pkgRows ?? []) as ContentPackage[];
  }

  const { data: itemRows, error: itemErr } = await supabase
    .from("content_items")
    .select("*")
    .eq("project_id", project.id)
    .eq("generation_metadata->>production_run_id", runId);
  if (itemErr) throw itemErr;
  const contentItems = (itemRows ?? []) as ContentItem[];

  const itemIds = contentItems.map((item) => item.id);
  let videoJobs: VideoJob[] = [];
  if (itemIds.length > 0) {
    const { data: jobRows, error: jobErr } = await supabase
      .from("video_jobs")
      .select("*")
      .eq("project_id", project.id)
      .in("content_item_id", itemIds)
      .order("created_at", { ascending: false });
    if (jobErr) throw jobErr;
    videoJobs = (jobRows ?? []) as VideoJob[];
  }

  return computeRunCoverage({
    project,
    run: runRow,
    packages,
    strategyItems,
    contentItems,
    videoJobs,
  });
}
