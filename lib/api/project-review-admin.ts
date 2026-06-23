import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { loadWeeklyStrategyIdForWeek } from "@/lib/ai/workflows/weeklyStrategyGate";
import {
  currentWeekStartUtc,
  formatCurrentWeekLabel,
} from "@/lib/datetime/week";
import {
  listProjectContentByStatus,
  type ProjectContentEntry,
} from "@/lib/api/project-content-admin";
import {
  listReviewRunsForProject,
  type ReviewRunCard,
} from "@/lib/api/review-runs-admin";
import {
  isVideoPlatform,
  resolveTargetLanguages,
  rollupTranslationTextJob,
  type TranslationTextJobState,
} from "@/lib/ai/workflows/languageVariantsHelpers";
import type { RenderDebug } from "@/lib/api/content-shared";
import type {
  ApprovalStatus,
  JobStatus,
  LanguageCode,
  PackageStatus,
  PlatformType,
  TranslationJobStatus,
} from "@/lib/supabase/types";

// One translation_jobs row reduced to what the progress rollup needs.
interface PackageTranslationJob {
  language: LanguageCode;
  status: TranslationJobStatus;
}

// Review UX V2 — single-package workspace.
//
// Composes the project review tab as Production Run → Package, and INSIDE each
// package splits the work into three sections that always stay together:
//   A) Primary (EN)      — the primary-language content + its video
//   B) Translations      — video-platform variants grouped by language
//   C) Published         — everything already marked published (read-only)
//
// Pure composition over EXISTING read layers (review-runs-admin +
// project-content-admin). No new tables, workflows or AI. Loads the WHOLE
// package (all reviewable statuses) for a BOUNDED set of recent runs/packages
// so the page stays within Vercel time limits (see REVIEW_* limits below).

/** Latest production runs shown on the project review tab (newest first). */
export const REVIEW_RUN_LIMIT = 5;

/** Max distinct packages whose full item/video payload is loaded per request. */
export const REVIEW_PACKAGE_LIMIT = 21;

/** When there are no production runs, load this many recent packages instead. */
export const REVIEW_FALLBACK_PACKAGES = 21;

const REVIEW_TIMING =
  process.env.REVIEW_TIMING === "1" || process.env.NODE_ENV === "development";

// Every reviewable status is loaded together so a package is shown whole.
// Rejected and scheduled items are intentionally excluded from the workspace.
const REVIEW_STATUSES: ApprovalStatus[] = [
  "draft",
  "in_review",
  "approved",
  "published",
];

// Weekly Prepare (Actions / n8n week_start) packages — reviewable package headers.
const WEEKLY_STRATEGY_PACKAGE_STATUSES: PackageStatus[] = [
  "draft",
  "ready",
  "approved",
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
  failureHeadline: string | null;
  failureDetail: string | null;
}

// One language block inside the Translations section. Holds the localized video
// (if any) plus its video-platform content items (non-published).
export interface LanguageTranslationBlock {
  language: LanguageCode;
  video: PackageVideo | null;
  items: ProjectContentEntry[];
}

// Per-language translation video state, collapsed from the variant's video job
// status. "missing" means no variant video job exists for the language yet.
export type TranslationVideoState =
  | "completed"
  | "rendering"
  | "failed"
  | "missing";

// One target language's translation progress: how many of the package's
// expected video platforms have a localized text item, plus the localized
// video render state. Drives the per-language "DE: Text 3/3, Video completed"
// lines and the package translation badge.
export interface LanguageTranslationProgress {
  language: LanguageCode;
  // Expected video platforms that already have a localized content item.
  textDone: number;
  // Expected video platforms (approved primary video-platform items).
  textExpected: number;
  video: TranslationVideoState;
  // Async localization (translation_jobs) state for this language:
  //   "active" — a unit is still pending/processing (Claude running, no variant
  //              content_item yet) → the package shows "running" and polls.
  //   "failed" — the last localization attempt failed (re-clickable). Completed
  //              languages stay usable; this never hides them.
  //   null     — no outstanding async unit (idle or done).
  textJob: TranslationTextJobState;
}

