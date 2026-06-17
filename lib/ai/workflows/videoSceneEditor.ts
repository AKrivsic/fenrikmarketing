import type { SupabaseClient } from "@supabase/supabase-js";
import { assertContentItemInProject } from "@/lib/api/guards";
import { STORAGE_BUCKETS, buildVideoRenderPath } from "@/lib/api/storage";
import { extractRenderSpecScenes } from "@/lib/ai/workflows/languageVariantsHelpers";
import { WorkflowError } from "@/lib/ai/workflows/shared";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";
import { regenerateSceneImageViaWorker } from "@/lib/video-worker/regenerateSceneImageClient";
import {
  runSceneEditorRerender as runSceneEditorRerenderCore,
  SceneEditorRerenderError,
  type SceneEditorRerenderDeps,
  type SceneEditorRerenderSummary,
} from "@/lib/video-scene-editor/sceneEditorRerender";
import {
  mergeSceneEditorDraft,
  readSceneEditorDraft,
  type SceneEditorDraft,
  type SceneEditorDraftScene,
} from "@/lib/video-scene-editor/metadata";
import { validateSceneImageUpload } from "@/lib/video-scene-editor/validateUpload";

function scenesToDraftScenes(
  scenes: Record<string, unknown>[],
): SceneEditorDraftScene[] {
  return scenes.map((scene) => {
    const id = String(scene.id ?? "");
    const image_prompt = String(scene.image_prompt ?? "");
    const image_bucket = String(scene.image_bucket ?? "");
    const image_path = String(scene.image_path ?? "");
    const duration_seconds = Number(scene.duration_seconds ?? 0);
    if (
      !id ||
      !image_prompt ||
      !image_bucket ||
      !image_path ||
      !(duration_seconds > 0)
    ) {
      throw new WorkflowError(
        "invalid_input",
        "scene is missing required fields for the editor",
      );
    }
    return {
      id,
      image_prompt,
      image_bucket,
      image_path,
      duration_seconds,
    };
  });
}

async function loadSourceJob(
  supabase: SupabaseClient,
  projectId: string,
  videoJobId: string,
) {
  const { data, error } = await supabase
    .from("video_jobs")
    .select("id, project_id, content_item_id, provider, status, input, output")
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
    provider: string;
    status: string;
    input: unknown;
    output: unknown;
  };
}

async function loadBaselineScenes(
  supabase: SupabaseClient,
  args: {
    projectId: string;
    contentItemId: string;
    sourceVideoJobId: string;
    generationMetadata: Json | null;
    jobOutput: unknown;
  },
): Promise<SceneEditorDraftScene[]> {
  const draft = readSceneEditorDraft(args.generationMetadata);
  if (draft && draft.source_video_job_id === args.sourceVideoJobId) {
    return draft.scenes;
  }

  const fromOutput = extractRenderSpecScenes(args.jobOutput);
  if (!fromOutput) {
    throw new WorkflowError(
      "invalid_input",
      "this video has no reusable render_spec scenes for editing",
    );
  }
  return scenesToDraftScenes(fromOutput);
}

