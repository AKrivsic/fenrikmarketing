import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  listProjectContentByStatus,
  type ProjectContentEntry,
} from "@/lib/api/project-content-admin";
import {
  listReviewRunsForProject,
  type ReviewRunCard,
} from "@/lib/api/review-runs-admin";
import { isVideoPlatform } from "@/lib/ai/workflows/languageVariantsHelpers";
import type { RenderDebug } from "@/lib/api/content-shared";
import type {
  ApprovalStatus,
  JobStatus,
  LanguageCode,
  PlatformType,
} from "@/lib/supabase/types";

// Review UX V2 — single-package workspace.
//
// Composes the project review tab as Production Run → Package, and INSIDE each
// package splits the work into three sections that always stay together:
//   A) Primary (EN)      — the primary-language content + its video
//   B) Translations      — video-platform variants grouped by language
//   C) Published         — everything already marked published (read-only)
//
// Pure composition over EXISTING read layers (review-runs-admin +
// project-content-admin). No new tables, workflows or AI. Unlike V1 it loads the
// WHOLE package (all reviewable statuses) so the primary, its translations and
// its published items are never scattered across separate status views.

// Every reviewable status is loaded together so a package is shown whole.
// Rejected and scheduled items are intentionally excluded from the workspace.
const REVIEW_STATUSES: ApprovalStatus[] = [
  "draft",
  "in_review",
  "approved",
  "published",
];

const NO_PACKAGE_TITLE = "Bez balíčku";

const PLATFORM_LABEL: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  x: "X",
  google_business: "Google Business",
  blog: "Blog",
  email: "Email",
};

function platformLabel(platform: PlatformType): string {
  return PLATFORM_LABEL[platform] ?? platform;
}

// One package video, resolved per language. Primary language first; variant
// languages follow once they have a rendered (or rendering) video job.
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

// One language block inside the Translations section. Holds the localized video
// (if any) plus its video-platform content items (non-published).
export interface LanguageTranslationBlock {
  language: LanguageCode;
  video: PackageVideo | null;
  items: ProjectContentEntry[];
}

// Compact, badge-only package status summary (no charts). Drives the package
// header at-a-glance state.
export interface PackageStatusSummary {
  // approved + published primary items / total primary items.
  primaryApproved: number;
  primaryTotal: number;
  // Representative status per translated (video-platform) language.
  translations: { language: LanguageCode; status: ApprovalStatus }[];
  // Render status per package video (primary + variants).
  videos: { language: LanguageCode; isPrimary: boolean; status: JobStatus | null }[];
  publishedCount: number;
}

export interface ReviewPackageGroup {
  // null only for items that somehow carry no package_id.
  packageId: string | null;
  title: string;
  // All package videos (primary + variant), one per resolved language. Rendered
  // once in the package video panel so the EN / DE / FR / ES / IT pills always
  // stay attached to the package.
  videos: PackageVideo[];
  // A) Primary-language items that are not yet published.
  primaryItems: ProjectContentEntry[];
  // B) Translations grouped by language (video platforms only, non-published).
  translations: LanguageTranslationBlock[];
  // C) Everything already published (primary + variant), read-only.
  publishedItems: ProjectContentEntry[];
  // True when the package qualifies for "Generate translations" (package-level,
  // video-platform primaries approved, no variants yet).
  canGenerateVariants: boolean;
  // True when the package already has at least one translation (any language).
  hasTranslations: boolean;
  // Human-readable reason the package is NOT yet eligible for translations,
  // shown instead of silently hiding the action. Null when eligible OR already
  // translated.
  translationReason: string | null;
  summary: PackageStatusSummary;
}