// Overall translation rollup for the whole package.
//   none        — nothing to translate (no target languages / no expected
//                 video platforms approved yet) → no badge.
//   not_started — translatable, but no variant / queued unit exists yet.
//   running     — at least one target-language localization unit is still
//                 pending/processing OR a target-language video is rendering.
//   partial     — some languages done, none running, none failed.
//   complete    — every target language is text + video complete.
//   failed      — a localization unit or video failed and nothing is running.
export type TranslationOverallState =
  | "none"
  | "not_started"
  | "running"
  | "partial"
  | "complete"
  | "failed";

export interface TranslationProgress {
  overall: TranslationOverallState;
  // Target languages that are fully complete (text + video).
  completeCount: number;
  // Total target languages (enabled_languages minus primary).
  targetCount: number;
  languages: LanguageTranslationProgress[];
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
  // Per-language translation progress (text + video) plus the package rollup.
  translationProgress: TranslationProgress;
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
  // Header when run is null (e.g. current weekly strategy from Actions).
  sectionLabel?: string | null;
}

import { buildPackageVideosFromEntries } from "@/lib/api/packageCanonicalVideo";

// One canonical video per language (TikTok preferred when multiple platform jobs exist).
function buildPackageVideos(items: ProjectContentEntry[]): PackageVideo[] {
  return buildPackageVideosFromEntries(items);
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

// Collapses a variant video job status into a translation video state.
function videoStateFromJob(status: JobStatus | null): TranslationVideoState {
  if (status === "completed") return "completed";
  if (status === "queued" || status === "processing") return "rendering";
  if (status === "failed") return "failed";
  return "missing";
}

// Computes per-language translation progress + the package rollup, using only
// existing data (content_items.language/status, the resolved package videos and
// the project's target languages). Product rule: ONLY video platforms (TikTok /
// Instagram / YouTube / Facebook) count — LinkedIn / X / Google Business are
// ignored entirely (text-only). No new queue, scheduler or schema.
function buildTranslationProgress(
  items: ProjectContentEntry[],
  videos: PackageVideo[],
  targetLanguages: LanguageCode[],
  translationJobs: PackageTranslationJob[],
): TranslationProgress {
  // Expected platforms = approved (or already published) primary video-platform
  // items. These are the platforms a complete translation must cover.
  const expectedPlatforms = new Set<PlatformType>();
  for (const item of items) {
    if (item.isLanguageVariant) continue;
    if (!isVideoPlatform(item.platform)) continue;
    if (item.status !== "approved" && item.status !== "published") continue;
    expectedPlatforms.add(item.platform);
  }
  const textExpected = expectedPlatforms.size;

  // Localized video-platform items present per target language (only platforms
  // that are actually expected count toward the text ratio).
  const variantPlatformsByLanguage = new Map<LanguageCode, Set<PlatformType>>();
  for (const item of items) {
    if (!item.isLanguageVariant) continue;
    if (!isVideoPlatform(item.platform)) continue;
    if (!expectedPlatforms.has(item.platform)) continue;
    const set = variantPlatformsByLanguage.get(item.language) ?? new Set();
    set.add(item.platform);
    variantPlatformsByLanguage.set(item.language, set);
  }

  // Variant (non-primary) video render status per language.
  const videoStatusByLanguage = new Map<LanguageCode, JobStatus | null>();
  for (const video of videos) {
    if (video.isPrimary) continue;
    videoStatusByLanguage.set(video.language, video.status);
  }

  // Async localization (translation_jobs) state per language, rolled up across
  // the language's units (one per video platform). This makes a freshly-clicked
  // package show "running" BEFORE any variant content_item exists yet.
  const jobStatusesByLanguage = new Map<LanguageCode, TranslationJobStatus[]>();
  for (const job of translationJobs) {
    const list = jobStatusesByLanguage.get(job.language) ?? [];
    list.push(job.status);
    jobStatusesByLanguage.set(job.language, list);
  }

  const languages: LanguageTranslationProgress[] = targetLanguages.map(
    (language) => ({
      language,
      textDone: variantPlatformsByLanguage.get(language)?.size ?? 0,
      textExpected,
      video: videoStateFromJob(
        videoStatusByLanguage.has(language)
          ? (videoStatusByLanguage.get(language) ?? null)
          : null,
      ),
      textJob: rollupTranslationTextJob(
        jobStatusesByLanguage.get(language) ?? [],
      ),
    }),
  );

  const targetCount = targetLanguages.length;

  const isLanguageComplete = (l: LanguageTranslationProgress): boolean =>
    l.textExpected > 0 && l.textDone >= l.textExpected && l.video === "completed";
  const completeCount = languages.filter(isLanguageComplete).length;

  let overall: TranslationOverallState;
  if (targetCount === 0 || textExpected === 0) {
    overall = "none";
  } else {
    const anyStarted = languages.some(
      (l) => l.textDone > 0 || l.video !== "missing" || l.textJob !== null,
    );
    // Running while a video renders OR an async localization unit is still
    // pending/processing (so the review page keeps polling until both finish).
    const isRunning = languages.some(
      (l) => l.video === "rendering" || l.textJob === "active",
    );
    const anyFailed = languages.some(
      (l) => l.video === "failed" || l.textJob === "failed",
    );
    if (!anyStarted) overall = "not_started";
    else if (completeCount === targetCount) overall = "complete";
    else if (isRunning) overall = "running";
    else if (anyFailed) overall = "failed";
    else overall = "partial";
  }

  return { overall, completeCount, targetCount, languages };
}

function buildSummary(
  items: ProjectContentEntry[],
  videos: PackageVideo[],
  targetLanguages: LanguageCode[],
  translationJobs: PackageTranslationJob[],
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
    translationProgress: buildTranslationProgress(
      items,
      videos,
      targetLanguages,
      translationJobs,
    ),
  };
}

