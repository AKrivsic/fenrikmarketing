import { createHash } from "node:crypto";
import type { WebsiteImageCandidate } from "@/lib/knowledge/extractWebsiteImageCandidates";

export function normalizeAssetUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString().toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

export function filenameKeyFromUrl(url: string): string {
  try {
    const name = new URL(url).pathname.split("/").pop() ?? "";
    return decodeURIComponent(name).toLowerCase();
  } catch {
    return "";
  }
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export type DedupeDropReason =
  | "duplicate_url"
  | "duplicate_filename"
  | "favicon_vs_logo"
  | "og_vs_img"
  | "duplicate_hash"
  | "existing_project_asset";

// Collapse HTML-level duplicates before download.
export function dedupeWebsiteImageCandidates(
  candidates: WebsiteImageCandidate[],
): { kept: WebsiteImageCandidate[]; duplicates: number } {
  const kept: WebsiteImageCandidate[] = [];
  const byUrl = new Map<string, WebsiteImageCandidate>();
  const byFilename = new Map<string, WebsiteImageCandidate>();
  let duplicates = 0;

  const prefer = (
    current: WebsiteImageCandidate,
    existing: WebsiteImageCandidate,
  ): WebsiteImageCandidate => {
    const rank = (c: WebsiteImageCandidate) => {
      if (c.kind === "og_image") return 0;
      if (c.kind === "favicon") return 1;
      return 2;
    };
    const altLogo =
      (c: WebsiteImageCandidate) =>
      `${c.alt ?? ""} ${c.url}`.toLowerCase().includes("logo");
    if (altLogo(current) && !altLogo(existing)) return current;
    if (altLogo(existing) && !altLogo(current)) return existing;
    return rank(current) <= rank(existing) ? current : existing;
  };

  for (const candidate of candidates) {
    const urlKey = normalizeAssetUrl(candidate.url);
    const fileKey = filenameKeyFromUrl(candidate.url);

    const urlDup = byUrl.get(urlKey);
    if (urlDup) {
      const chosen = prefer(candidate, urlDup);
      if (chosen !== urlDup) {
        const idx = kept.indexOf(urlDup);
        if (idx >= 0) kept[idx] = chosen;
        byUrl.set(urlKey, chosen);
        if (fileKey) byFilename.set(fileKey, chosen);
      }
      duplicates += 1;
      continue;
    }

    if (candidate.kind === "img") {
      const ogSame = kept.find(
        (c) => c.kind === "og_image" && normalizeAssetUrl(c.url) === urlKey,
      );
      if (ogSame) {
        duplicates += 1;
        continue;
      }
    }

    if (fileKey) {
      const fileDup = byFilename.get(fileKey);
      if (fileDup && normalizeAssetUrl(fileDup.url) !== urlKey) {
        duplicates += 1;
        continue;
      }
    }

    if (candidate.kind === "favicon") {
      const logoImg = kept.find(
        (c) =>
          c.kind === "img" &&
          filenameKeyFromUrl(c.url).includes("logo") &&
          normalizeAssetUrl(c.url) !== urlKey,
      );
      if (logoImg && fileKey.includes("favicon")) {
        duplicates += 1;
        continue;
      }
    }

    kept.push(candidate);
    byUrl.set(urlKey, candidate);
    if (fileKey) byFilename.set(fileKey, candidate);
  }

  return { kept, duplicates };
}

export function isDuplicateOfExisting(
  candidate: WebsiteImageCandidate,
  existingUrls: Set<string>,
  hash: string | null,
  seenHashes: Set<string>,
): DedupeDropReason | null {
  if (existingUrls.has(normalizeAssetUrl(candidate.url))) {
    return "existing_project_asset";
  }
  if (hash && seenHashes.has(hash)) return "duplicate_hash";
  return null;
}