async function persistDraft(
  supabase: SupabaseClient,
  args: {
    projectId: string;
    contentItemId: string;
    sourceVideoJobId: string;
    scenes: SceneEditorDraftScene[];
    generationMetadata: Json | null;
  },
): Promise<void> {
  const draft: SceneEditorDraft = {
    source_video_job_id: args.sourceVideoJobId,
    scenes: args.scenes,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("content_items")
    .update({
      generation_metadata: mergeSceneEditorDraft(
        args.generationMetadata,
        draft,
      ),
    })
    .eq("id", args.contentItemId)
    .eq("project_id", args.projectId);
  if (error) throw error;
}

export interface VideoSceneEditorSceneView {
  id: string;
  sceneNumber: number;
  image_prompt: string;
  image_bucket: string;
  image_path: string;
  duration_seconds: number;
  previewUrl: string | null;
}

export interface VideoSceneEditorState {
  sourceVideoJobId: string;
  contentItemId: string;
  scenes: VideoSceneEditorSceneView[];
  hasDraftChanges: boolean;
  activeRenderInFlight: boolean;
}

export interface VideoSceneEditorDeps {
  client?: SupabaseClient;
}

export async function loadVideoSceneEditorState(
  input: { projectId: string; videoJobId: string },
  deps: VideoSceneEditorDeps = {},
): Promise<VideoSceneEditorState> {
  const supabase = deps.client ?? createSupabaseAdminClient();
  const job = await loadSourceJob(supabase, input.projectId, input.videoJobId);

  if (job.status !== "completed") {
    throw new WorkflowError(
      "invalid_input",
      "scene editor is only available for completed videos",
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

  const baselineFromOutput = extractRenderSpecScenes(job.output);
  const scenes = await loadBaselineScenes(supabase, {
    projectId: input.projectId,
    contentItemId,
    sourceVideoJobId: job.id,
    generationMetadata: itemRow.generation_metadata as Json | null,
    jobOutput: job.output,
  });

  const draft = readSceneEditorDraft(itemRow.generation_metadata as Json | null);
  const baselineScenes = baselineFromOutput
    ? scenesToDraftScenes(baselineFromOutput)
    : null;
  const hasDraftChanges =
    draft !== null &&
    draft.source_video_job_id === job.id &&
    baselineScenes !== null &&
    JSON.stringify(draft.scenes) !== JSON.stringify(baselineScenes);

  const { data: activeRows } = await supabase
    .from("video_jobs")
    .select("id")
    .eq("project_id", input.projectId)
    .eq("content_item_id", contentItemId)
    .in("status", ["queued", "processing"])
    .limit(1);

  const previewUrls = await signScenePreviews(supabase, scenes);

  return {
    sourceVideoJobId: job.id,
    contentItemId,
    scenes: scenes.map((scene, index) => ({
      id: scene.id,
      sceneNumber: index + 1,
      image_prompt: scene.image_prompt,
      image_bucket: scene.image_bucket,
      image_path: scene.image_path,
      duration_seconds: scene.duration_seconds,
      previewUrl: previewUrls.get(`${scene.image_bucket}\n${scene.image_path}`) ?? null,
    })),
    hasDraftChanges,
    activeRenderInFlight: (activeRows ?? []).length > 0,
  };
}

async function signScenePreviews(
  supabase: SupabaseClient,
  scenes: SceneEditorDraftScene[],
): Promise<Map<string, string>> {
  const ttl = 60 * 60;
  const result = new Map<string, string>();
  for (const scene of scenes) {
    const key = `${scene.image_bucket}\n${scene.image_path}`;
    if (result.has(key)) continue;
    const { data, error } = await supabase.storage
      .from(scene.image_bucket)
      .createSignedUrl(scene.image_path, ttl);
    if (!error && data?.signedUrl) {
      result.set(key, data.signedUrl);
    }
  }
  return result;
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

export async function uploadSceneReplacementImage(
  input: {
    projectId: string;
    videoJobId: string;
    sceneId: string;
    file: File;
  },
  deps: VideoSceneEditorDeps = {},
): Promise<VideoSceneEditorState> {
  const validationError = validateSceneImageUpload({
    type: input.file.type,
    size: input.file.size,
  });
  if (validationError) {
    throw new WorkflowError("invalid_input", validationError);
  }

  const supabase = deps.client ?? createSupabaseAdminClient();
  const job = await loadSourceJob(supabase, input.projectId, input.videoJobId);
  if (job.status !== "completed") {
    throw new WorkflowError("invalid_input", "only completed videos can be edited");
  }
  const contentItemId = job.content_item_id;
  if (!contentItemId) {
    throw new WorkflowError("invalid_input", "video job has no content item");
  }
  await assertContentItemInProject(supabase, contentItemId, input.projectId);
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

  const scenes = await loadBaselineScenes(supabase, {
    projectId: input.projectId,
    contentItemId,
    sourceVideoJobId: job.id,
    generationMetadata: itemRow.generation_metadata as Json | null,
    jobOutput: job.output,
  });
  const index = scenes.findIndex((s) => s.id === input.sceneId);
  if (index < 0) {
    throw new WorkflowError("not_found", `scene ${input.sceneId} not found`);
  }

  const ext =
    input.file.type === "image/png"
      ? "png"
      : input.file.type === "image/jpeg" || input.file.type === "image/jpg"
        ? "jpg"
        : "bin";
  const storagePath = buildVideoRenderPath(
    input.projectId,
    job.id,
    `scene-editor-${input.sceneId}-${Date.now()}.${ext}`,
  );

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.videoRenders)
    .upload(storagePath, input.file, {
      contentType: input.file.type || undefined,
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const updated = [...scenes];
  updated[index] = {
    ...updated[index],
    image_bucket: STORAGE_BUCKETS.videoRenders,
    image_path: storagePath,
  };

  await persistDraft(supabase, {
    projectId: input.projectId,
    contentItemId,
    sourceVideoJobId: job.id,
    scenes: updated,
    generationMetadata: itemRow.generation_metadata as Json | null,
  });

  return loadVideoSceneEditorState(
    { projectId: input.projectId, videoJobId: input.videoJobId },
    deps,
  );
}

export async function regenerateSceneImageInEditor(
  input: {
    projectId: string;
    videoJobId: string;
    sceneId: string;
    instruction: string;
  },
  deps: VideoSceneEditorDeps = {},
): Promise<VideoSceneEditorState> {
  const instruction = input.instruction.trim();
  if (!instruction) {
    throw new WorkflowError("invalid_input", "instruction is required");
  }

  const supabase = deps.client ?? createSupabaseAdminClient();
  const job = await loadSourceJob(supabase, input.projectId, input.videoJobId);
  if (job.status !== "completed") {
    throw new WorkflowError("invalid_input", "only completed videos can be edited");
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

  const scenes = await loadBaselineScenes(supabase, {
    projectId: input.projectId,
    contentItemId,
    sourceVideoJobId: job.id,
    generationMetadata: itemRow.generation_metadata as Json | null,
    jobOutput: job.output,
  });
  const index = scenes.findIndex((s) => s.id === input.sceneId);
  if (index < 0) {
    throw new WorkflowError("not_found", `scene ${input.sceneId} not found`);
  }

  const target = scenes[index];
  const generated = await regenerateSceneImageViaWorker({
    project_id: input.projectId,
    source_video_job_id: job.id,
    scene_id: input.sceneId,
    image_prompt: target.image_prompt,
    instruction,
  });

  const updated = [...scenes];
  updated[index] = {
    ...target,
    image_bucket: generated.image_bucket,
    image_path: generated.image_path,
  };

  await persistDraft(supabase, {
    projectId: input.projectId,
    contentItemId,
    sourceVideoJobId: job.id,
    scenes: updated,
    generationMetadata: itemRow.generation_metadata as Json | null,
  });

  return loadVideoSceneEditorState(
    { projectId: input.projectId, videoJobId: input.videoJobId },
    deps,
  );
}

export type { SceneEditorRerenderSummary, SceneEditorRerenderDeps };

export async function runSceneEditorRerender(
  input: { projectId: string; videoJobId: string },
  deps: SceneEditorRerenderDeps = {},
): Promise<SceneEditorRerenderSummary> {
  try {
    return await runSceneEditorRerenderCore(input, deps);
  } catch (err) {
    if (err instanceof SceneEditorRerenderError) {
      throw new WorkflowError(err.code, err.message);
    }
    throw err;
  }
}

export async function videoJobHasEditableScenes(
  supabase: SupabaseClient,
  projectId: string,
  videoJobId: string,
): Promise<boolean> {
  try {
    const job = await loadSourceJob(supabase, projectId, videoJobId);
    if (job.status !== "completed" || !job.content_item_id) return false;
    return extractRenderSpecScenes(job.output) !== null;
  } catch {
    return false;
  }
}
