export type WebsiteImageCandidateKind = "favicon" | "og_image" | "img";

export interface WebsiteImageCandidate {
  kind: WebsiteImageCandidateKind;
  url: string;
  alt?: string | null;
}

function resolveUrl(baseUrl: string, raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith("data:")) return null;
  try {
    return new URL(trimmed, baseUrl).toString();
  } catch {
    return null;
  }
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

function extractImgTags(html: string): { src: string; alt: string | null }[] {
  const out: { src: string; alt: string | null }[] = [];
  const tags = html.matchAll(/<img\b[^>]*>/gi);
  for (const tag of tags) {
    const srcMatch = tag[0].match(/\bsrc=["']([^"']+)["']/i);
    if (!srcMatch?.[1]) continue;
    const altMatch = tag[0].match(/\balt=["']([^"']*)["']/i);
    out.push({ src: srcMatch[1], alt: altMatch?.[1] ?? null });
  }
  return out;
}

const TRACKING_HINTS = [
  "pixel",
  "tracking",
  "analytics",
  "spacer",
  "1x1",
  "transparent.gif",
];

function isLikelyTracking(url: string): boolean {
  const lower = url.toLowerCase();
  return TRACKING_HINTS.some((h) => lower.includes(h));
}

// Pure HTML parse — collects favicon, og:image and <img> candidates (absolute URLs).
export function extractWebsiteImageCandidates(
  html: string,
  pageUrl: string,
): WebsiteImageCandidate[] {
  const seen = new Set<string>();
  const result: WebsiteImageCandidate[] = [];

  const push = (kind: WebsiteImageCandidateKind, raw: string, alt?: string | null) => {
    const absolute = resolveUrl(pageUrl, raw);
    if (!absolute || seen.has(absolute) || isLikelyTracking(absolute)) return;
    seen.add(absolute);
    result.push({ kind, url: absolute, alt: alt ?? null });
  };

  const og = extractMetaContent(html, "og:image");
  if (og) push("og_image", og);

  const icon = extractLinkIcon(html);
  if (icon) push("favicon", icon);

  for (const img of extractImgTags(html)) {
    push("img", img.src, img.alt);
  }

  return result;
}

// Prefer og:image and favicon, then a small set of content images.
export function rankWebsiteImageCandidates(
  candidates: WebsiteImageCandidate[],
  max: number,
): WebsiteImageCandidate[] {
  const priority: Record<WebsiteImageCandidateKind, number> = {
    og_image: 0,
    favicon: 1,
    img: 2,
  };
  const sorted = [...candidates].sort(
    (a, b) => priority[a.kind] - priority[b.kind],
  );
  return sorted.slice(0, max);
}
