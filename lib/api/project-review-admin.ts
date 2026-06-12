import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  listProjectContentByStatus,
  type ProjectContentEntry,
} from "@/lib/api/project-content-admin";
import {
  listReviewRunsForProject,
  type ReviewRunCard,
} from "@/lib/api/review-runs-admin";
import type { RenderDebug } from "@/lib/api/content-shared";
import type {
  ApprovalStatus,
  JobStatus,
  LanguageCode,
} from "@/lib/supabase/types";

// Composes the project review tab as Production Run → Package → Content item.
// Pure composition over EXISTING read layers: the run cards come from
// review-runs-admin, the actionable content entries from project-content-admin.
// Grouping is item-driven by generation_metadata.production_run_id + package_id.
// No new tables, workflows or AI.

// Content shown on the review tab is the pending work: draft + in_review.
const PENDING_STATUSES: ApprovalStatus[] = ["draft", "in_review"];
// The "Approved" review view shows approved items (ready to copy → publish) in
// the same Run → Package grouping so the user keeps run context while marking
// items published. Published items are intentionally excluded from both views.
export const APPROVED_REVIEW_STATUSES: ApprovalStatus[] = ["approved"];
const NO_PACKAGE_TITLE = "Bez balíčku";

// One package video, resolved per language. Today only the package's primary
// language is populated (MVP: one video per package); the per-language shape is
// the seam that lets the UI grow into CS / EN / DE video tabs later without a
// data-layer rewrite.
export interface PackageVideo {
  language: LanguageCode;
  isPrimary: boolean;
  jobId: string | null;
  status: JobStatus | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  subtitleUrl: string | null;
  debug: RenderDebug | null;
}

export interface ReviewPackageGroup {
  // null only for items that somehow carry no package_id.
  packageId: string | null;
  title: string;
  // True when this package qualifies for "Generate language variants" (any of
  // its primary items is eligible). Surfaced on the package header so the action
  // can never be hidden by the per-run platform/language/status filter.
  canGenerateVariants: boolean;
  // Package-level video(s), one per resolved language. Rendered above the
  // platform outputs and intentionally NOT subject to the run filter.
  videos: PackageVideo[];
  items: ProjectContentEntry[];
}

// Collects the package's video(s) keyed by resolved language. The video job is
// linked to a single content item per language (the video-platform / primary
// item for the primary language, the variant's video item for each variant
// language), so the first item per language that carries a job wins. Items are
// pre-sorted (primary before variants), so primaries naturally lead.
function buildPackageVideos(items: ProjectContentEntry[]): PackageVideo[] {
  const byLanguage = new Map<LanguageCode, PackageVideo>();
  for (const item of items) {
    if (!item.videoJobId) continue;
    if (byLanguage.has(item.language)) continue;
    byLanguage.set(item.language, {
      language: item.language,
      isPrimary: !item.isLanguageVariant,
      jobId: item.videoJobId,
      status: item.videoStatus,
      videoUrl: item.videoUrl,
      thumbnailUrl: item.thumbnailUrl,
      subtitleUrl: item.subtitleUrl,
      debug: item.videoDebug,
    });
  }
  return Array.from(byLanguage.values()).sort(
    (a, b) => Number(b.isPrimary) - Number(a.isPrimary),
  );
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
  statuses: ApprovalStatus[] = PENDING_STATUSES,
): Promise<ReviewRunGroup[]> {
  const [entries, runs] = await Promise.all([
    listProjectContentByStatus(projectId, statuses),
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
    return Array.from(packageMap.entries()).map(([packageId, items]) => {
      const sorted = sortItems(items);
      return {
        packageId,
        title:
          (packageId ? packageTitleById.get(packageId) : null) ??
          NO_PACKAGE_TITLE,
        canGenerateVariants: sorted.some((item) => item.canGenerateVariants),
        videos: buildPackageVideos(sorted),
        items: sorted,
      };
    });
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
