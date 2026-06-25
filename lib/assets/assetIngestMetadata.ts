import type { ProductRole } from "@/lib/assets/productRole";
import type { WebsiteImageCandidateKind } from "@/lib/knowledge/extractWebsiteImageCandidates";

export type AssetQualityTier = "high" | "medium" | "low";

// Ingest priority rank (1 = highest). Mirrors website scrape ordering.
export function ingestPriorityRank(args: {
  kind: WebsiteImageCandidateKind;
  productRole: ProductRole | null;
}): number {
  const { kind, productRole } = args;
  if (productRole === "logo" || kind === "favicon") return 1;
  if (kind === "og_image" || productRole === "hero_image") return 2;
  if (productRole === "product_ui") return 3;
  if (productRole === "dashboard") return 4;
  if (productRole === "homepage_screenshot") return 5;
  if (
    productRole === "pricing_screenshot" ||
    productRole === "certificate" ||
    productRole === "testimonial"
  ) {
    return 6;
  }
  if (productRole === "decorative") return 7;
  return 8;
}

export function computeAssetQualityTier(args: {
  productRole: ProductRole | null;
  ingestPriority: number;
  byteLength: number;
  width: number | null;
  height: number | null;
  visionConfidence?: "high" | "medium" | "low" | null;
  source: "website_ingestion" | "upload";
}): AssetQualityTier {
  const pixels =
    args.width && args.height ? args.width * args.height : null;
  const productish =
    args.productRole &&
    args.productRole !== "decorative" &&
    args.productRole !== "other";

  if (
    productish &&
    args.ingestPriority <= 4 &&
    ((pixels !== null && pixels >= 120_000) || args.byteLength >= 40_000)
  ) {
    return "high";
  }

  if (
    args.ingestPriority <= 6 &&
    ((pixels !== null && pixels >= 40_000) || args.byteLength >= 12_000)
  ) {
    return "medium";
  }

  if (args.ingestPriority >= 7 || args.byteLength < 4_000) {
    return "low";
  }

  if (args.visionConfidence === "high" && productish) return "medium";
  return "low";
}

export function qualityTierRank(tier: AssetQualityTier): number {
  if (tier === "high") return 0;
  if (tier === "medium") return 1;
  return 2;
}
