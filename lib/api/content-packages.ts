import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assertStrategyItemInProject } from "@/lib/api/guards";
import type { ContentPackage, Json, PackageStatus } from "@/lib/supabase/types";

export interface CreateContentPackageInput {
  title: string;
  status?: PackageStatus;
  strategyItemId?: string | null;
  packageBrief?: Json;
}

export async function listContentPackages(
  projectId: string,
): Promise<ContentPackage[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("content_packages")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ContentPackage[];
}

export async function createContentPackage(
  projectId: string,
  input: CreateContentPackageInput,
): Promise<ContentPackage> {
  const supabase = await createSupabaseServerClient();

  // Reject linking a package to a strategy item from a different project.
  if (input.strategyItemId) {
    await assertStrategyItemInProject(supabase, input.strategyItemId, projectId);
  }

  const { data, error } = await supabase
    .from("content_packages")
    .insert({
      project_id: projectId,
      title: input.title,
      status: input.status ?? "draft",
      strategy_item_id: input.strategyItemId ?? null,
      package_brief: input.packageBrief ?? {},
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as ContentPackage;
}
