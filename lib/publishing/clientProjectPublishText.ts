import { buildPublishReadyText } from "@/lib/publishing/publishReadyText";

export interface ClientProjectPublishTexts {
  tikTok: string;
  instagram: string;
  facebook: string;
  linkedin: string;
}

interface ClientProjectPublishSource {
  tikTokCaption: string;
  instagramCaption: string;
  facebookPost: string;
  linkedinPost: string;
  hashtags: string[];
}

/** Paste-ready copy per platform (caption + CTA rules + hashtags), same as project review. */
export function buildClientProjectPublishTexts(
  item: ClientProjectPublishSource,
): ClientProjectPublishTexts {
  const hashtags = item.hashtags ?? [];
  return {
    tikTok: buildPublishReadyText({
      platform: "tiktok",
      title: null,
      caption: item.tikTokCaption,
      cta: null,
      hashtags,
    }),
    instagram: buildPublishReadyText({
      platform: "instagram",
      title: null,
      caption: item.instagramCaption,
      cta: null,
      hashtags,
    }),
    facebook: buildPublishReadyText({
      platform: "facebook",
      title: null,
      caption: item.facebookPost,
      cta: null,
      hashtags,
    }),
    linkedin: buildPublishReadyText({
      platform: "linkedin",
      title: null,
      caption: item.linkedinPost,
      cta: null,
      hashtags,
    }),
  };
}

export const CLIENT_PUBLISH_PLATFORM_LABELS: {
  key: keyof ClientProjectPublishTexts;
  label: string;
}[] = [
  { key: "tikTok", label: "TikTok" },
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "linkedin", label: "LinkedIn" },
];
