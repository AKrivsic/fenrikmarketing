import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkflowErrorCode } from "@/lib/ai/workflows/shared";
import { claimAndDispatchVariantVideoJob } from "@/lib/ai/workflows/dispatchVariantVideoJob";
import { extractRenderSpecScenes } from "@/lib/ai/workflows/languageVariantsHelpers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";
import {
  startVideoWorkerJob,
  type VideoWorkerJobPayload,
} from "@/lib/video-worker/client";
import {
  readSceneEditorDraft,
  type SceneEditorDraftScene,
} from "@/lib/video-scene-editor/metadata";
import { hasSceneEditorRerenderChanges } from "@/lib/video-scene-editor/sceneEditorChanges";
import {
  baselineVoiceoverForEditor,
  readSourceVoiceoverText,
  resolveDraftVoiceoverText,
} from "@/lib/video-scene-editor/voiceoverDraft";

// Scene-editor re-render orchestration. Kept free of WorkflowError (parameter
// properties) so Node strip-only check scripts can import and mock-test it.

export class SceneEditorRerenderError extends Error {
  readonly code: WorkflowErrorCode;

  constructor(code: WorkflowErrorCode, message: string) {
    super(message);
    this.name = "SceneEditorRerenderError";
    this.code = code;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

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
      throw new SceneEditorRerenderError(
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

function draftScenesToInputScenes(
  scenes: SceneEditorDraftScene[],
): Record<string, unknown>[] {
  return scenes.map((scene) => ({
    id: scene.id,
    image_prompt: scene.image_prompt,
    duration_seconds: scene.duration_seconds,
    image_bucket: scene.image_bucket,
    image_path: scene.image_path,
  }));
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
    throw new SceneEditorRerenderError(
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

async function loadBaselineScenes(args: {
  sourceVideoJobId: string;
  generationMetadata: Json | null;
  jobOutput: unknown;
}): Promise<SceneEditorDraftScene[]> {
  const draft = readSceneEditorDraft(args.generationMetadata);
  if (draft && draft.source_video_job_id === args.sourceVideoJobId) {
    return draft.scenes;
  }

  const fromOutput = extractRenderSpecScenes(args.jobOutput);
  if (!fromOutput) {
    throw new SceneEditorRerenderError(
      "invalid_input",
      "this video has no reusable render_spec scenes for editing",
    );
  }
  return scenesToDraftScenes(fromOutput);
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
    throw new SceneEditorRerenderError(
      "invalid_input",
      "a video render is already queued or processing for this item",
    );
  }
}

export interface SceneEditorRerenderSummary {
  videoJobId: string;
  dispatched: boolean;
  warnings: string[];
}

export interface SceneEditorRerenderDeps {
  client?: SupabaseClient;
  videoCallbackUrl?: string;
  startVideoJob?: (payload: VideoWorkerJobPayload) => Promise<void>;
}

export async function runSceneEditorRerender(
  input: { projectId: string; videoJobId: string },
  deps: SceneEditorRerenderDeps = {},
): Promise<SceneEditorRerenderSummary> {
  const supabase = deps.client ?? createSupabaseAdminClient();
  const startVideoJob = deps.startVideoJob ?? startVideoWorkerJob;
  const warnings: string[] = [];

  const job = await loadSourceJob(supabase, input.projectId, input.videoJobId);
  if (job.status !== "completed") {
    throw new SceneEditorRerenderError(
      "invalid_input",
      "re-render requires a completed source video",
    );
  }
  const contentItemId = job.content_item_id;
  if (!contentItemId) {
    throw new SceneEditorRerenderError(
      "invalid_input",
      "video job has no content item",
    );
  }

  const { data: itemRow, error: itemErr } = await supabase
    .from("content_items")
    .select("id, package_id, generation_metadata")
    .eq("id", contentItemId)
    .eq("project_id", input.projectId)
    .maybeSingle();
  if (itemErr) throw itemErr;
  if (!itemRow) {
    throw new SceneEditorRerenderError(
      "not_found",
      `content item ${contentItemId} not found`,
    );
  }
  const packageId = itemRow.package_id as string | null;

  await assertNoActiveRender(supabase, input.projectId, contentItemId);

  const generationMetadata = itemRow.generation_metadata as Json | null;
  const draft = readSceneEditorDraft(generationMetadata);

  const scenes = await loadBaselineScenes({
    sourceVideoJobId: job.id,
    generationMetadata,
    jobOutput: job.output,
  });

  const baselineFromOutput = extractRenderSpecScenes(job.output);
  const baselineVoiceover = baselineVoiceoverForEditor({
    draft,
    sourceVideoJobId: job.id,
    sourceJobInput: job.input,
  });
  const hasChanges = hasSceneEditorRerenderChanges({
    scenes,
    baselineFromOutput,
    draft,
    sourceVideoJobId: job.id,
    baselineVoiceover,
  });
  if (!hasChanges) {
    throw new SceneEditorRerenderError(
      "invalid_input",
      "no changes to re-render; edit voiceover or a scene first",
    );
  }

  const baseInput = asRecord(job.input) ?? {};
  const resolvedVoiceover = resolveDraftVoiceoverText({
    draft,
    sourceVideoJobId: job.id,
    sourceJobInput: job.input,
  });
  const jobInput = {
    ...baseInput,
    scenes: draftScenesToInputScenes(scenes),
    voiceover_text:
      resolvedVoiceover.length > 0
        ? resolvedVoiceover
        : readSourceVoiceoverText(job.input),
    scene_editor_rerender: true,
    scene_editor_source_video_job_id: job.id,
  } as unknown as Json;

  const { data: insertedRow, error: insertErr } = await supabase
    .from("video_jobs")
    .insert({
      project_id: input.projectId,
      content_item_id: contentItemId,
      provider: job.provider ?? "video_engine",
      status: "queued",
      input: jobInput,
    })
    .select("id")
    .single();
  if (insertErr) throw insertErr;
  const newVideoJobId = insertedRow.id as string;

  if (!packageId) {
    warnings.push(
      `content item ${contentItemId} has no package; job ${newVideoJobId} left queued`,
    );
    return { videoJobId: newVideoJobId, dispatched: false, warnings };
  }

  if (!deps.videoCallbackUrl) {
    warnings.push(`job ${newVideoJobId} left queued (no callback url)`);
    return { videoJobId: newVideoJobId, dispatched: false, warnings };
  }

  const dispatch = await claimAndDispatchVariantVideoJob(supabase, {
    videoJobId: newVideoJobId,
    projectId: input.projectId,
    contentPackageId: packageId,
    contentItemId,
    callbackUrl: deps.videoCallbackUrl,
    input: jobInput as Record<string, unknown>,
    startVideoJob,
  });
  if (dispatch.warning) warnings.push(dispatch.warning);

  return {
    videoJobId: newVideoJobId,
    dispatched: dispatch.dispatched,
    warnings,
  };
}
