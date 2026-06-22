import type { SupabaseClient } from "@supabase/supabase-js";
import { runRetryVideoJob } from "@/lib/ai/workflows/retryVideoJob";
import { WorkflowError } from "@/lib/ai/workflows/shared";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";
import {
  mergeFailedVideoJobEditorDraft,
  readFailedVideoJobEditorDraft,
  type FailedVideoJobEditorDraft,
} from "@/lib/video-scene-editor/failedJobEditorMetadata";
import { readSourceVoiceoverText } from "@/lib/video-scene-editor/voiceoverDraft";

export interface FailedVideoJobEditorState {
  sourceVideoJobId: string;
  contentItemId: string;
  voiceoverText: string;
  baselineVoiceoverText: string;
  hasDraftChanges: boolean;
  activeRenderInFlight: boolean;
}

export interface FailedVideoJobEditorDeps {
  client?: SupabaseClient;
}

async function loadFailedJob(
  supabase: SupabaseClient,
  projectId: string,
  videoJobId: string,
) {
  const { data, error } = await supabase
    .from("video_jobs")
    .select("id, project_id, content_item_id, status, input")
    .eq("id", videoJobId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new WorkflowError(
      "not_found",
      `video job ${videoJobId} not found for project ${projectId}`,
    );
  }
  return data as {
    id: string;
    content_item_id: string | null;
    status: string;
    input: unknown;
  };
}

async function assertNoActiveRender(
  supabase: SupabaseClient,
  projectId: string,
  contentItemId: string,
): Promise<void> {
  const { data: activeRows, error } = await supabase
    .from("video_jobs")
    .select("id")
    .eq("project_id", projectId)
    .eq("content_item_id", contentItemId)
    .in("status", ["queued", "processing"])
    .limit(1);
  if (error) throw error;
  if ((activeRows ?? []).length > 0) {
    throw new WorkflowError(
      "invalid_input",
      "a video render is already queued or processing for this item",
    );
  }
}

function resolveVoiceoverText(args: {
  draft: FailedVideoJobEditorDraft | null;
  sourceVideoJobId: string;
  jobInput: unknown;
}): string {
  if (
    args.draft &&
    args.draft.source_video_job_id === args.sourceVideoJobId
  ) {
    return args.draft.voiceover_text.trim();
  }
  return readSourceVoiceoverText(args.jobInput);
}

function baselineVoiceover(args: {
  draft: FailedVideoJobEditorDraft | null;
  sourceVideoJobId: string;
  jobInput: unknown;
}): string {
  if (
    args.draft &&
    args.draft.source_video_job_id === args.sourceVideoJobId
  ) {
    return args.draft.original_voiceover_text.trim();
  }
  return readSourceVoiceoverText(args.jobInput);
}

export async function loadFailedVideoJobEditorState(
  input: { projectId: string; videoJobId: string },
  deps: FailedVideoJobEditorDeps = {},
): Promise<FailedVideoJobEditorState> {
  const supabase = deps.client ?? createSupabaseAdminClient();
  const job = await loadFailedJob(supabase, input.projectId, input.videoJobId);

  if (job.status !== "failed") {
    throw new WorkflowError(
      "invalid_input",
      "failed-job voiceover editor is only available for failed video jobs",
    );
  }
  const contentItemId = job.content_item_id;
  if (!contentItemId) {
    throw new WorkflowError(
      "invalid_input",
      "video job is not linked to a content item",
    );
  }

  const { data: itemRow, error: itemErr } = await supabase
    .from("content_items")
    .select("generation_metadata")
    .eq("id", contentItemId)
    .eq("project_id", input.projectId)
    .maybeSingle();
  if (itemErr) throw itemErr;
  if (!itemRow) {
    throw new WorkflowError("not_found", `content item ${contentItemId} not found`);
  }

  const draft = readFailedVideoJobEditorDraft(itemRow.generation_metadata);
  const baselineVoiceoverText = baselineVoiceover({
    draft,
    sourceVideoJobId: job.id,
    jobInput: job.input,
  });
  const voiceoverText = resolveVoiceoverText({
    draft,
    sourceVideoJobId: job.id,
    jobInput: job.input,
  });
  const hasDraftChanges =
    draft !== null &&
    draft.source_video_job_id === job.id &&
    draft.voiceover_text.trim() !== baselineVoiceoverText.trim();

  const { data: activeRows } = await supabase
    .from("video_jobs")
    .select("id")
    .eq("project_id", input.projectId)
    .eq("content_item_id", contentItemId)
    .in("status", ["queued", "processing"])
    .limit(1);

  return {
    sourceVideoJobId: job.id,
    contentItemId,
    voiceoverText,
    baselineVoiceoverText,
    hasDraftChanges,
    activeRenderInFlight: (activeRows ?? []).length > 0,
  };
}

