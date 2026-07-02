import type { AssetClass } from "@/lib/ai/guardrails";
import { readAssetAnalysis, type AssetAnalysisStatus } from "@/lib/assets/analysis";
import { resolvePreferredVideoUsageFromMetadata } from "@/lib/assets/preferredVideoUsage";
import { readCaptureViewport } from "@/lib/assets/preferredVideoUsage";
import { readProductRole, type ProductRole } from "@/lib/assets/productRole";
import type { Json } from "@/lib/supabase/types";

export type AssetLibrarySource =
  | "website_ingestion"
  | "component_capture"
  | "manual_upload"
  | "unknown";

export const ASSET_LIBRARY_SOURCE_LABELS: Record<AssetLibrarySource, string> = {
  website_ingestion: "Website ingestion",
  component_capture: "Component capture",
  manual_upload: "Manual upload",
  unknown: "Unknown",
};

function metadataRecord(metadata: Json | null | undefined): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  return metadata as Record<string, unknown>;
}

export function readAssetLibrarySource(
  metadata: Json,
  tags: string[],
): AssetLibrarySource {
  const record = metadataRecord(metadata);
  const metaSource = record?.source;
  if (metaSource === "website_ingestion" || tags.includes("website_ingestion")) {
    return "website_ingestion";
  }
  if (metaSource === "component_capture" || tags.includes("component_capture")) {
    return "component_capture";
  }
  if (metaSource === "upload" || metaSource === "manual") {
    return "manual_upload";
  }
  if (!metaSource && !tags.includes("website_ingestion") && !tags.includes("component_capture")) {
    return "manual_upload";
  }
  return "unknown";
}

export function readAssetDimensions(metadata: Json): {
  width: number | null;
  height: number | null;
  label: string | null;
} {
  const record = metadataRecord(metadata);
  const width = typeof record?.width === "number" ? record.width : null;
  const height = typeof record?.height === "number" ? record.height : null;
  if (width && height) {
    return { width, height, label: `${width} × ${height}` };
  }
  return { width, height, label: null };
}

export interface AssetLibraryPresentation {
  source: AssetLibrarySource;
  sourceLabel: string;
  captureViewport: string | null;
  dimensionsLabel: string | null;
  preferredVideoUsage: string;
  analysisStatus: AssetAnalysisStatus | null;
  productRole: ProductRole | null;
  assetClass: AssetClass | null;
}

export function buildAssetLibraryPresentation(args: {
  metadata: Json;
  tags: string[];
  title: string;
  assetClass: AssetClass;
}): AssetLibraryPresentation {
  const source = readAssetLibrarySource(args.metadata, args.tags);
  const analysis = readAssetAnalysis(args.metadata);
  const dims = readAssetDimensions(args.metadata);
  const preferred = resolvePreferredVideoUsageFromMetadata(args.metadata, {
    title: args.title,
  });

  return {
    source,
    sourceLabel: ASSET_LIBRARY_SOURCE_LABELS[source],
    captureViewport: readCaptureViewport(args.metadata),
    dimensionsLabel: dims.label,
    preferredVideoUsage: preferred,
    analysisStatus: analysis?.analysisStatus ?? null,
    productRole: readProductRole(args.metadata),
    assetClass: args.assetClass,
  };
}

export function countAssetsBySource(
  items: { source: AssetLibrarySource }[],
): {
  total: number;
  websiteIngestion: number;
  componentCapture: number;
  manualUpload: number;
} {
  let websiteIngestion = 0;
  let componentCapture = 0;
  let manualUpload = 0;
  for (const item of items) {
    if (item.source === "website_ingestion") websiteIngestion += 1;
    else if (item.source === "component_capture") componentCapture += 1;
    else if (item.source === "manual_upload") manualUpload += 1;
  }
  return {
    total: items.length,
    websiteIngestion,
    componentCapture,
    manualUpload,
  };
}
