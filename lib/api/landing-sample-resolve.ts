import { unstable_cache } from "next/cache";
import { readVideoOutput } from "@/lib/api/content-shared";
import {
  landingSampleExcludedPackageIds,
  landingSamplePinnedPackageId,
  landingSamplePinnedVideoJobId,
  LANDING_SAMPLE_REVALIDATE_SECONDS,
} from "@/lib/api/landing-sample-config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ContentItem } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

const SAMPLE_ITEM_STATUSES = new Set(["approved", "published", "scheduled"]);

export interface LandingSampleSelection {
  projectId: string;
  videoJobId: string;
  packageId: string;
  items: ContentItem[];
}

function scorePackage(items: ContentItem[]): number {
  const platforms = new Set(
    items
      .filter(
        (item) =>
          item.language === null && SAMPLE_ITEM_STATUSES.has(item.status),
      )
      .map((item) => item.platform),
  );
  let score = platforms.size;
  if (platforms.has("tiktok")) score += 2;
  if (platforms.has("instagram")) score += 1;
  if (platforms.has("linkedin")) score += 1;
  if (platforms.has("facebook")) score += 1;
  return score;
}

async function loadPackageItems(
  supabase: SupabaseClient,
  packageId: string,
): Promise<ContentItem[] | null> {
  const { data: fullItems, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("package_id", packageId)
    .is("language", null);
  if (error || !fullItems?.length) return null;
  return fullItems as ContentItem[];
}

type EligibleVideoItem = ContentItem & { package_id: string };

function isEligibleVideoItem(
  item: ContentItem | undefined,
): item is EligibleVideoItem {
  if (!item?.package_id || item.language !== null) return false;
  if (!SAMPLE_ITEM_STATUSES.has(item.status)) return false;
  return item.platform === "tiktok" || item.platform === "youtube";
}

async function selectionFromJob(
  supabase: SupabaseClient,
  job: {
    id: string;
    project_id: string;
    content_item_id: string | null;
    output: unknown;
    status: string;
  },
): Promise<LandingSampleSelection | null> {
  if (job.status !== "completed" || !job.content_item_id) return null;
  if (!readVideoOutput(job.output as never).mp4Url) return null;

  const { data: itemRow, error: itemError } = await supabase
    .from("content_items")
    .select("id, package_id, platform, status, language")
    .eq("id", job.content_item_id)
    .maybeSingle();
  if (itemError || !isEligibleVideoItem(itemRow as ContentItem | undefined)) {
    return null;
  }
  const item = itemRow as EligibleVideoItem;
  const items = await loadPackageItems(supabase, item.package_id);
  if (!items || scorePackage(items) < 3) return null;

  return {
    projectId: job.project_id,
    videoJobId: job.id,
    packageId: item.package_id,
    items,
  };
}

async function resolvePinnedVideoJob(
  supabase: SupabaseClient,
  videoJobId: string,
): Promise<LandingSampleSelection | null> {
  const { data: job, error } = await supabase
    .from("video_jobs")
    .select("id, project_id, content_item_id, output, status, created_at")
    .eq("id", videoJobId)
    .maybeSingle();
  if (error || !job) return null;
  return selectionFromJob(supabase, job);
}

async function resolvePinnedPackage(
  supabase: SupabaseClient,
  packageId: string,
): Promise<LandingSampleSelection | null> {
  const { data: jobRows, error } = await supabase
    .from("video_jobs")
    .select("id, project_id, content_item_id, output, status, created_at")
    .eq("status", "completed")
    .not("content_item_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !jobRows?.length) return null;

  const { data: packageItems } = await supabase
    .from("content_items")
    .select("id")
    .eq("package_id", packageId)
    .is("language", null);
  const packageItemIds = new Set((packageItems ?? []).map((row) => row.id as string));

  for (const raw of jobRows) {
    const job = raw as {
      id: string;
      project_id: string;
      content_item_id: string | null;
      output: unknown;
      status: string;
    };
    if (!job.content_item_id || !packageItemIds.has(job.content_item_id)) continue;
    const selection = await selectionFromJob(supabase, job);
    if (selection) return selection;
  }
  return null;
}

async function resolveAutomaticSelection(
  supabase: SupabaseClient,
): Promise<LandingSampleSelection | null> {
  const excludedPackages = landingSampleExcludedPackageIds();

  const { data: jobRows, error: jobsError } = await supabase
    .from("video_jobs")
    .select("id, project_id, content_item_id, output, status, created_at")
    .eq("status", "completed")
    .not("content_item_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (jobsError || !jobRows?.length) return null;

  const itemIds = [
    ...new Set(
      jobRows
        .map((row) => (row as { content_item_id: string | null }).content_item_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (itemIds.length === 0) return null;

  const { data: itemRows, error: itemsError } = await supabase
    .from("content_items")
    .select("id, package_id, platform, status, language")
    .in("id", itemIds);
  if (itemsError || !itemRows?.length) return null;

  const itemById = new Map(
    itemRows.map((row) => [row.id as string, row as ContentItem]),
  );

  const packageScores = new Map<
    string,
    {
      projectId: string;
      score: number;
      videoJobId: string;
      jobCreatedAt: string;
    }
  >();

  for (const raw of jobRows) {
    const job = raw as {
      id: string;
      project_id: string;
      content_item_id: string | null;
      output: unknown;
      created_at: string;
    };
    if (!job.content_item_id) continue;
    const item = itemById.get(job.content_item_id);
    if (!isEligibleVideoItem(item)) continue;
    if (excludedPackages.has(item.package_id)) continue;

    const out = readVideoOutput(job.output as never);
    if (!out.mp4Url) continue;

    const { data: pkgItems, error: loadErr } = await supabase
      .from("content_items")
      .select("*")
      .eq("package_id", item.package_id)
      .is("language", null);
    if (loadErr || !pkgItems?.length) continue;

    const items = pkgItems as ContentItem[];
    const score = scorePackage(items);
    if (score < 3) continue;

    const prev = packageScores.get(item.package_id);
    if (
      !prev ||
      score > prev.score ||
      (score === prev.score && job.created_at > prev.jobCreatedAt)
    ) {
      packageScores.set(item.package_id, {
        projectId: job.project_id,
        score,
        videoJobId: job.id,
        jobCreatedAt: job.created_at,
      });
    }
  }

  const best = [...packageScores.entries()].sort((a, b) => {
    const byScore = b[1].score - a[1].score;
    if (byScore !== 0) return byScore;
    return b[1].jobCreatedAt.localeCompare(a[1].jobCreatedAt);
  })[0];
  if (!best) return null;

  const [packageId, meta] = best;
  const items = await loadPackageItems(supabase, packageId);
  if (!items) return null;

  return {
    projectId: meta.projectId,
    videoJobId: meta.videoJobId,
    packageId,
    items,
  };
}

function landingSampleSelectionCacheKey(): string[] {
  return [
    "landing-sample-selection",
    landingSamplePinnedVideoJobId() ?? "",
    landingSamplePinnedPackageId() ?? "",
    process.env.LANDING_SAMPLE_EXCLUDE_PACKAGE_IDS ?? "",
  ];
}

async function resolveLandingSampleSelectionUncached(): Promise<LandingSampleSelection | null> {
  const supabase = createSupabaseAdminClient();

  const pinnedJobId = landingSamplePinnedVideoJobId();
  if (pinnedJobId) {
    return resolvePinnedVideoJob(supabase, pinnedJobId);
  }

  const pinnedPackageId = landingSamplePinnedPackageId();
  if (pinnedPackageId) {
    const pinned = await resolvePinnedPackage(supabase, pinnedPackageId);
    if (pinned) return pinned;
  }

  return resolveAutomaticSelection(supabase);
}

const getCachedLandingSampleSelection = unstable_cache(
  async (): Promise<LandingSampleSelection | null> =>
    resolveLandingSampleSelectionUncached(),
  landingSampleSelectionCacheKey(),
  { revalidate: LANDING_SAMPLE_REVALIDATE_SECONDS },
);

export async function resolveLandingSampleSelection(): Promise<LandingSampleSelection | null> {
  try {
    return await getCachedLandingSampleSelection();
  } catch {
    return resolveLandingSampleSelectionUncached();
  }
}
