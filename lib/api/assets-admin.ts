import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Asset, AssetMode, Json, MediaType } from "@/lib/supabase/types";
import { classifyAsset, type AssetClass } from "@/lib/ai/guardrails";
import {
  readAssetAnalysis,
  type AssetAnalysisStatus,
} from "@/lib/assets/analysis";
import { readProductRole, type ProductRole } from "@/lib/assets/productRole";
import { isAssetArchivedFromLibrary } from "@/lib/assets/libraryArchive";
import {
  buildAssetLibraryPresentation,
  readAssetDimensions,
  readAssetLibrarySource,
  type AssetLibrarySource,
} from "@/lib/assets/assetLibraryPresentation";
import {
  computeAspectRatio,
  computeOrientation,
  readSafeVerticalUsage,
  readVideoSuitability,
  type AssetOrientation,
  type VideoSuitability,
} from "@/lib/assets/smartUsageMetadata";
import {
  readPreferredVideoUsageFromMetadata,
  resolvePreferredVideoUsageFromMetadata,
} from "@/lib/assets/preferredVideoUsage";
import {
  readManualOverrides,
  type ManualOverridesMap,
} from "@/lib/assets/manualOverrides";

// Read-only asset library for the internal admin UI. Uses the service-role
// admin client (RLS bypassed); keep this module server-only. No upload / edit /
// delete here.

const PREVIEW_TTL_SECONDS = 3600;

export interface AssetView {
  id: string;
  projectId: string;
  title: string;
  mediaType: MediaType;
  assetMode: AssetMode;
  assetClass: AssetClass;
  tags: string[];
  createdAt: string;
  previewUrl: string | null;
  aiDescription: string | null;
  suggestedUsage: string | null;
  trustSignal: boolean;
  analysisStatus: AssetAnalysisStatus | null;
  productRole: ProductRole | null;
  productRoleLocked: boolean;
  source: AssetLibrarySource;
  sourceLabel: string;
  captureViewport: string | null;
  captureViewportAutomatic: boolean;
  dimensionsLabel: string | null;
  orientation: AssetOrientation | null;
  aspectRatio: string | number | null;
  assetQuality: string | null;
  videoSuitability: VideoSuitability | null;
  safeVerticalUsage: boolean | null;
  preferredVideoUsage: string;
  preferredVideoUsageAutomatic: boolean;
  storedPreferredVideoUsage: string | null;
  manualOverrides: ManualOverridesMap;
}

async function buildImagePreviewUrls(
  supabase: SupabaseClient,
  assets: Asset[],
): Promise<Map<string, string>> {
  const pathsByBucket = new Map<string, string[]>();
  for (const asset of assets) {
    if (asset.media_type !== "image") continue;
    if (!asset.storage_bucket || !asset.storage_path) continue;
    const paths = pathsByBucket.get(asset.storage_bucket) ?? [];
    paths.push(asset.storage_path);
    pathsByBucket.set(asset.storage_bucket, paths);
  }

  const urlByBucketPath = new Map<string, string>();

  for (const [bucket, paths] of pathsByBucket) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrls(paths, PREVIEW_TTL_SECONDS);
    if (error || !data) continue;
    for (const entry of data) {
      if (entry.error || !entry.signedUrl || !entry.path) continue;
      urlByBucketPath.set(`${bucket}\n${entry.path}`, entry.signedUrl);
    }
  }

  const urlByAssetId = new Map<string, string>();
  for (const asset of assets) {
    if (asset.media_type !== "image") continue;
    if (!asset.storage_bucket || !asset.storage_path) continue;
    const url = urlByBucketPath.get(
      `${asset.storage_bucket}\n${asset.storage_path}`,
    );
    if (url) urlByAssetId.set(asset.id, url);
  }

  return urlByAssetId;
}

function toMetadataRecord(value: Json): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function toAssetView(asset: Asset, previewUrl: string | null): AssetView {
  const analysis = readAssetAnalysis(asset.metadata);
  const assetClass = classifyAsset(asset.asset_mode, toMetadataRecord(asset.metadata));
  const presentation = buildAssetLibraryPresentation({
    metadata: asset.metadata,
    tags: asset.tags ?? [],
    title: asset.title,
    assetClass,
  });
  const record = toMetadataRecord(asset.metadata);
  const dims = readAssetDimensions(asset.metadata);
  const orientationRaw = record?.orientation;
  const orientation: AssetOrientation | null =
    orientationRaw === "portrait" ||
    orientationRaw === "landscape" ||
    orientationRaw === "square"
      ? orientationRaw
      : dims.width && dims.height
        ? computeOrientation(dims.width, dims.height)
        : null;
  const aspectRatio =
    dims.width && dims.height
      ? computeAspectRatio(dims.width, dims.height)
      : typeof record?.aspect_ratio === "string" ||
          typeof record?.aspect_ratio === "number"
        ? record.aspect_ratio
        : null;
  const storedPreferred = readPreferredVideoUsageFromMetadata(asset.metadata);
  const resolvedPreferred = resolvePreferredVideoUsageFromMetadata(asset.metadata, {
    title: asset.title,
  });
  const overrides = readManualOverrides(asset.metadata);
  const captureAutomatic = overrides.capture_viewport !== true;
  const preferredAutomatic = overrides.preferred_video_usage !== true;

  return {
    id: asset.id,
    projectId: asset.project_id,
    title: asset.title,
    mediaType: asset.media_type,
    assetMode: asset.asset_mode,
    assetClass,
    tags: asset.tags ?? [],
    createdAt: asset.created_at,
    previewUrl,
    aiDescription: analysis?.aiDescription ?? null,
    suggestedUsage: analysis?.suggestedUsage ?? null,
    trustSignal: analysis?.trustSignal ?? false,
    analysisStatus: analysis?.analysisStatus ?? null,
    productRole: readProductRole(asset.metadata),
    productRoleLocked: record?.product_role_locked === true,
    source: presentation.source,
    sourceLabel: presentation.sourceLabel,
    captureViewport: presentation.captureViewport,
    captureViewportAutomatic: captureAutomatic,
    dimensionsLabel: presentation.dimensionsLabel,
    orientation,
    aspectRatio,
    assetQuality:
      typeof record?.asset_quality === "string" ? record.asset_quality : null,
    videoSuitability: readVideoSuitability(asset.metadata),
    safeVerticalUsage: readSafeVerticalUsage(asset.metadata),
    preferredVideoUsage: resolvedPreferred,
    preferredVideoUsageAutomatic: preferredAutomatic,
    storedPreferredVideoUsage: storedPreferred,
    manualOverrides: overrides,
  };
}

async function mapAssetsWithPreview(
  supabase: SupabaseClient,
  assets: Asset[],
): Promise<AssetView[]> {
  if (assets.length === 0) return [];
  const previews = await buildImagePreviewUrls(supabase, assets);
  return assets.map((asset) => toAssetView(asset, previews.get(asset.id) ?? null));
}

export async function listAssetsForAdmin(): Promise<AssetView[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  const active = ((data ?? []) as Asset[]).filter(
    (asset) => !isAssetArchivedFromLibrary(asset.metadata),
  );
  return mapAssetsWithPreview(supabase, active);
}

export async function listProjectAssets(
  projectId: string,
): Promise<AssetView[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  const active = ((data ?? []) as Asset[]).filter(
    (asset) => !isAssetArchivedFromLibrary(asset.metadata),
  );
  return mapAssetsWithPreview(supabase, active);
}

export { readAssetLibrarySource };
