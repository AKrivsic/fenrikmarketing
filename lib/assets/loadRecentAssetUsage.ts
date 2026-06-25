import type { SupabaseClient } from "@supabase/supabase-js";
import { readProductRole } from "@/lib/assets/productRole";

const DEFAULT_LIMIT = 24;

export interface RecentAssetUsageEntry {
  assetId: string;
  title: string;
  productRole: string | null;
  usedAs: string | null;
  usedAt: string;
}

// Read-only: recent asset_usage rows for prompt guidance (no counters updated).
export async function loadRecentAssetUsageContext(
  supabase: SupabaseClient,
  projectId: string,
  limit: number = DEFAULT_LIMIT,
): Promise<RecentAssetUsageEntry[]> {
  if (!projectId) return [];

  const { data, error } = await supabase
    .from("asset_usage")
    .select("asset_id, used_as, used_at, assets(title, metadata)")
    .eq("project_id", projectId)
    .order("used_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  const entries: RecentAssetUsageEntry[] = [];
  for (const row of data) {
    const assetId = row.asset_id as string;
    const usedAt = row.used_at as string;
    const usedAs =
      typeof row.used_as === "string" && row.used_as.trim().length > 0
        ? row.used_as.trim()
        : null;

    const assetRaw = row.assets as
      | { title?: string; metadata?: unknown }
      | null
      | undefined;
    const title =
      typeof assetRaw?.title === "string" && assetRaw.title.trim().length > 0
        ? assetRaw.title.trim()
        : assetId;
    const productRole = readProductRole(assetRaw?.metadata ?? null);

    entries.push({
      assetId,
      title,
      productRole,
      usedAs,
      usedAt,
    });
  }
  return entries;
}

export function buildRecentAssetUsageBlock(
  entries: RecentAssetUsageEntry[],
): string {
  if (entries.length === 0) return "";

  const lines = entries.slice(0, 12).map((e) => {
    const role = e.productRole ? ` role=${e.productRole}` : "";
    const used = e.usedAs ? ` as="${e.usedAs}"` : "";
    return `- asset_id=${e.assetId}${role} title="${e.title}"${used}`;
  });

  return [
    "RECENT ASSET USAGE (monthly content — assets are OPTIONAL):",
    ...lines,
    "ASSET ROTATION RULES:",
    "- Prefer less recently used assets when you choose to use the library.",
    "- Do NOT force assets into every package; empty asset_usage is valid.",
    "- Rotate product roles naturally across packages; avoid repeating the same asset_id in consecutive packages unless essential.",
  ].join("\n");
}
