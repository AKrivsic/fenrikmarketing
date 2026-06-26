import type { Json } from "@/lib/supabase/types";

function metadataRecord(metadata: Json | null | undefined): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  return metadata as Record<string, unknown>;
}

/** When set, the asset is hidden from the library UI and new generation prompts. */
export function readAssetArchivedAt(metadata: Json | null | undefined): string | null {
  const record = metadataRecord(metadata);
  const value = record?.archived_at;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function isAssetArchivedFromLibrary(metadata: Json | null | undefined): boolean {
  return readAssetArchivedAt(metadata) !== null;
}

export function withAssetArchivedMetadata(
  metadata: Json | null | undefined,
  archivedAt: string,
): Json {
  const record = metadataRecord(metadata) ?? {};
  return { ...record, archived_at: archivedAt } as Json;
}
