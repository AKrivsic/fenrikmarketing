import type { SupabaseClient } from "@supabase/supabase-js";
import {
  filterContentItemIdsForProductionRun,
  readProductionRunIdFromMetadata,
} from "@/lib/api/production-run-cancel";
import { PRODUCTION_RUN_CANCELLED_MESSAGE } from "@/lib/api/production-run-cancel";

/**
 * Collect every content_item id that belongs to a production run for Stop:
 * 1) items stamped with production_run_id
 * 2) all items on packages assigned to the run's items (covers language variants)
 */
export async function collectContentItemIdsForRunCancel(
  supabase: SupabaseClient,
  projectId: string,
  runId: string,
): Promise<string[]> {
  const ids = new Set<string>();

  const { data: stamped, error: stampedErr } = await supabase
    .from("content_items")
    .select("id, generation_metadata")
    .eq("project_id", projectId)
    .eq("generation_metadata->>production_run_id", runId);
  if (stampedErr) throw stampedErr;
  for (const id of filterContentItemIdsForProductionRun(
    stamped ?? [],
    runId,
  )) {
    ids.add(id);
  }

  const { data: runItems, error: runItemErr } = await supabase
    .from("production_run_items")
    .select("content_package_id")
    .eq("production_run_id", runId)
    .eq("project_id", projectId)
    .not("content_package_id", "is", null);
  if (runItemErr) throw runItemErr;

  const packageIds = [
    ...new Set(
      (runItems ?? [])
        .map((r) => r.content_package_id as string | null)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];

  if (packageIds.length > 0) {
    const { data: packageItems, error: pkgErr } = await supabase
      .from("content_items")
      .select("id")
      .eq("project_id", projectId)
      .in("package_id", packageIds);
    if (pkgErr) throw pkgErr;
    for (const row of packageItems ?? []) {
      ids.add(row.id as string);
    }
  }

  return [...ids];
}

/** Cancel pending/processing translation jobs for packages in the run. */
export async function cancelTranslationJobsForPackages(
  supabase: SupabaseClient,
  args: { projectId: string; packageIds: string[] },
): Promise<number> {
  if (args.packageIds.length === 0) return 0;
  const { data, error } = await supabase
    .from("translation_jobs")
    .update({
      status: "failed",
      error_message: PRODUCTION_RUN_CANCELLED_MESSAGE,
    })
    .eq("project_id", args.projectId)
    .in("package_id", args.packageIds)
    .in("status", ["pending", "processing"])
    .select("id");
  if (error) throw error;
  return (data ?? []).length;
}

/** Stamp production_run_id onto language-variant metadata when source has it. */
export function mergeProductionRunIdIntoVariantMetadata(
  sourceMetadata: unknown,
  base: Record<string, unknown>,
): Record<string, unknown> {
  const runId = readProductionRunIdFromMetadata(sourceMetadata);
  if (!runId) return base;
  return { ...base, production_run_id: runId };
}