function buildPackageGroup(
  packageId: string | null,
  title: string,
  rawItems: ProjectContentEntry[],
  targetLanguages: LanguageCode[],
  translationJobs: PackageTranslationJob[],
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
    summary: buildSummary(items, videos, targetLanguages, translationJobs),
  };
}

function logReviewTiming(label: string, startedAt: number, detail?: string) {
  if (!REVIEW_TIMING) return;
  const ms = Math.round(performance.now() - startedAt);
  console.info(
    `[review] ${label}: ${ms}ms${detail ? ` (${detail})` : ""}`,
  );
}

// Resolves package ids to load for the review tab: packages tied to the latest
// N production runs (newest runs first), capped at REVIEW_PACKAGE_LIMIT.
async function resolvePackageIdsForReviewRuns(
  projectId: string,
  runIds: string[],
): Promise<string[]> {
  if (runIds.length === 0) return [];

  const supabase = createSupabaseAdminClient();
  const orFilter = runIds
    .map((id) => `generation_metadata->>production_run_id.eq.${id}`)
    .join(",");

  const { data, error } = await supabase
    .from("content_items")
    .select("package_id, created_at")
    .eq("project_id", projectId)
    .not("package_id", "is", null)
    .or(orFilter);

  if (error) throw error;

  // Newest activity per package wins; preserve run order preference via created_at.
  const latestByPackage = new Map<string, string>();
  for (const row of (data ?? []) as {
    package_id: string | null;
    created_at: string;
  }[]) {
    if (!row.package_id) continue;
    const prev = latestByPackage.get(row.package_id);
    if (!prev || row.created_at > prev) {
      latestByPackage.set(row.package_id, row.created_at);
    }
  }

  return Array.from(latestByPackage.entries())
    .sort((a, b) => b[1].localeCompare(a[1]))
    .slice(0, REVIEW_PACKAGE_LIMIT)
    .map(([packageId]) => packageId);
}

// Review run bucketing uses generation_metadata.production_run_id on primaries;
// language variants omit it but point at their source primary via
// source_content_item_id — inherit that item's run so the package stays whole.
function resolveReviewProductionRunId(
  entry: ProjectContentEntry,
  entryById: Map<string, ProjectContentEntry>,
  visited: Set<string> = new Set(),
): string | null {
  if (entry.productionRunId) return entry.productionRunId;
  const sourceId = entry.sourceContentItemId;
  if (!sourceId || visited.has(entry.id)) return null;
  visited.add(entry.id);
  const source = entryById.get(sourceId);
  if (!source) return null;
  return resolveReviewProductionRunId(source, entryById, visited);
}

