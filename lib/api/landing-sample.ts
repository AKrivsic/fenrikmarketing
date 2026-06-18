import {
  resolveLandingSampleSelection,
  type LandingSampleSelection,
} from "@/lib/api/landing-sample-resolve";
import { STORAGE_BUCKETS, buildVideoRenderPath } from "@/lib/api/storage";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ContentItem } from "@/lib/supabase/types";

const PREVIEW_TTL_SECONDS = 3600;

/** Same-origin stream so browsers can range-fetch the MP4 reliably. */
export const LANDING_SAMPLE_VIDEO_PATH = "/api/public/landing-sample-video";

const SAMPLE_ITEM_STATUSES = new Set(["approved", "published", "scheduled"]);

export interface LandingSamplePreview {
  videoUrl: string | null;
  posterUrl: string | null;
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
      item.language === null &&
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
    if (item.language !== null) continue;
    if (!SAMPLE_ITEM_STATUSES.has(item.status)) continue;
    for (const tag of item.hashtags ?? []) {
      const trimmed = tag.trim();
      if (trimmed) tags.add(trimmed);
    }
  }
  return [...tags].slice(0, 12);
}

async function signPosterUrl(
  projectId: string,
  videoJobId: string,
): Promise<string | null> {
  try {
    const supabase = createSupabaseAdminClient();
    const storagePath = buildVideoRenderPath(
      projectId,
      videoJobId,
      "thumbnail.png",
    );
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.videoRenders)
      .createSignedUrl(storagePath, PREVIEW_TTL_SECONDS);
    if (!error && data?.signedUrl) return data.signedUrl;
  } catch {
    // Optional poster — video still works without it.
  }
  return null;
}

function previewFromSelection(
  selection: LandingSampleSelection,
  posterUrl: string | null,
): LandingSamplePreview {
  const items = selection.items;
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

  return {
    videoUrl: LANDING_SAMPLE_VIDEO_PATH,
    posterUrl,
    tikTokCaption: tiktok ? captionText(tiktok) : captionText(anchor),
    instagramCaption: instagram ? captionText(instagram) : captionText(anchor),
    linkedinPost: linkedin ? captionText(linkedin) : captionText(anchor),
    facebookPost: facebookText,
    hashtags: collectHashtags(items),
    fromDatabase: true,
  };
}

export async function getLandingSamplePreview(): Promise<LandingSamplePreview> {
  const fallback: LandingSamplePreview = {
    videoUrl: null,
    posterUrl: null,
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
    const selection = await resolveLandingSampleSelection();
    if (!selection) return fallback;

    const posterUrl = await signPosterUrl(
      selection.projectId,
      selection.videoJobId,
    );
    return previewFromSelection(selection, posterUrl);
  } catch {
    return fallback;
  }
}
