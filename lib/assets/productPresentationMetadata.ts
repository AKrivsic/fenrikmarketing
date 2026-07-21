/**
 * Product-presentation eligibility fields stored in assets.metadata (jsonb).
 * Library-time only — stamped at ingest / upload / analysis. Package generation reads.
 *
 * See reports/product-presentation-architecture-analysis-and-plan.md §3.4
 */
import type { AssetQualityTier } from "@/lib/assets/assetIngestMetadata";
import type { AssetAnalysisStatus } from "@/lib/assets/analysis";
import { readProductRole, type ProductRole } from "@/lib/assets/productRole";
import type { VideoSuitability } from "@/lib/assets/smartUsageMetadata";
import type { Json } from "@/lib/supabase/types";

export const PROVENANCE_CLASSES = [
  "scraped",
  "client_upload",
  "component_capture",
  "unknown",
] as const;

export type ProvenanceClass = (typeof PROVENANCE_CLASSES)[number];

export const AUTHENTICITY_FOR_PRODUCT_CLAIM = [
  "eligible",
  "weak",
  "ineligible",
] as const;

export type AuthenticityForProductClaim =
  (typeof AUTHENTICITY_FOR_PRODUCT_CLAIM)[number];

/**
 * Mirrors PPD presentation classes (string-stable). Kept here so the assets
 * layer does not import the product-presentation package (avoids cycles).
 */
export const RECOMMENDED_PRESENTATION_CLASSES = [
  "AUTHENTIC_PRODUCT_SURFACE",
  "AUTHENTIC_PRODUCT_IN_CONTEXT",
  "PRODUCT_OUTCOME_WORLD",
  "ABSTRACT_MECHANISM",
  "BRAND_SIGNAL_ONLY",
  "NO_PRODUCT_APPEARANCE",
] as const;

export type RecommendedPresentationClass =
  (typeof RECOMMENDED_PRESENTATION_CLASSES)[number];

export interface ProductPresentationAssetMetadata {
  provenance_class: ProvenanceClass;
  authenticity_for_product_claim: AuthenticityForProductClaim;
  recommended_presentation_classes: RecommendedPresentationClass[];
}

const PRODUCT_SURFACE_ROLES: readonly ProductRole[] = [
  "product_ui",
  "dashboard",
  "homepage_screenshot",
  "pricing_screenshot",
  "hero_image",
];

function metadataRecord(
  metadata: Json | Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  return metadata as Record<string, unknown>;
}

function isProvenanceClass(value: unknown): value is ProvenanceClass {
  return (
    typeof value === "string" &&
    (PROVENANCE_CLASSES as readonly string[]).includes(value)
  );
}

function isAuthenticity(value: unknown): value is AuthenticityForProductClaim {
  return (
    typeof value === "string" &&
    (AUTHENTICITY_FOR_PRODUCT_CLAIM as readonly string[]).includes(value)
  );
}

function isRecommendedClass(
  value: unknown,
): value is RecommendedPresentationClass {
  return (
    typeof value === "string" &&
    (RECOMMENDED_PRESENTATION_CLASSES as readonly string[]).includes(value)
  );
}

/**
 * Map existing metadata.source / tags onto provenance_class.
 * website_ingestion → scraped; upload/manual → client_upload; component_capture as-is.
 */
export function resolveProvenanceClass(args: {
  metadata?: Json | Record<string, unknown> | null;
  tags?: readonly string[] | null;
  sourceHint?: string | null;
}): ProvenanceClass {
  const record = metadataRecord(args.metadata);
  const source =
    (typeof args.sourceHint === "string" && args.sourceHint.trim()) ||
    (typeof record?.source === "string" ? record.source : null);
  const tags = args.tags ?? [];

  if (source === "website_ingestion" || tags.includes("website_ingestion")) {
    return "scraped";
  }
  if (source === "component_capture" || tags.includes("component_capture")) {
    return "component_capture";
  }
  if (source === "upload" || source === "manual") {
    return "client_upload";
  }
  // Legacy uploads often omit source; treat as client upload when not scrape/capture.
  if (
    !source &&
    !tags.includes("website_ingestion") &&
    !tags.includes("component_capture")
  ) {
    return "client_upload";
  }
  if (isProvenanceClass(source)) return source;
  return "unknown";
}

