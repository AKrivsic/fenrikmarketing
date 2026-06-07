import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  assertAssetInProject,
  assertContentItemInProject,
} from "@/lib/api/guards";
import type { AiVisual, Json, JobStatus, VisualProvider } from "@/lib/supabase/types";

export interface CreateAiVisualInput {
  prompt: string;
  imageProvider: VisualProvider;
  imageModel: string;
  negativePrompt?: string | null;
  contentItemId?: string | null;
  assetId?: string | null;
  providerJobId?: string | null;
  providerMetadata?: Json;
  status?: JobStatus;
}

export async function listAiVisuals(projectId: string): Promise<AiVisual[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ai_visuals")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as AiVisual[];
}

export async function createAiVisual(
  projectId: string,
  input: CreateAiVisualInput,
): Promise<AiVisual> {
  const supabase = await createSupabaseServerClient();

  // Reject linking to a content item or asset from a different project.
  if (input.contentItemId) {
    await assertContentItemInProject(supabase, input.contentItemId, projectId);
  }
  if (input.assetId) {
    await assertAssetInProject(supabase, input.assetId, projectId);
  }

  const { data, error } = await supabase
    .from("ai_visuals")
    .insert({
      project_id: projectId,
      prompt: input.prompt,
      negative_prompt: input.negativePrompt ?? null,
      image_provider: input.imageProvider,
      image_model: input.imageModel,
      content_item_id: input.contentItemId ?? null,
      asset_id: input.assetId ?? null,
      provider_job_id: input.providerJobId ?? null,
      provider_metadata: input.providerMetadata ?? {},
      status: input.status ?? "queued",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as AiVisual;
}
