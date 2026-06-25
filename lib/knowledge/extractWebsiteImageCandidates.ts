import {
  attrValue,
  extractPictureCandidates,
  resolveImgTagUrl,
  resolveUrl,
} from "@/lib/knowledge/websiteImageParseHelpers";

export type WebsiteImageCandidateKind = "favicon" | "og_image" | "img";

export interface WebsiteImageCandidate {
  kind: WebsiteImageCandidateKind;
  url: string;
  alt?: string | null;
}

function extractMetaContent(html: string, property: string): string | null {
  const re = new RegExp(
    `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const m = html.match(re);
  if (m?.[1]) return m[1];
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`,
    "i",
  );
  const m2 = html.match(re2);
  return m2?.[1] ?? null;
}

function extractLinkIcon(html: string): string | null {
  const icons = html.matchAll(
    /<link[^>]+rel=["']([^"']*icon[^"']*)["'][^>]*>/gi,
  );
  for (const match of icons) {
    const tag = match[0];
    const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
    if (hrefMatch?.[1]) return hrefMatch[1];
  }
  return null;
}

function extractImgTags(
  html: string,
  pageUrl: string,
): { src: string; alt: string | null }[] {
  const out: { src: string; alt: string | null }[] = [];
  const tags = html.matchAll(/<img\b[^>]*>/gi);
  for (const tag of tags) {
    const absolute = resolveImgTagUrl(tag[0], pageUrl);
    if (!absolute) continue;
    const alt = attrValue(tag[0], "alt");
    out.push({ src: absolute, alt: alt ?? null });
  }
  return out;
}

export function extractWebsiteImageCandidates(
  html: string,
  pageUrl: string,
): WebsiteImageCandidate[] {
  const seen = new Set<string>();
  const result: WebsiteImageCandidate[] = [];

  const push = (
    kind: WebsiteImageCandidateKind,
    raw: string,
    alt?: string | null,
  ) => {
    const absolute =
      raw.startsWith("http://") || raw.startsWith("https://")
        ? raw
        : resolveUrl(pageUrl, raw);
    if (!absolute || seen.has(absolute)) return;
    seen.add(absolute);
    result.push({ kind, url: absolute, alt: alt ?? null });
  };

  const og = extractMetaContent(html, "og:image");
  if (og) push("og_image", og);

  const icon = extractLinkIcon(html);
  if (icon) push("favicon", icon);

  for (const pic of extractPictureCandidates(html, pageUrl)) {
    push("img", pic.url, pic.alt);
  }

  for (const img of extractImgTags(html, pageUrl)) {
    push("img", img.src, img.alt);
  }

  return result;
}
