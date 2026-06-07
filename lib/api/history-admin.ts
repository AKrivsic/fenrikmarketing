import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Cross-project, read-only history for the internal admin UI. The only history
// table is content_versions; content_performance and any analytics are out of
// scope. Uses the service-role admin client (RLS bypassed); keep server-only.
// snapshot (jsonb) and created_by are intentionally not surfaced.
// These are UI read models, not global DB entity types.

const DEFAULT_HISTORY_LIMIT = 100;

export interface HistoryEntry {
  id: string;
  createdAt: string;
  versionNo: number;
  changeNote: string | null;
  projectId: string;
  projectName: string | null;
  contentItemId: string | null;
  itemTitle: string | null;
  contentPackageId: string | null;
  packageTitle: string | null;
}

interface ContentVersionRow {
  id: string;
  project_id: string;
  content_item_id: string | null;
  content_package_id: string | null;
  version_no: number;
  change_note: string | null;
  created_at: string;
}

// Lists content_versions across all projects (created_at desc), enriched with
// project name, content item title, and — as a package-level fallback target —
// content package title. Batched lookups, no N+1.
export async function listHistoryEntries(
  limit: number = DEFAULT_HISTORY_LIMIT,
): Promise<HistoryEntry[]> {
  const supabase = createSupabaseAdminClient();

  const { data: versionRows, error: versionsError } = await supabase
    .from("content_versions")
    .select(
      "id, project_id, content_item_id, content_package_id, version_no, change_note, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (versionsError) throw versionsError;

  const versions = (versionRows ?? []) as ContentVersionRow[];
  if (versions.length === 0) return [];

  const projectIds = Array.from(new Set(versions.map((v) => v.project_id)));
  const itemIds = Array.from(
    new Set(
      versions
        .map((v) => v.content_item_id)
        .filter((id): id is string => id !== null),
    ),
  );
  const packageIds = Array.from(
    new Set(
      versions
        .map((v) => v.content_package_id)
        .filter((id): id is string => id !== null),
    ),
  );

  const projectNameById = new Map<string, string>();
  if (projectIds.length > 0) {
    const { data, error } = await supabase
      .from("projects")
      .select("id, name")
      .in("id", projectIds);
    if (error) throw error;
    for (const row of (data ?? []) as { id: string; name: string }[]) {
      projectNameById.set(row.id, row.name);
    }
  }

  const itemTitleById = new Map<string, string | null>();
  if (itemIds.length > 0) {
    const { data, error } = await supabase
      .from("content_items")
      .select("id, title")
      .in("id", itemIds);
    if (error) throw error;
    for (const row of (data ?? []) as { id: string; title: string | null }[]) {
      itemTitleById.set(row.id, row.title);
    }
  }

  const packageTitleById = new Map<string, string>();
  if (packageIds.length > 0) {
    const { data, error } = await supabase
      .from("content_packages")
      .select("id, title")
      .in("id", packageIds);
    if (error) throw error;
    for (const row of (data ?? []) as { id: string; title: string }[]) {
      packageTitleById.set(row.id, row.title);
    }
  }

  return versions.map((version) => ({
    id: version.id,
    createdAt: version.created_at,
    versionNo: version.version_no,
    changeNote: version.change_note,
    projectId: version.project_id,
    projectName: projectNameById.get(version.project_id) ?? null,
    contentItemId: version.content_item_id,
    itemTitle: version.content_item_id
      ? (itemTitleById.get(version.content_item_id) ?? null)
      : null,
    contentPackageId: version.content_package_id,
    packageTitle: version.content_package_id
      ? (packageTitleById.get(version.content_package_id) ?? null)
      : null,
  }));
}
