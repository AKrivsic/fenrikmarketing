import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Asset, AssetMode, Json, MediaType } from "@/lib/supabase/types";
import { STORAGE_BUCKETS, buildAssetPath } from "@/lib/api/storage";
import { assertAssetInProject } from "@/lib/api/guards";
import type { AssetClass } from "@/lib/ai/guardrails";
import {
  normalizeProductRole,
  type ProductRole,
} from "@/lib/assets/productRole";
import {
  isAssetArchivedFromLibrary,
  withAssetArchivedMetadata,
} from "@/lib/assets/libraryArchive";

export async function listAssets(projectId: string): Promise<Asset[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as Asset[]).filter(
    (asset) => !isAssetArchivedFromLibrary(asset.metadata),
  );
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

export interface UpdateProjectAssetInput {
  title: string;
  assetClass: AssetClass;
  productRole: ProductRole | null;
  tags?: string[];
}

// Updates editable asset fields. Vision/analysis keys in metadata are merged,
// never replaced wholesale.
export async function updateProjectAsset(
  projectId: string,
  assetId: string,
  input: UpdateProjectAssetInput,
): Promise<Asset> {
  const supabase = await createSupabaseServerClient();
  await assertAssetInProject(supabase, assetId, projectId);

  const { data: existing, error: loadError } = await supabase
    .from("assets")
    .select("*")
    .eq("id", assetId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (loadError) throw loadError;
  if (!existing) {
    throw new Error(`asset ${assetId} not found`);
  }

  const priorMeta =
    existing.metadata &&
    typeof existing.metadata === "object" &&
    !Array.isArray(existing.metadata)
      ? { ...(existing.metadata as Record<string, unknown>) }
      : {};

  const nextMeta: Record<string, unknown> = {
    ...priorMeta,
    asset_class: input.assetClass,
  };
  if (input.productRole) {
    nextMeta.product_role = input.productRole;
    nextMeta.product_role_locked = true;
  } else {
    delete nextMeta.product_role;
    delete nextMeta.product_role_locked;
  }

  const update: Record<string, unknown> = {
    title: input.title.trim(),
    metadata: nextMeta as Json,
  };
  if (input.tags !== undefined) {
    update.tags = input.tags;
  }

  const { data: updated, error: updateError } = await supabase
    .from("assets")
    .update(update)
    .eq("id", assetId)
    .eq("project_id", projectId)
    .select("*")
    .single();
  if (updateError) throw updateError;
  return updated as Asset;
}

export type DeleteProjectAssetMode = "archived" | "removed";

export interface DeleteProjectAssetResult {
  mode: DeleteProjectAssetMode;
}

async function assetHasHistoricalReferences(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  projectId: string,
  assetId: string,
  usageCount: number,
): Promise<boolean> {
  if (usageCount > 0) return true;

  const { count: usageRows, error: usageError } = await supabase
    .from("asset_usage")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("asset_id", assetId);
  if (usageError) throw usageError;
  if ((usageRows ?? 0) > 0) return true;

  const { data: packages, error: pkgError } = await supabase
    .from("content_packages")
    .select("package_brief")
    .eq("project_id", projectId);
  if (pkgError) throw pkgError;

  for (const row of packages ?? []) {
    const brief = row.package_brief as Record<string, unknown> | null;
    const usages = brief?.asset_usage;
    if (!Array.isArray(usages)) continue;
    for (const entry of usages) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
      const id = (entry as Record<string, unknown>).asset_id;
      if (id === assetId) return true;
    }
  }

  const { data: videoJobs, error: videoError } = await supabase
    .from("video_jobs")
    .select("input")
    .eq("project_id", projectId);
  if (videoError) throw videoError;

  const needle = assetId;
  for (const job of videoJobs ?? []) {
    const serialized = JSON.stringify(job.input ?? {});
    if (serialized.includes(needle)) return true;
  }

  return false;
}

// Removes an asset from the active library. Historical packages / videos keep
// storage when the asset was ever referenced (soft archive via metadata).
export async function deleteProjectAsset(
  projectId: string,
  assetId: string,
): Promise<DeleteProjectAssetResult> {
  const supabase = await createSupabaseServerClient();
  await assertAssetInProject(supabase, assetId, projectId);

  const { data: existing, error: loadError } = await supabase
    .from("assets")
    .select("*")
    .eq("id", assetId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (loadError) throw loadError;
  if (!existing) {
    throw new Error(`asset ${assetId} not found`);
  }

  const asset = existing as Asset;
  if (isAssetArchivedFromLibrary(asset.metadata)) {
    return { mode: "archived" };
  }

  const preserveStorage = await assetHasHistoricalReferences(
    supabase,
    projectId,
    assetId,
    asset.usage_count,
  );

  if (preserveStorage) {
    const archivedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("assets")
      .update({
        metadata: withAssetArchivedMetadata(asset.metadata, archivedAt),
      })
      .eq("id", assetId)
      .eq("project_id", projectId);
    if (updateError) throw updateError;
    return { mode: "archived" };
  }

  if (asset.storage_bucket && asset.storage_path) {
    const { error: storageError } = await supabase.storage
      .from(asset.storage_bucket)
      .remove([asset.storage_path]);
    if (storageError) throw storageError;
  }

  const { error: deleteError } = await supabase
    .from("assets")
    .delete()
    .eq("id", assetId)
    .eq("project_id", projectId);
  if (deleteError) throw deleteError;

  return { mode: "removed" };
}
