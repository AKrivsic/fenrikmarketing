import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  listProjectContentByStatus,
  type ProjectContentEntry,
} from "@/lib/api/project-content-admin";
import {
  listReviewRunsForProject,
  type ReviewRunCard,
} from "@/lib/api/review-runs-admin";
import type { ApprovalStatus } from "@/lib/supabase/types";

// Composes the project review tab as Production Run → Package → Content item.
// Pure composition over EXISTING read layers: the run cards come from
// review-runs-admin, the actionable content entries from project-content-admin.
// Grouping is item-driven by generation_metadata.production_run_id + package_id.
// No new tables, workflows or AI.

// Content shown on the review tab is the pending work: draft + in_review.
const PENDING_STATUSES: ApprovalStatus[] = ["draft", "in_review"];
const NO_PACKAGE_TITLE = "Bez balíčku";

export interface ReviewPackageGroup {
  // null only for items that somehow carry no package_id.
  packageId: string | null;
  title: string;
  items: ProjectContentEntry[];
}

export interface ReviewRunGroup {
  // The production run header (existing review-run card), or null for the
  // synthetic bucket holding items with no/unknown production_run_id.
  run: ReviewRunCard | null;
  packages: ReviewPackageGroup[];
}

// Resolves package titles for the packages referenced by the given entries.
// One scoped query; returns an empty map when there is nothing to resolve.
async function loadPackageTitles(
  projectId: string,
  entries: ProjectContentEntry[],
): Promise<Map<string, string>> {
  const ids = Array.from(
    new Set(
      entries
        .map((entry) => entry.packageId)
        .filter((id): id is string => typeof id === "string"),
    ),
  );
  const titles = new Map<string, string>();
  if (ids.length === 0) return titles;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("content_packages")
    .select("id, title")
    .eq("project_id", projectId)
    .in("id", ids);
  if (error) throw error;

  for (const row of (data ?? []) as { id: string; title: string }[]) {
    titles.set(row.id, row.title);
  }
  return titles;
}

// Stable, readable item order within a package: by platform, primary before
// variants, then by resolved language.
function sortItems(items: ProjectContentEntry[]): ProjectContentEntry[] {
  return [...items].sort((a, b) => {
    if (a.platform !== b.platform) return a.platform.localeCompare(b.platform);
    if (a.isLanguageVariant !== b.isLanguageVariant) {
      return a.isLanguageVariant ? 1 : -1;
    }
    return a.language.localeCompare(b.language);
  });
}

export async function listProjectReviewGroups(
  projectId: string,
): Promise<ReviewRunGroup[]> {
  const [entries, runs] = await Promise.all([
    listProjectContentByStatus(projectId, PENDING_STATUSES),
    listReviewRunsForProject(projectId),
  ]);

  const packageTitleById = await loadPackageTitles(projectId, entries);
  const runIds = new Set(runs.map((run) => run.id));

  // Bucket entries: run id → package id → items[] (insertion order preserved).
  // Items whose run id is null OR not in the fetched run list fall into noRun.
  const byRun = new Map<string, Map<string | null, ProjectContentEntry[]>>();
  const noRun = new Map<string | null, ProjectContentEntry[]>();

  for (const entry of entries) {
    const runId = entry.productionRunId;
    const usesRun = runId !== null && runIds.has(runId);

    let packageMap: Map<string | null, ProjectContentEntry[]>;
    if (usesRun) {
      packageMap = byRun.get(runId) ?? new Map();
      byRun.set(runId, packageMap);
    } else {
      packageMap = noRun;
    }

    const list = packageMap.get(entry.packageId) ?? [];
    list.push(entry);
    packageMap.set(entry.packageId, list);
  }

  function toPackageGroups(
    packageMap: Map<string | null, ProjectContentEntry[]>,
  ): ReviewPackageGroup[] {
    return Array.from(packageMap.entries()).map(([packageId, items]) => ({
      packageId,
      title:
        (packageId ? packageTitleById.get(packageId) : null) ??
        NO_PACKAGE_TITLE,
      items: sortItems(items),
    }));
  }

  const groups: ReviewRunGroup[] = [];

  // One group per run (runs order preserved). Runs with no pending items still
  // render their header so the run overview + Export JSON stays reachable.
  for (const run of runs) {
    const packageMap = byRun.get(run.id);
    groups.push({
      run,
      packages: packageMap ? toPackageGroups(packageMap) : [],
    });
  }

  // Trailing bucket for items with no/unknown production run.
  if (noRun.size > 0) {
    groups.push({ run: null, packages: toPackageGroups(noRun) });
  }

  return groups;
}
