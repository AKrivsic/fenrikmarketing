import { inferProductRoleFromSignals } from "@/lib/assets/inferProductRoleFromSignals";
import {
  ingestPriorityRank,
  qualityTierRank,
  type AssetQualityTier,
} from "@/lib/assets/assetIngestMetadata";
import type { WebsiteImageCandidate } from "@/lib/knowledge/extractWebsiteImageCandidates";

export const MAX_WEBSITE_INGEST_ASSETS = 8;

export interface ScoredWebsiteImageCandidate {
  candidate: WebsiteImageCandidate;
  productRole: ReturnType<typeof inferProductRoleFromSignals>["role"];
  ingestPriority: number;
  qualityTier: AssetQualityTier;
  score: number;
}

function baseScore(
  candidate: WebsiteImageCandidate,
  ingestPriority: number,
  hasRealLogo: boolean,
): number {
  const kindBoost =
    candidate.kind === "og_image"
      ? 30
      : candidate.kind === "favicon"
        ? hasRealLogo
          ? 0
          : 20
        : 0;
  const alt = (candidate.alt ?? "").length;
  return (10 - Math.min(ingestPriority, 10)) * 100 + kindBoost + Math.min(alt, 40);
}

function hasRealLogoInPool(
  scored: ScoredWebsiteImageCandidate[],
): boolean {
  return scored.some((item) => {
    if (item.candidate.kind === "favicon") return false;
    if (item.productRole === "logo") return true;
    const hay =
      `${item.candidate.url} ${item.candidate.alt ?? ""}`.toLowerCase();
    return hay.includes("logo") && !hay.includes("favicon");
  });
}

function effectiveIngestPriority(
  item: ScoredWebsiteImageCandidate,
  hasRealLogo: boolean,
): number {
  if (hasRealLogo && item.candidate.kind === "favicon") return 100;
  if (item.productRole === "decorative") return Math.max(item.ingestPriority, 90);
  return item.ingestPriority;
}

export function scoreWebsiteImageCandidate(
  candidate: WebsiteImageCandidate,
  hasRealLogo = false,
): ScoredWebsiteImageCandidate {
  const inferred = inferProductRoleFromSignals({
    kind: candidate.kind,
    url: candidate.url,
    alt: candidate.alt,
  });
  const ingestPriority = ingestPriorityRank({
    kind: candidate.kind,
    productRole: inferred.role,
  });
  const qualityTier: AssetQualityTier =
    ingestPriority <= 2 ? "medium" : ingestPriority >= 7 ? "low" : "medium";

  return {
    candidate,
    productRole: inferred.role,
    ingestPriority,
    qualityTier,
    score: baseScore(candidate, ingestPriority, hasRealLogo),
  };
}

// Orders candidates and keeps at most `max` for download attempts, preferring one
// strong candidate per product role when possible.
export function prioritizeWebsiteImageCandidates(
  candidates: WebsiteImageCandidate[],
  max: number = MAX_WEBSITE_INGEST_ASSETS,
): WebsiteImageCandidate[] {
  const provisional = candidates.map((c) => scoreWebsiteImageCandidate(c, false));
  const hasRealLogo = hasRealLogoInPool(provisional);
  const scored = candidates.map((c) => scoreWebsiteImageCandidate(c, hasRealLogo));
  scored.sort((a, b) => {
    const pa = effectiveIngestPriority(a, hasRealLogo);
    const pb = effectiveIngestPriority(b, hasRealLogo);
    if (pa !== pb) return pa - pb;
    if (a.score !== b.score) return b.score - a.score;
    return qualityTierRank(a.qualityTier) - qualityTierRank(b.qualityTier);
  });

  const picked: ScoredWebsiteImageCandidate[] = [];
  const rolesSeen = new Set<string>();
  const pickedUrls = new Set<string>();

  for (const item of scored) {
    const roleKey = item.productRole ?? item.candidate.kind;
    if (rolesSeen.has(roleKey) && picked.length < max) {
      if (item.candidate.kind !== "img" || item.ingestPriority <= 2) {
        continue;
      }
    }
    picked.push(item);
    pickedUrls.add(item.candidate.url);
    rolesSeen.add(roleKey);
    if (picked.length >= max) break;
  }

  if (picked.length < max) {
    for (const item of scored) {
      if (pickedUrls.has(item.candidate.url)) continue;
      picked.push(item);
      pickedUrls.add(item.candidate.url);
      if (picked.length >= max) break;
    }
  }

  return picked.map((p) => p.candidate);
}

// Backwards-compatible export used by existing check script.
export function rankWebsiteImageCandidates(
  candidates: WebsiteImageCandidate[],
  max: number,
): WebsiteImageCandidate[] {
  return prioritizeWebsiteImageCandidates(candidates, max);
}
