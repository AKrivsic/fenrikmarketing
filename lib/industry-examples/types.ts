/**
 * Static industry example pages for outbound sales (/examples/{slug}).
 * Add a new industry by creating a data file and a thin app/examples/{slug}/page.tsx.
 */

export type IndustryExamplePlatform =
  | "instagram"
  | "tiktok"
  | "youtube"
  | "facebook"
  | "linkedin"
  | "x";

export type IndustryExampleDelivery =
  | "video_caption"
  | "video_meta"
  | "text_only"
  | "text_image";

export interface IndustryExampleYoutubeOutput {
  title: string;
  description: string;
}

export interface IndustryExamplePackagePlatforms {
  instagram: string;
  tiktok: string;
  youtube: IndustryExampleYoutubeOutput;
  facebook: string;
  linkedin: string;
  /** One or more ready-to-publish X posts. */
  x: string[];
}

export interface IndustryExamplePackage {
  id: string;
  /** Full title shown in the active package panel. */
  title: string;
  /** Short label for the package selector. */
  selectorLabel: string;
  /** One-line topic / context under the title. */
  topic: string;
  /**
   * Production project that owns the final video render in `video-renders`.
   * Required when serving via `/api/public/example-video`.
   */
  projectId?: string;
  /**
   * Final completed video_jobs id (scene-editor re-render when applicable).
   * Must be allowlisted via static industry-example data to be publicly served.
   */
  videoJobId?: string;
  /**
   * Public same-origin video URL (typically `/api/public/example-video?job=…`).
   * Null shows a placeholder.
   */
  videoUrl: string | null;
  /** Optional poster image for the video. */
  videoPosterUrl?: string | null;
  /**
   * Optional shared Facebook + LinkedIn 1:1 social image URL.
   * Omit when the example package predates the social-image feature.
   */
  socialImageUrl?: string | null;
  platforms: IndustryExamplePackagePlatforms;
}

export interface IndustryExampleData {
  slug: string;
  industryName: string;
  eyebrow: string;
  headline: string;
  description: string;
  disclaimer: string;
  heroSupportLines: string[];
  packages: IndustryExamplePackage[];
  metadata: {
    title: string;
    description: string;
  };
}

export const INDUSTRY_PLATFORM_META: Record<
  IndustryExamplePlatform,
  { label: string; delivery: IndustryExampleDelivery; deliveryNote: string }
> = {
  instagram: {
    label: "Instagram",
    delivery: "video_caption",
    deliveryNote: "Video + caption",
  },
  tiktok: {
    label: "TikTok",
    delivery: "video_caption",
    deliveryNote: "Video + caption",
  },
  youtube: {
    label: "YouTube Shorts",
    delivery: "video_meta",
    deliveryNote: "Video + title & description",
  },
  facebook: {
    label: "Facebook",
    delivery: "text_image",
    deliveryNote: "Text + image",
  },
  linkedin: {
    label: "LinkedIn",
    delivery: "text_image",
    deliveryNote: "Text + image",
  },
  x: {
    label: "X",
    delivery: "text_only",
    deliveryNote: "Text only",
  },
};

export const INDUSTRY_PLATFORM_ORDER: IndustryExamplePlatform[] = [
  "instagram",
  "tiktok",
  "youtube",
  "facebook",
  "linkedin",
  "x",
];
