import { readVideoOutput } from "@/lib/api/content-shared";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ContentItem } from "@/lib/supabase/types";

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

export async function resolveLandingSampleSelection(): Promise<LandingSampleSelection | null> {
  const supabase = createSupabaseAdminClient();

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
    { projectId: string; score: number; videoJobId: string }
  >();

  for (const raw of jobRows) {
    const job = raw as {
      id: string;
      project_id: string;
      content_item_id: string | null;
      output: unknown;
    };
    if (!job.content_item_id) continue;
    const item = itemById.get(job.content_item_id);
    if (!item?.package_id || item.language !== null) continue;
    if (!SAMPLE_ITEM_STATUSES.has(item.status)) continue;
    if (item.platform !== "tiktok" && item.platform !== "youtube") continue;

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
    if (!prev || score > prev.score) {
      packageScores.set(item.package_id, {
        projectId: job.project_id,
        score,
        videoJobId: job.id,
      });
    }
  }

  const best = [...packageScores.entries()].sort(
    (a, b) => b[1].score - a[1].score,
  )[0];
  if (!best) return null;

  const [packageId, meta] = best;
  const { data: fullItems, error: fullError } = await supabase
    .from("content_items")
    .select("*")
    .eq("package_id", packageId)
    .is("language", null);
  if (fullError || !fullItems?.length) return null;

  return {
    projectId: meta.projectId,
    videoJobId: meta.videoJobId,
    packageId,
    items: fullItems as ContentItem[],
  };
}
