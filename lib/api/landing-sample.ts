import { readVideoOutput } from "@/lib/api/content-shared";
import { STORAGE_BUCKETS, buildVideoRenderPath } from "@/lib/api/storage";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ContentItem } from "@/lib/supabase/types";

const PREVIEW_TTL_SECONDS = 3600;

const SAMPLE_ITEM_STATUSES = new Set(["approved", "published", "scheduled"]);

export interface LandingSamplePreview {
  videoUrl: string | null;
  tikTokCaption: string;
  instagramCaption: string;
  facebookPost: string;
  linkedinPost: string;
  hashtags: string[];
  fromDatabase: boolean;
}

function statusRank(status: string): number {
  if (status === "published") return 3;
  if (status === "approved") return 2;
  if (status === "scheduled") return 1;
  return 0;
}

function isPrimaryItem(item: ContentItem): boolean {
  return item.language === null;
}

function captionText(item: ContentItem): string {
  const parts = [item.caption, item.body].filter(
    (part) => typeof part === "string" && part.trim().length > 0,
  ) as string[];
  return parts.join("\n\n").trim();
}

function pickPlatformItem(
  items: ContentItem[],
  platform: string,
): ContentItem | null {
  const candidates = items.filter(
    (item) =>
      isPrimaryItem(item) &&
      item.platform === platform &&
      SAMPLE_ITEM_STATUSES.has(item.status),
  );
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => statusRank(b.status) - statusRank(a.status));
  return candidates[0] ?? null;
}

function collectHashtags(items: ContentItem[]): string[] {
  const tags = new Set<string>();
  for (const item of items) {
    if (!isPrimaryItem(item)) continue;
    if (!SAMPLE_ITEM_STATUSES.has(item.status)) continue;
    for (const tag of item.hashtags ?? []) {
      const trimmed = tag.trim();
      if (trimmed) tags.add(trimmed);
    }
  }
  return [...tags].slice(0, 12);
}

function scorePackage(items: ContentItem[]): number {
  const platforms = new Set(
    items
      .filter(
        (item) =>
          isPrimaryItem(item) && SAMPLE_ITEM_STATUSES.has(item.status),
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

async function signVideoUrl(
  projectId: string,
  videoJobId: string,
  storedMp4: string | null,
): Promise<string | null> {
  try {
    const supabase = createSupabaseAdminClient();
    const storagePath = buildVideoRenderPath(
      projectId,
      videoJobId,
      "output.mp4",
    );
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.videoRenders)
      .createSignedUrl(storagePath, PREVIEW_TTL_SECONDS);
    if (!error && data?.signedUrl) return data.signedUrl;
  } catch {
    // Fall through when signing fails (e.g. missing env at build).
  }
  return storedMp4;
}

export async function getLandingSamplePreview(): Promise<LandingSamplePreview> {
  const fallback: LandingSamplePreview = {
    videoUrl: null,
    tikTokCaption:
      "Your TikTok caption lands here — short, scroll-stopping, and ready to post.",
    instagramCaption:
      "Your Instagram caption with a clear hook and a line that invites saves or replies.",
    facebookPost:
      "Your Facebook post written for the feed: context, value, and a simple next step.",
    linkedinPost:
      "Your LinkedIn post in a professional tone — insight first, soft CTA at the end.",
    hashtags: ["#yourbrand", "#contentpackage", "#readytopost"],
    fromDatabase: false,
  };

  try {
    const supabase = createSupabaseAdminClient();

    const { data: jobRows, error: jobsError } = await supabase
      .from("video_jobs")
      .select("id, project_id, content_item_id, output, status, created_at")
      .eq("status", "completed")
      .not("content_item_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(100);

    if (jobsError || !jobRows?.length) return fallback;

    const itemIds = [
      ...new Set(
        jobRows
          .map((row) => (row as { content_item_id: string | null }).content_item_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    if (itemIds.length === 0) return fallback;

    const { data: itemRows, error: itemsError } = await supabase
      .from("content_items")
      .select("id, package_id, platform, status, language")
      .in("id", itemIds);
    if (itemsError || !itemRows?.length) return fallback;

    const itemById = new Map(
      itemRows.map((row) => [row.id as string, row as ContentItem]),
    );

    const packageScores = new Map<
      string,
      { projectId: string; score: number; videoJobId: string; mp4: string | null }
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
          mp4: out.mp4Url,
        });
      }
    }

    const best = [...packageScores.entries()].sort(
      (a, b) => b[1].score - a[1].score,
    )[0];
    if (!best) return fallback;

    const [packageId, meta] = best;
    const { data: fullItems, error: fullError } = await supabase
      .from("content_items")
      .select("*")
      .eq("package_id", packageId)
      .is("language", null);
    if (fullError || !fullItems?.length) return fallback;

    const items = fullItems as ContentItem[];
    const tiktok = pickPlatformItem(items, "tiktok");
    const instagram = pickPlatformItem(items, "instagram");
    const linkedin = pickPlatformItem(items, "linkedin");
    const facebook = pickPlatformItem(items, "facebook");
    const anchor = tiktok ?? instagram ?? linkedin ?? items[0];

    const facebookText =
      (facebook ? captionText(facebook) : "") ||
      (linkedin ? captionText(linkedin) : "") ||
      (instagram ? captionText(instagram) : "") ||
      captionText(anchor);

    const videoUrl = await signVideoUrl(
      meta.projectId,
      meta.videoJobId,
      meta.mp4,
    );

    return {
      videoUrl,
      tikTokCaption: tiktok ? captionText(tiktok) : captionText(anchor),
      instagramCaption: instagram
        ? captionText(instagram)
        : captionText(anchor),
      linkedinPost: linkedin ? captionText(linkedin) : captionText(anchor),
      facebookPost: facebookText,
      hashtags: collectHashtags(items),
      fromDatabase: true,
    };
  } catch {
    return fallback;
  }
}
