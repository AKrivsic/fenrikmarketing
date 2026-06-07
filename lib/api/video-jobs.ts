import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assertContentItemInProject } from "@/lib/api/guards";
import type { Json, JobStatus, VideoJob } from "@/lib/supabase/types";

export interface CreateVideoJobInput {
  provider: string;
  model?: string | null;
  contentItemId?: string | null;
  providerJobId?: string | null;
  input?: Json;
  status?: JobStatus;
}

export async function listVideoJobs(projectId: string): Promise<VideoJob[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("video_jobs")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as VideoJob[];
}

export async function createVideoJob(
  projectId: string,
  input: CreateVideoJobInput,
): Promise<VideoJob> {
  const supabase = await createSupabaseServerClient();

  // Reject linking to a content item from a different project.
  if (input.contentItemId) {
    await assertContentItemInProject(supabase, input.contentItemId, projectId);
  }

  const { data, error } = await supabase
    .from("video_jobs")
    .insert({
      project_id: projectId,
      provider: input.provider,
      model: input.model ?? null,
      content_item_id: input.contentItemId ?? null,
      provider_job_id: input.providerJobId ?? null,
      input: input.input ?? {},
      status: input.status ?? "queued",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as VideoJob;
}