export interface ReviewRunGroup {
  // The production run header (existing review-run card), or null for the
  // synthetic bucket holding items with no/unknown production_run_id.
  run: ReviewRunCard | null;
  packages: ReviewPackageGroup[];
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

// Resolves package titles for the packages referenced by the given entries.
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

// Least-advanced status wins, so the summary shows what still needs work. All
// published collapses to "published".
const STATUS_RANK: Record<ApprovalStatus, number> = {
  draft: 0,
  in_review: 1,
  approved: 2,
  scheduled: 3,
  published: 4,
  rejected: 5,
};

function representativeStatus(statuses: ApprovalStatus[]): ApprovalStatus {
  return statuses.reduce(
    (lowest, status) =>
      STATUS_RANK[status] < STATUS_RANK[lowest] ? status : lowest,
    statuses[0],
  );
}

// Explains why a package is not yet eligible for translations (rule: never
// silently hide the action). Returns null when eligibility cannot be explained
// from the items alone (e.g. no target languages configured is handled by the
// caller via canGenerateVariants).
function buildTranslationReason(items: ProjectContentEntry[]): string | null {
  const videoPrimaries = items.filter(
    (item) =>
      !item.isLanguageVariant &&
      isVideoPlatform(item.platform) &&
      item.status !== "rejected",
  );
  if (videoPrimaries.length === 0) {
    return "Tento package nemá video platformy — překlad je pouze pro video.";
  }
  const pending = videoPrimaries.filter(
    (item) => item.status !== "approved" && item.status !== "published",
  );
  if (pending.length > 0) {
    const labels = Array.from(
      new Set(pending.map((item) => platformLabel(item.platform))),
    );
    return `Čeká na schválení: ${labels.join(", ")}.`;
  }
  if (videoPrimaries.some((item) => item.videoStatus !== "completed")) {
    return "Čeká na dokončení renderu videa.";
  }
  return "Projekt nemá nastavené další jazyky pro překlad.";
}

function buildSummary(
  items: ProjectContentEntry[],
  videos: PackageVideo[],
): PackageStatusSummary {
  const primary = items.filter(
    (item) => !item.isLanguageVariant && item.status !== "rejected",
  );
  const primaryApproved = primary.filter(
    (item) => item.status === "approved" || item.status === "published",
  ).length;

  // Representative status per translated (video-platform) language.
  const byLanguage = new Map<LanguageCode, ApprovalStatus[]>();
  for (const item of items) {
    if (!item.isLanguageVariant) continue;
    if (!isVideoPlatform(item.platform)) continue;
    const list = byLanguage.get(item.language) ?? [];
    list.push(item.status);
    byLanguage.set(item.language, list);
  }
  const translations = Array.from(byLanguage.entries())
    .map(([language, statuses]) => ({
      language,
      status: representativeStatus(statuses),
    }))
    .sort((a, b) => a.language.localeCompare(b.language));

  return {
    primaryApproved,
    primaryTotal: primary.length,
    translations,
    videos: videos.map((video) => ({
      language: video.language,
      isPrimary: video.isPrimary,
      status: video.status,
    })),
    publishedCount: items.filter((item) => item.status === "published").length,
  };
}

function buildPackageGroup(
  packageId: string | null,
  title: string,
  rawItems: ProjectContentEntry[],
): ReviewPackageGroup {
  const items = sortItems(rawItems);
  const videos = buildPackageVideos(items);

  const primaryItems = items.filter(
    (item) => !item.isLanguageVariant && item.status !== "published",
  );
  const publishedItems = items.filter((item) => item.status === "published");

  // Translations: video-platform variants only (LinkedIn / X are never shown as
  // translations), non-published, grouped by language.
  const variantItems = items.filter(
    (item) =>
      item.isLanguageVariant &&
      isVideoPlatform(item.platform) &&
      item.status !== "published",
  );
  const variantByLanguage = new Map<LanguageCode, ProjectContentEntry[]>();
  for (const item of variantItems) {
    const list = variantByLanguage.get(item.language) ?? [];
    list.push(item);
    variantByLanguage.set(item.language, list);
  }
  const translations: LanguageTranslationBlock[] = Array.from(
    variantByLanguage.entries(),
  )
    .map(([language, languageItems]) => ({
      language,
      video: videos.find((video) => video.language === language) ?? null,
      items: languageItems,
    }))
    .sort((a, b) => a.language.localeCompare(b.language));

  const hasTranslations = items.some((item) => item.isLanguageVariant);
  const canGenerateVariants = items.some((item) => item.canGenerateVariants);
  const translationReason =
    !canGenerateVariants && !hasTranslations
      ? buildTranslationReason(items)
      : null;

  return {
    packageId,
    title,
    videos,
    primaryItems,
    translations,
    publishedItems,
    canGenerateVariants,
    hasTranslations,
    translationReason,
    summary: buildSummary(items, videos),
  };
}

export async function listProjectReviewGroups(
  projectId: string,
): Promise<ReviewRunGroup[]> {
  const [entries, runs] = await Promise.all([
    listProjectContentByStatus(projectId, REVIEW_STATUSES),
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
    return Array.from(packageMap.entries()).map(([packageId, items]) =>
      buildPackageGroup(
        packageId,
        (packageId ? packageTitleById.get(packageId) : null) ??
          NO_PACKAGE_TITLE,
        items,
      ),
    );
  }

  const groups: ReviewRunGroup[] = [];

  // One group per run (runs order preserved). Runs with no reviewable items
  // still render their header so the run overview + Export JSON stays reachable.
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