// Resolves the project's translation target languages (enabled_languages minus
// the primary language). Used to drive the per-package translation progress —
// the set of languages a package is expected to be translated into.
async function loadProjectTargetLanguages(
  projectId: string,
): Promise<LanguageCode[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("projects")
    .select("language, enabled_languages")
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return [];

  const row = data as {
    language: LanguageCode;
    enabled_languages: LanguageCode[] | null;
  };
  return resolveTargetLanguages(row.language, row.enabled_languages ?? []);
}

// Loads the async translation-jobs queue rows for the given packages, grouped
// by package_id. Used to surface "running / failed" localization state on the
// review tab BEFORE any variant content_item exists (no new poll/scheduler —
// the existing 7s router.refresh re-reads this). Empty map when no packages.
async function loadTranslationJobsByPackage(
  projectId: string,
  packageIds: string[],
): Promise<Map<string, PackageTranslationJob[]>> {
  const byPackage = new Map<string, PackageTranslationJob[]>();
  if (packageIds.length === 0) return byPackage;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("translation_jobs")
    .select("package_id, language, status")
    .eq("project_id", projectId)
    .in("package_id", packageIds);
  if (error) throw error;

  for (const row of (data ?? []) as {
    package_id: string;
    language: LanguageCode;
    status: TranslationJobStatus;
  }[]) {
    const list = byPackage.get(row.package_id) ?? [];
    list.push({ language: row.language, status: row.status });
    byPackage.set(row.package_id, list);
  }
  return byPackage;
}

// UTC Monday week model — matches Actions triggers and n8n week_start payloads.
function currentWeekStartUtcForReview(): string {
  return currentWeekStartUtc();
}

interface WeeklyStrategyPackageRef {
  id: string;
  createdAt: string;
}

