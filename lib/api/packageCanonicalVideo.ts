import type { JobStatus, LanguageCode } from "@/lib/supabase/types";
import type { ProjectContentEntry } from "@/lib/api/project-content-admin";

export interface CanonicalPackageVideo {
  language: LanguageCode;
  isPrimary: boolean;
  jobId: string;
  status: JobStatus | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  subtitleUrl: string | null;
  debug: ProjectContentEntry["videoDebug"];
  failureHeadline: string | null;
  failureDetail: string | null;
  hasChecklistScene: boolean;
  presentationAnalyzerWarningCount: number;
}

// Lower score wins when picking the canonical package video for a language.
// TikTok is preferred at each status tier (product invariant).
export function canonicalVideoPriority(
  platform: string,
  status: JobStatus | null,
): number {
  if (!status) return 100;
  const tiktok = platform === "tiktok";
  switch (status) {
    case "completed":
      return tiktok ? 1 : 2;
    case "processing":
      return tiktok ? 3 : 4;
    case "queued":
      return tiktok ? 5 : 6;
    case "failed":
      return tiktok ? 7 : 8;
    default:
      return 100;
  }
}

export function pickCanonicalVideoForLanguage(
  items: ProjectContentEntry[],
  language: LanguageCode,
): ProjectContentEntry | null {
  const candidates = items.filter(
    (item) => item.language === language && item.videoJobId,
  );
  if (candidates.length === 0) return null;

  let best = candidates[0]!;
  let bestScore = canonicalVideoPriority(best.platform, best.videoStatus);
  for (let i = 1; i < candidates.length; i++) {
    const item = candidates[i]!;
    const score = canonicalVideoPriority(item.platform, item.videoStatus);
    if (score < bestScore) {
      best = item;
      bestScore = score;
    }
  }
  return best;
}

export function buildPackageVideosFromEntries(
  items: ProjectContentEntry[],
): CanonicalPackageVideo[] {
  const languages = new Set<LanguageCode>();
  for (const item of items) {
    if (item.videoJobId) languages.add(item.language);
  }

  const videos: CanonicalPackageVideo[] = [];
  for (const language of languages) {
    const item = pickCanonicalVideoForLanguage(items, language);
    if (!item?.videoJobId) continue;
    videos.push({
      language: item.language,
      isPrimary: !item.isLanguageVariant,
      jobId: item.videoJobId,
      status: item.videoStatus,
      videoUrl: item.videoUrl,
      thumbnailUrl: item.thumbnailUrl,
      subtitleUrl: item.subtitleUrl,
      debug: item.videoDebug,
      failureHeadline: item.videoFailureHeadline,
      failureDetail: item.videoFailureDetail,
      hasChecklistScene: item.videoHasChecklistScene,
      presentationAnalyzerWarningCount: item.videoPresentationWarningCount,
    });
  }

  return videos.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
}
