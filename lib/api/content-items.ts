import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assertContentPackageInProject } from "@/lib/api/guards";
import type {
  ApprovalStatus,
  ContentFormat,
  ContentItem,
  Json,
  LanguageCode,
  PlatformType,
} from "@/lib/supabase/types";

export interface CreateContentItemInput {
  platform: PlatformType;
  format: ContentFormat;
  status?: ApprovalStatus;
  title?: string | null;
  body?: string | null;
  caption?: string | null;
  hashtags?: string[];
  cta?: string | null;
  // Omit / null => primary-language item (resolved as project.language).
  language?: LanguageCode | null;
  generationMetadata?: Json;
}

export async function listContentItems(
  projectId: string,
  packageId?: string,
): Promise<ContentItem[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("content_items")
    .select("*")
    .eq("project_id", projectId);

  if (packageId) {
    query = query.eq("package_id", packageId);
  }

  const { data, error } = await query.order("created_at", {
    ascending: false,
  });

  if (error) throw error;
  return (data ?? []) as ContentItem[];
}

export async function createContentItem(
  projectId: string,
  packageId: string | null,
  input: CreateContentItemInput,
): Promise<ContentItem> {
  const supabase = await createSupabaseServerClient();

  // Reject linking a content item to a package from a different project.
  if (packageId) {
    await assertContentPackageInProject(supabase, packageId, projectId);
  }

  const { data, error } = await supabase
    .from("content_items")
    .insert({
      project_id: projectId,
      package_id: packageId,
      platform: input.platform,
      format: input.format,
      status: input.status ?? "draft",
      title: input.title ?? null,
      body: input.body ?? null,
      caption: input.caption ?? null,
      hashtags: input.hashtags ?? [],
      cta: input.cta ?? null,
      language: input.language ?? null,
      generation_metadata: input.generationMetadata ?? {},
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as ContentItem;
}