// Packages generated for the weekly strategy (Actions flow: no production_run_id).
async function resolveCurrentWeeklyStrategyPackages(
  projectId: string,
  weekStart: string,
): Promise<WeeklyStrategyPackageRef[]> {
  const supabase = createSupabaseAdminClient();
  const strategyId = await loadWeeklyStrategyIdForWeek(
    supabase,
    projectId,
    weekStart,
  );
  if (!strategyId) return [];

  const { data: itemRows, error: itemErr } = await supabase
    .from("content_strategy_items")
    .select("id")
    .eq("project_id", projectId)
    .eq("strategy_id", strategyId);
  if (itemErr) throw itemErr;
  const strategyItemIds = (itemRows ?? []).map((row) => row.id as string);

  let query = supabase
    .from("content_packages")
    .select("id, created_at")
    .eq("project_id", projectId)
    .in("status", WEEKLY_STRATEGY_PACKAGE_STATUSES)
    .order("created_at", { ascending: true });

  if (strategyItemIds.length > 0) {
    query = query.or(
      `weekly_strategy_id.eq.${strategyId},strategy_item_id.in.(${strategyItemIds.join(",")})`,
    );
  } else {
    query = query.eq("weekly_strategy_id", strategyId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as { id: string; created_at: string }[]).map((row) => ({
    id: row.id,
    createdAt: row.created_at,
  }));
}

// Fallback when the project has no production runs: recent packages only.
async function resolveFallbackPackageIds(
  projectId: string,
): Promise<string[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("content_packages")
    .select("id")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(REVIEW_FALLBACK_PACKAGES);
  if (error) throw error;
  return (data ?? []).map((row) => (row as { id: string }).id);
}

export async function listProjectReviewGroups(
  projectId: string,
): Promise<ReviewRunGroup[]> {
  const startedAt = performance.now();
  const weekStart = currentWeekStartUtcForReview();

  const runs = await listReviewRunsForProject(projectId, {
    limit: REVIEW_RUN_LIMIT,
  });
  logReviewTiming("runs", startedAt, `${runs.length} runs`);

  const runIds = runs.map((run) => run.id);
  const [runScopedPackageIds, weeklyPackages] = await Promise.all([
    runIds.length > 0
      ? resolvePackageIdsForReviewRuns(projectId, runIds)
      : resolveFallbackPackageIds(projectId),
    resolveCurrentWeeklyStrategyPackages(projectId, weekStart),
  ]);

  const runScopedSet = new Set(runScopedPackageIds);
  const weeklyOnlyIds = weeklyPackages
    .map((pkg) => pkg.id)
    .filter((id) => !runScopedSet.has(id));
  const weeklyOnlySet = new Set(weeklyOnlyIds);
  const weeklyOnlyOrder = weeklyOnlyIds;

  const packageIds = Array.from(
    new Set([...runScopedPackageIds, ...weeklyOnlyIds]),
  );

  logReviewTiming("packageIds", startedAt, `${packageIds.length} packages`);

  const entries =
    packageIds.length > 0
      ? await listProjectContentByStatus(projectId, REVIEW_STATUSES, {
          packageIds,
        })
      : [];

  logReviewTiming("entries", startedAt, `${entries.length} items`);

  const [packageTitleById, targetLanguages, translationJobsByPackage] =
    await Promise.all([
      loadPackageTitles(projectId, entries),
      loadProjectTargetLanguages(projectId),
      loadTranslationJobsByPackage(projectId, packageIds),
    ]);
  const runIdsSet = new Set(runIds);
  const entryById = new Map(entries.map((entry) => [entry.id, entry]));

  // Bucket entries: run id → package id → items[] (insertion order preserved).
  // Items whose run id is null OR not in the fetched run list fall into noRun.
  const byRun = new Map<string, Map<string | null, ProjectContentEntry[]>>();
  const weeklyStrategy = new Map<string | null, ProjectContentEntry[]>();
  const noRun = new Map<string | null, ProjectContentEntry[]>();

  for (const entry of entries) {
    const runId = resolveReviewProductionRunId(entry, entryById);
    const usesRun = runId !== null && runIdsSet.has(runId);

    let packageMap: Map<string | null, ProjectContentEntry[]>;
    if (usesRun) {
      packageMap = byRun.get(runId) ?? new Map();
      byRun.set(runId, packageMap);
    } else if (
      entry.packageId !== null &&
      weeklyOnlySet.has(entry.packageId)
    ) {
      packageMap = weeklyStrategy;
    } else {
      packageMap = noRun;
    }

    const list = packageMap.get(entry.packageId) ?? [];
    list.push(entry);
    packageMap.set(entry.packageId, list);
  }

  function toPackageGroups(
    packageMap: Map<string | null, ProjectContentEntry[]>,
    packageOrder?: string[],
  ): ReviewPackageGroup[] {
    const groups = Array.from(packageMap.entries()).map(([packageId, items]) =>
      buildPackageGroup(
        packageId,
        (packageId ? packageTitleById.get(packageId) : null) ??
          NO_PACKAGE_TITLE,
        items,
        targetLanguages,
        (packageId ? translationJobsByPackage.get(packageId) : null) ?? [],
      ),
    );
    if (!packageOrder || packageOrder.length === 0) return groups;
    const orderIndex = new Map(packageOrder.map((id, index) => [id, index]));
    return groups.sort((a, b) => {
      const ai = a.packageId ? (orderIndex.get(a.packageId) ?? 9999) : 9999;
      const bi = b.packageId ? (orderIndex.get(b.packageId) ?? 9999) : 9999;
      return ai - bi;
    });
  }

  const groups: ReviewRunGroup[] = [];

  if (weeklyStrategy.size > 0) {
    groups.push({
      run: null,
      sectionLabel: formatCurrentWeekLabel(weekStart),
      packages: toPackageGroups(weeklyStrategy, weeklyOnlyOrder),
    });
  }

  // One group per scoped run (newest first). Runs with no items in the loaded
  // package set still render their header (Export JSON stays reachable).
  for (const run of runs) {
    const packageMap = byRun.get(run.id);
    groups.push({
      run,
      packages: packageMap ? toPackageGroups(packageMap) : [],
    });
  }

  // Trailing bucket for loaded items with no/unknown production run (e.g.
  // language variants without production_run_id on metadata).
  if (noRun.size > 0) {
    groups.push({ run: null, packages: toPackageGroups(noRun) });
  }

  logReviewTiming("listProjectReviewGroups total", startedAt);

  return groups;
}
