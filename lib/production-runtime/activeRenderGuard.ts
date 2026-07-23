import type { SupabaseClient } from "@supabase/supabase-js";
import { WorkflowError } from "@/lib/ai/workflows/shared";

/** Active (queued|processing) video jobs for any primary item on the package. */
export async function findActivePackageVideoJobIds(
  supabase: SupabaseClient,
  args: { projectId: string; packageId: string },
): Promise<string[]> {
  const { data: items, error: itemErr } = await supabase
    .from("content_items")
    .select("id")
    .eq("project_id", args.projectId)
    .eq("package_id", args.packageId);
  if (itemErr) throw itemErr;
  const itemIds = (items ?? []).map((r) => r.id as string);
  if (itemIds.length === 0) return [];

  const { data: jobs, error: jobErr } = await supabase
    .from("video_jobs")
    .select("id")
    .eq("project_id", args.projectId)
    .in("content_item_id", itemIds)
    .in("status", ["queued", "processing"]);
  if (jobErr) throw jobErr;
  return (jobs ?? []).map((r) => r.id as string);
}

/** Invariant 6 — regenerate must not overlap another active render. */
export async function assertNoActivePackageRender(
  supabase: SupabaseClient,
  args: { projectId: string; packageId: string },
): Promise<void> {
  const active = await findActivePackageVideoJobIds(supabase, args);
  if (active.length > 0) {
    throw new WorkflowError(
      "invalid_input",
      "a video render is already queued or processing for this package",
    );
  }
}
