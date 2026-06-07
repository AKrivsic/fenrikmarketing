import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Asset, AssetMode, MediaType } from "@/lib/supabase/types";

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
  tags: string[];
  usageCount: number;
  reuseScore: number;
  lastUsedAt: string | null;
  createdAt: string;
  previewUrl: string | null;
}

// Builds signed preview URLs for image assets only, batched per bucket so the
// number of storage calls is bounded by the number of buckets (no N+1).
// Previews are best-effort: any failure leaves previewUrl = null.
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

  // Keyed by `${bucket}\n${path}` -> signed URL.
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

  // Re-map to asset id for easy lookup.
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

function toAssetView(asset: Asset, previewUrl: string | null): AssetView {
  return {
    id: asset.id,
    projectId: asset.project_id,
    title: asset.title,
    mediaType: asset.media_type,
    assetMode: asset.asset_mode,
    tags: asset.tags ?? [],
    usageCount: asset.usage_count,
    reuseScore: asset.reuse_score,
    lastUsedAt: asset.last_used_at,
    createdAt: asset.created_at,
    previewUrl,
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

// Global asset library across all projects.
export async function listAssetsForAdmin(): Promise<AssetView[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return mapAssetsWithPreview(supabase, (data ?? []) as Asset[]);
}

// Assets scoped to a single project.
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
  return mapAssetsWithPreview(supabase, (data ?? []) as Asset[]);
}