export async function updateFailedVideoJobEditorVoiceover(
  input: { projectId: string; videoJobId: string; voiceoverText: string },
  deps: FailedVideoJobEditorDeps = {},
): Promise<FailedVideoJobEditorState> {
  const voiceoverText = input.voiceoverText.trim();
  if (!voiceoverText) {
    throw new WorkflowError("invalid_input", "voiceover text is required");
  }

  const supabase = deps.client ?? createSupabaseAdminClient();
  const job = await loadFailedJob(supabase, input.projectId, input.videoJobId);
  if (job.status !== "failed") {
    throw new WorkflowError(
      "invalid_input",
      "only failed video jobs can be edited here",
    );
  }
  const contentItemId = job.content_item_id;
  if (!contentItemId) {
    throw new WorkflowError("invalid_input", "video job has no content item");
  }
  await assertNoActiveRender(supabase, input.projectId, contentItemId);

  const { data: itemRow, error: itemErr } = await supabase
    .from("content_items")
    .select("generation_metadata")
    .eq("id", contentItemId)
    .eq("project_id", input.projectId)
    .maybeSingle();
  if (itemErr) throw itemErr;
  if (!itemRow) {
    throw new WorkflowError("not_found", `content item ${contentItemId} not found`);
  }

  const existing = readFailedVideoJobEditorDraft(itemRow.generation_metadata);
  const original =
    existing && existing.source_video_job_id === job.id
      ? existing.original_voiceover_text
      : readSourceVoiceoverText(job.input);

  const merged = mergeFailedVideoJobEditorDraft(itemRow.generation_metadata, {
    source_video_job_id: job.id,
    voiceover_text: voiceoverText,
    original_voiceover_text: original,
    updated_at: new Date().toISOString(),
  });

  const { error: updateErr } = await supabase
    .from("content_items")
    .update({ generation_metadata: merged as unknown as Json })
    .eq("id", contentItemId)
    .eq("project_id", input.projectId);
  if (updateErr) throw updateErr;

  return loadFailedVideoJobEditorState(input, deps);
}

export interface RerenderFailedVideoJobSummary {
  videoJobId: string;
  dispatched: boolean;
}

export async function rerunFailedVideoJobWithVoiceover(
  input: { projectId: string; videoJobId: string; voiceoverText?: string },
  deps: FailedVideoJobEditorDeps & {
    videoCallbackUrl?: string;
  } = {},
): Promise<RerenderFailedVideoJobSummary> {
  const supabase = deps.client ?? createSupabaseAdminClient();
  const job = await loadFailedJob(supabase, input.projectId, input.videoJobId);
  if (job.status !== "failed") {
    throw new WorkflowError(
      "invalid_input",
      "only failed video jobs can be re-rendered from this editor",
    );
  }
  const contentItemId = job.content_item_id;
  if (!contentItemId) {
    throw new WorkflowError("invalid_input", "video job has no content item");
  }

  let voiceoverOverride = input.voiceoverText?.trim();
  if (!voiceoverOverride) {
    const { data: itemRow, error: itemErr } = await supabase
      .from("content_items")
      .select("generation_metadata")
      .eq("id", contentItemId)
      .eq("project_id", input.projectId)
      .maybeSingle();
    if (itemErr) throw itemErr;
    const draft = readFailedVideoJobEditorDraft(itemRow?.generation_metadata);
    voiceoverOverride = resolveVoiceoverText({
      draft,
      sourceVideoJobId: job.id,
      jobInput: job.input,
    });
  }
  if (!voiceoverOverride) {
    throw new WorkflowError("invalid_input", "voiceover text is required");
  }

  const result = await runRetryVideoJob(
    {
      projectId: input.projectId,
      videoJobId: input.videoJobId,
      voiceoverText: voiceoverOverride,
    },
    {
      client: supabase,
      videoCallbackUrl: deps.videoCallbackUrl,
    },
  );

  return {
    videoJobId: result.videoJobId,
    dispatched: result.dispatched,
  };
}
