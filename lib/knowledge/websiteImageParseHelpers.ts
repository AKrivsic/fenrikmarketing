// Pure HTML helpers for website image candidate extraction (no I/O).

export function resolveUrl(baseUrl: string, raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith("data:")) return null;
  try {
    return new URL(trimmed, baseUrl).toString();
  } catch {
    return null;
  }
}

export function attrValue(tag: string, name: string): string | null {
  const re = new RegExp(`\\b${name}=["']([^"']+)["']`, "i");
  const m = tag.match(re);
  return m?.[1] ?? null;
}

export function pickLargestFromSrcset(
  srcset: string,
  pageUrl: string,
): string | null {
  const parts = srcset
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  let bestRaw: string | null = null;
  let bestScore = -1;

  for (const part of parts) {
    const tokens = part.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) continue;
    const raw = tokens[0];
    const descriptor = (tokens[1] ?? "").toLowerCase();
    let score = 1;
    if (descriptor.endsWith("w")) {
      score = Number.parseInt(descriptor, 10) || 1;
    } else if (descriptor.endsWith("x")) {
      score = Math.round((Number.parseFloat(descriptor) || 1) * 1000);
    }
    if (score > bestScore) {
      bestScore = score;
      bestRaw = raw;
    }
  }

  return bestRaw ? resolveUrl(pageUrl, bestRaw) : null;
}

// When `src` is present and non-data, returns that URL (unchanged legacy behavior).
// Otherwise tries lazy attributes, then srcset / data-srcset.
export function resolveImgTagUrl(tag: string, pageUrl: string): string | null {
  const src = attrValue(tag, "src");
  if (src && src.trim() && !src.trim().startsWith("data:")) {
    return resolveUrl(pageUrl, src);
  }

  for (const lazyAttr of ["data-src", "data-lazy-src", "data-original"]) {
    const lazy = attrValue(tag, lazyAttr);
    if (lazy) {
      const absolute = resolveUrl(pageUrl, lazy);
      if (absolute) return absolute;
    }
  }

  const srcset = attrValue(tag, "data-srcset") ?? attrValue(tag, "srcset");
  if (srcset) {
    return pickLargestFromSrcset(srcset, pageUrl);
  }

  return null;
}

export function extractPictureCandidates(
  html: string,
  pageUrl: string,
): { url: string; alt: string | null }[] {
  const out: { url: string; alt: string | null }[] = [];
  const blocks = html.matchAll(/<picture\b[^>]*>[\s\S]*?<\/picture>/gi);
  for (const block of blocks) {
    const content = block[0];
    let bestUrl: string | null = null;
    let bestScore = -1;

    for (const source of content.matchAll(/<source\b[^>]*>/gi)) {
      const srcset = attrValue(source[0], "srcset");
      if (!srcset) continue;
      const parts = srcset.split(",").map((p) => p.trim()).filter(Boolean);
      for (const part of parts) {
        const tokens = part.split(/\s+/).filter(Boolean);
        if (tokens.length === 0) continue;
        const descriptor = (tokens[1] ?? "").toLowerCase();
        let score = 1;
        if (descriptor.endsWith("w")) {
          score = Number.parseInt(descriptor, 10) || 1;
        } else if (descriptor.endsWith("x")) {
          score = Math.round((Number.parseFloat(descriptor) || 1) * 1000);
        }
        if (score > bestScore) {
          bestScore = score;
          bestUrl = resolveUrl(pageUrl, tokens[0]);
        }
      }
    }

    const imgTag = content.match(/<img\b[^>]*>/i)?.[0];
    const alt = imgTag ? attrValue(imgTag, "alt") : null;
    const imgUrl = imgTag ? resolveImgTagUrl(imgTag, pageUrl) : null;
    const chosen = imgUrl ?? bestUrl;
    if (chosen) out.push({ url: chosen, alt });
  }
  return out;
}

export function isSvgUrl(url: string): boolean {
  try {
    return new URL(url).pathname.toLowerCase().endsWith(".svg");
  } catch {
    return url.toLowerCase().includes(".svg");
  }
}
