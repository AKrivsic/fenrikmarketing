import type { SupabaseClient } from "@supabase/supabase-js";

// RLS only enforces that a row's own project_id is owned by the user. It does
// NOT prevent linking a child row to a parent that lives in a DIFFERENT project
// the same user also owns. These guards close that gap by asserting that a
// referenced row actually belongs to the target project before it is used.

export class CrossProjectReferenceError extends Error {
  constructor(table: string, id: string, projectId: string) {
    super(
      `${table} ${id} does not belong to project ${projectId} (cross-project reference rejected)`,
    );
    this.name = "CrossProjectReferenceError";
  }
}

async function assertRowInProject(
  supabase: SupabaseClient,
  table: string,
  id: string,
  projectId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from(table)
    .select("id")
    .eq("id", id)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new CrossProjectReferenceError(table, id, projectId);
}

export function assertContentItemInProject(
  supabase: SupabaseClient,
  contentItemId: string,
  projectId: string,
): Promise<void> {
  return assertRowInProject(supabase, "content_items", contentItemId, projectId);
}

export function assertContentPackageInProject(
  supabase: SupabaseClient,
  packageId: string,
  projectId: string,
): Promise<void> {
  return assertRowInProject(supabase, "content_packages", packageId, projectId);
}

export function assertAssetInProject(
  supabase: SupabaseClient,
  assetId: string,
  projectId: string,
): Promise<void> {
  return assertRowInProject(supabase, "assets", assetId, projectId);
}

export function assertStrategyItemInProject(
  supabase: SupabaseClient,
  strategyItemId: string,
  projectId: string,
): Promise<void> {
  return assertRowInProject(
    supabase,
    "content_strategy_items",
    strategyItemId,
    projectId,
  );
}