function isProductSurfaceRole(role: ProductRole | null): boolean {
  return role !== null && (PRODUCT_SURFACE_ROLES as readonly string[]).includes(role);
}

function readQuality(
  record: Record<string, unknown> | null,
  fallback?: AssetQualityTier | null,
): AssetQualityTier | null {
  const value = record?.asset_quality;
  if (value === "high" || value === "medium" || value === "low") return value;
  return fallback ?? null;
}

function readAnalysisStatus(
  record: Record<string, unknown> | null,
): AssetAnalysisStatus | null {
  const status = record?.analysis_status;
  if (status === "completed" || status === "skipped" || status === "failed") {
    return status;
  }
  return null;
}

function readVideoSuitability(
  record: Record<string, unknown> | null,
  fallback?: VideoSuitability | null,
): VideoSuitability | null {
  const value = record?.video_suitability;
  if (typeof value === "string") return value as VideoSuitability;
  return fallback ?? null;
}

/**
 * Conservative authenticity policy for AUTHENTIC product appearance claims.
 * Never treats logo / decorative / branding-only as eligible product proof.
 * Scraped and component_capture are never auto-eligible.
 */
export function computeAuthenticityForProductClaim(args: {
  provenanceClass: ProvenanceClass;
  productRole: ProductRole | null;
  assetQuality: AssetQualityTier | null;
  videoSuitability?: VideoSuitability | null;
  analysisStatus?: AssetAnalysisStatus | null;
}): AuthenticityForProductClaim {
  const {
    provenanceClass,
    productRole,
    assetQuality,
    videoSuitability,
    analysisStatus,
  } = args;

  if (productRole === "logo" || productRole === "decorative") {
    return "ineligible";
  }
  if (
    videoSuitability === "background_only" ||
    videoSuitability === "branding_prop"
  ) {
    return "ineligible";
  }

  const surface = isProductSurfaceRole(productRole);

  if (provenanceClass === "client_upload") {
    if (!surface) {
      return assetQuality === "high" ? "weak" : "ineligible";
    }
    if (assetQuality === "high") return "eligible";
    if (assetQuality === "medium") return "weak";
    if (assetQuality === "low") return "ineligible";
    // Missing quality on client upload surface → weak (not auto eligible).
    return "weak";
  }

  if (provenanceClass === "scraped") {
    if (!surface || assetQuality === "low") return "ineligible";
    if (analysisStatus === "failed") return "ineligible";
    // High/medium scraped product surface → weak, never auto eligible.
    if (assetQuality === "high" || assetQuality === "medium") return "weak";
    return "ineligible";
  }

  if (provenanceClass === "component_capture") {
    // Capture alone is not proof of authentic product claim eligibility.
    if (
      surface &&
      assetQuality === "high" &&
      analysisStatus === "completed"
    ) {
      return "weak";
    }
    return "ineligible";
  }

  // unknown provenance
  if (surface && assetQuality === "high") return "weak";
  return "ineligible";
}

export function computeRecommendedPresentationClasses(args: {
  authenticity: AuthenticityForProductClaim;
  productRole: ProductRole | null;
}): RecommendedPresentationClass[] {
  const { authenticity, productRole } = args;

  if (productRole === "logo") {
    return ["BRAND_SIGNAL_ONLY"];
  }

  if (authenticity === "eligible") {
    return ["AUTHENTIC_PRODUCT_SURFACE", "AUTHENTIC_PRODUCT_IN_CONTEXT"];
  }

  if (authenticity === "weak") {
    // Honest non-product presentation — never AUTHENTIC claim from weak alone.
    return ["PRODUCT_OUTCOME_WORLD", "ABSTRACT_MECHANISM"];
  }

  // ineligible
  if (productRole === "decorative") {
    return ["NO_PRODUCT_APPEARANCE", "PRODUCT_OUTCOME_WORLD"];
  }
  return [
    "PRODUCT_OUTCOME_WORLD",
    "ABSTRACT_MECHANISM",
    "NO_PRODUCT_APPEARANCE",
  ];
}

