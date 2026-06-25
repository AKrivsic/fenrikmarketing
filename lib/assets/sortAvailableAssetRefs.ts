import type { AssetRef } from "@/lib/ai/prompts/generateContentPackage";
import {
  ingestPriorityRank,
  qualityTierRank,
  type AssetQualityTier,
} from "@/lib/assets/assetIngestMetadata";
import type { ProductRole } from "@/lib/assets/productRole";
import { readProductRole } from "@/lib/assets/productRole";
import type { Json } from "@/lib/supabase/types";

export interface AvailableAssetEntry {
  ref: AssetRef;
  metadata: Json;
}

function readQualityTier(metadata: Json): AssetQualityTier | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const value = (metadata as Record<string, unknown>).asset_quality;
  if (value === "high" || value === "medium" || value === "low") return value;
  return null;
}

function readIngestPriority(metadata: Json): number | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const value = (metadata as Record<string, unknown>).ingest_priority;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function roleProductScore(role: ProductRole | null): number {
  if (!role || role === "other" || role === "decorative") return 2;
  return 0;
}

// Stable ordering for Creative Engine: better product assets first; never forces usage.
export function sortAvailableAssetEntries(
  entries: AvailableAssetEntry[],
): AssetRef[] {
  const decorated = entries.map((entry, index) => {
    const role = entry.ref.product_role ?? readProductRole(entry.metadata);
    const quality =
      readQualityTier(entry.metadata) ?? (role ? "medium" : "low");
    const priority =
      readIngestPriority(entry.metadata) ??
      ingestPriorityRank({ kind: "img", productRole: role });
    return {
      entry,
      index,
      sortKey: {
        roleProduct: roleProductScore(role),
        priority,
        quality: qualityTierRank(quality),
      },
    };
  });

  return decorated
    .sort((a, b) => {
      if (a.sortKey.roleProduct !== b.sortKey.roleProduct) {
        return a.sortKey.roleProduct - b.sortKey.roleProduct;
      }
      if (a.sortKey.priority !== b.sortKey.priority) {
        return a.sortKey.priority - b.sortKey.priority;
      }
      if (a.sortKey.quality !== b.sortKey.quality) {
        return a.sortKey.quality - b.sortKey.quality;
      }
      return a.index - b.index;
    })
    .map((item) => item.entry.ref);
}
