import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Asset, AssetMode, Json, MediaType } from "@/lib/supabase/types";
import { STORAGE_BUCKETS, buildAssetPath } from "@/lib/api/storage";

export async function listAssets(projectId: string): Promise<Asset[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Asset[];
}

export interface UploadAssetMetadata {
  title: string;
  mediaType: MediaType;
  assetMode?: AssetMode;
  tags?: string[];
  metadata?: Json;
}

// Creates the asset row first to obtain its id, then uploads the file to
// {projectId}/source/{assetId}/{filename}, then records the storage location.
export async function uploadAsset(
  projectId: string,
  file: File,
  metadata: UploadAssetMetadata,
): Promise<Asset> {
  const supabase = await createSupabaseServerClient();

  const { data: created, error: insertError } = await supabase
    .from("assets")
    .insert({
      project_id: projectId,
      title: metadata.title,
      media_type: metadata.mediaType,
      asset_mode: metadata.assetMode ?? "source",
      tags: metadata.tags ?? [],
      metadata: metadata.metadata ?? {},
      mime_type: file.type || null,
    })
    .select("*")
    .single();

  if (insertError) throw insertError;
  const asset = created as Asset;

  const path = buildAssetPath(projectId, asset.id, file.name);

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.projectAssets)
    .upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    });

  if (uploadError) {
    // Roll back the orphaned row so a failed upload leaves no dangling asset.
    await supabase.from("assets").delete().eq("id", asset.id);
    throw uploadError;
  }

  const { data: updated, error: updateError } = await supabase
    .from("assets")
    .update({
      storage_bucket: STORAGE_BUCKETS.projectAssets,
      storage_path: path,
    })
    .eq("id", asset.id)
    .select("*")
    .single();

  if (updateError) {
    // The file is already in Storage but the row could not be finalized.
    // Remove both so a failed upload leaves neither an orphaned object nor
    // a dangling asset row.
    await supabase.storage.from(STORAGE_BUCKETS.projectAssets).remove([path]);
    await supabase.from("assets").delete().eq("id", asset.id);
    throw updateError;
  }

  return updated as Asset;
}
