import type { ContentItem, PlatformType } from "@/lib/supabase/types";
import {
  buildPublishReadyText,
  buildPublishTitle,
} from "@/lib/publishing/publishReadyText";

export interface ClientDeliveryPublishSection {
  label: string;
  text: string;
  /** YouTube (and similar): copied separately from the description. */
  publishTitle?: string;
  defaultOpen?: boolean;
}

const PLATFORM_ORDER: PlatformType[] = [
  "tiktok",
  "instagram",
  "youtube",
  "facebook",
  "linkedin",
  "x",
];

const PLATFORM_LABEL: Partial<Record<PlatformType, string>> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  x: "X",
};

function sectionFromContentItem(
  item: ContentItem,
  label: string,
): ClientDeliveryPublishSection {
  const publishInput = {
    platform: item.platform,
    title: item.title,
    caption: item.caption,
    cta: item.cta,
    hashtags: item.hashtags ?? [],
  };
  const publishTitle = buildPublishTitle(publishInput);
  return {
    label,
    text: buildPublishReadyText(publishInput),
    ...(publishTitle ? { publishTitle } : {}),
  };
}

/** Same publish-ready composition as /projects/[id]/review (ProjectContentCard). */
export function buildClientPublishSectionsFromContentItems(
  items: ContentItem[],
): ClientDeliveryPublishSection[] {
  const primary = items.filter((i) => i.language == null);
  const sections: ClientDeliveryPublishSection[] = [];
  const xItems = primary.filter((i) => i.platform === "x");

  for (const platform of PLATFORM_ORDER) {
    if (platform === "x") {
      xItems.forEach((item, index) => {
        const label =
          xItems.length > 1
            ? `X #${index + 1}${item.title ? `: ${item.title}` : ""}`
            : PLATFORM_LABEL.x ?? "X";
        sections.push(sectionFromContentItem(item, label));
      });
      continue;
    }

    const item = primary.find((i) => i.platform === platform);
    if (!item) continue;
    sections.push(
      sectionFromContentItem(item, PLATFORM_LABEL[platform] ?? platform),
    );
  }

  if (sections.length > 0 && sections[0]) {
    sections[0] = { ...sections[0], defaultOpen: true };
  }

  return sections;
}