export function computeProductPresentationAssetMetadata(args: {
  metadata?: Json | Record<string, unknown> | null;
  tags?: readonly string[] | null;
  sourceHint?: string | null;
  productRole?: ProductRole | null;
  assetQuality?: AssetQualityTier | null;
  videoSuitability?: VideoSuitability | null;
  analysisStatus?: AssetAnalysisStatus | null;
}): ProductPresentationAssetMetadata {
  const record = metadataRecord(args.metadata);
  const provenance_class = resolveProvenanceClass({
    metadata: args.metadata,
    tags: args.tags,
    sourceHint: args.sourceHint,
  });
  const productRole =
    args.productRole !== undefined
      ? args.productRole
      : readProductRole(args.metadata as Json);
  const assetQuality = readQuality(record, args.assetQuality ?? null);
  const authenticity_for_product_claim = computeAuthenticityForProductClaim({
    provenanceClass: provenance_class,
    productRole,
    assetQuality,
    videoSuitability: readVideoSuitability(record, args.videoSuitability ?? null),
    analysisStatus: args.analysisStatus ?? readAnalysisStatus(record),
  });
  const recommended_presentation_classes =
    computeRecommendedPresentationClasses({
      authenticity: authenticity_for_product_claim,
      productRole,
    });

  return {
    provenance_class,
    authenticity_for_product_claim,
    recommended_presentation_classes,
  };
}

/**
 * Prefer stored fields; if any are missing, derive from legacy signals.
 * Safe for old assets that predate Wave 2.
 */
export function readProductPresentationAssetMetadata(
  metadata: Json | Record<string, unknown> | null | undefined,
  extras?: {
    tags?: readonly string[] | null;
  },
): ProductPresentationAssetMetadata {
  const record = metadataRecord(metadata);
  const computed = computeProductPresentationAssetMetadata({
    metadata,
    tags: extras?.tags,
  });

  if (!record) return computed;

  const storedProvenance = isProvenanceClass(record.provenance_class)
    ? record.provenance_class
    : null;
  const storedAuth = isAuthenticity(record.authenticity_for_product_claim)
    ? record.authenticity_for_product_claim
    : null;
  const storedRecommended = Array.isArray(record.recommended_presentation_classes)
    ? record.recommended_presentation_classes.filter(isRecommendedClass)
    : null;

  // Partial store: fill gaps from conservative compute.
  return {
    provenance_class: storedProvenance ?? computed.provenance_class,
    authenticity_for_product_claim:
      storedAuth ?? computed.authenticity_for_product_claim,
    recommended_presentation_classes:
      storedRecommended && storedRecommended.length > 0
        ? storedRecommended
        : computed.recommended_presentation_classes,
  };
}

/** Merge computed PPD eligibility fields into metadata jsonb. */
export function mergeProductPresentationAssetMetadata(
  existing: Json | Record<string, unknown> | null | undefined,
  fields: ProductPresentationAssetMetadata,
): Record<string, unknown> {
  const base = metadataRecord(existing) ?? {};
  return {
    ...base,
    provenance_class: fields.provenance_class,
    authenticity_for_product_claim: fields.authenticity_for_product_claim,
    recommended_presentation_classes: fields.recommended_presentation_classes,
  };
}

/**
 * Recompute and stamp presentation eligibility onto metadata (library-time).
 */
export function stampProductPresentationAssetMetadata(
  existing: Json | Record<string, unknown> | null | undefined,
  extras?: {
    tags?: readonly string[] | null;
    sourceHint?: string | null;
  },
): Record<string, unknown> {
  const fields = computeProductPresentationAssetMetadata({
    metadata: existing,
    tags: extras?.tags,
    sourceHint: extras?.sourceHint,
  });
  return mergeProductPresentationAssetMetadata(existing, fields);
}

export function authenticityRank(
  value: AuthenticityForProductClaim | null | undefined,
): number {
  if (value === "eligible") return 0;
  if (value === "weak") return 1;
  return 2;
}

export function isEligibleForAuthenticProductClaim(
  value: AuthenticityForProductClaim | null | undefined,
): boolean {
  return value === "eligible";
}
