import type { SupabaseClient } from "@supabase/supabase-js";
import { assertContentItemInProject } from "@/lib/api/guards";
import { STORAGE_BUCKETS, buildVideoRenderPath } from "@/lib/api/storage";
import { extractRenderSpecScenes } from "@/lib/ai/workflows/languageVariantsHelpers";
import { WorkflowError } from "@/lib/ai/workflows/shared";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";
import { regenerateSceneImageViaWorker } from "@/lib/video-worker/regenerateSceneImageClient";
import { editSceneImageViaWorker } from "@/lib/video-worker/editSceneImageClient";
import { insertSceneBrandAssetViaWorker } from "@/lib/video-worker/insertSceneBrandAssetClient";
import { applySceneImageWorkerResult } from "@/lib/video-scene-editor/applySceneImageWorkerResult";
import { buildSceneEditorBrandAssetPath } from "@/lib/video-scene-editor/brandAssetStorage";
import { validateBrandAssetUpload } from "@/lib/video-scene-editor/validateBrandAssetUpload";
import {
  runSceneEditorRerender as runSceneEditorRerenderCore,
  SceneEditorRerenderError,
  type SceneEditorRerenderDeps,
  type SceneEditorRerenderSummary,
} from "@/lib/video-scene-editor/sceneEditorRerender";
import {
  mergeSceneEditorDraft,
  readSceneEditorDraft,
  type SceneEditorDraftScene,
} from "@/lib/video-scene-editor/metadata";
import {
  mergeBrandAssetInsertInstruction,
  resolveBrandAssetInsertInstructionOrDefault,
} from "@/lib/video-scene-editor/brandAssetInstruction";
import { buildSceneEditorDraft } from "@/lib/video-scene-editor/draftEnvelope";
import { sceneDraftsEqual } from "@/lib/video-scene-editor/sceneDraftCompare";
import {
  baselineVoiceoverForEditor,
  readSourceVoiceoverText,
  resolveDraftVoiceoverText,
  voiceoverTextChangedInDraft,
} from "@/lib/video-scene-editor/voiceoverDraft";
import {
  appendSceneImageVersion,
  findSceneImageVersion,
  originalSceneImageVersion,
  sceneVersionFromDraftScene,
  sceneVersionFromBrandAssetEdit,
  seedSceneImageHistory,
  type SceneImageVersion,
} from "@/lib/video-scene-editor/imageHistory";
import { validateSceneImageUpload } from "@/lib/video-scene-editor/validateUpload";
import { saveEditorVoiceoverText } from "@/lib/video-scene-editor/saveEditorVoiceover";

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
    baselineScenes: SceneEditorDraftScene[];
    baselineVoiceoverText: string;
    imageVersions?: Record<string, SceneImageVersion[]>;
    voiceoverText?: string;
    brandAssetInsertInstructions?: Record<string, string>;
  },
): Promise<void> {
  const existing = readSceneEditorDraft(args.generationMetadata);
  const draft = buildSceneEditorDraft({
    sourceVideoJobId: args.sourceVideoJobId,
    scenes: args.scenes,
    existing,
    baselineScenes: args.baselineScenes,
    baselineVoiceoverText: args.baselineVoiceoverText,
  });
  if (args.imageVersions) {
    draft.image_versions = args.imageVersions;
  }
  if (args.voiceoverText !== undefined) {
    draft.voiceover_text = args.voiceoverText.trim();
  }
  if (args.brandAssetInsertInstructions) {
    draft.brand_asset_insert_instructions = args.brandAssetInsertInstructions;
  }
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

export interface SceneImageVersionView {
  versionId: string;
  source: SceneImageVersion["source"];
  createdAt: string;
  isOriginal: boolean;
  image_prompt: string;
  image_bucket: string;
  image_path: string;
  previewUrl: string | null;
}

export interface VideoSceneEditorSceneView {
  id: string;
  sceneNumber: number;
  image_prompt: string;
  image_bucket: string;
  image_path: string;
  duration_seconds: number;
  previewUrl: string | null;
  imageVersions: SceneImageVersionView[];
  originalVersionId: string | null;
  originalPreviewUrl: string | null;
  brandAssetInsertInstruction: string;
}

export interface VideoSceneEditorState {
  sourceVideoJobId: string;
  contentItemId: string;
  voiceoverText: string;
  baselineVoiceoverText: string;
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
  const baselineVoiceoverText = baselineVoiceoverForEditor({
    draft,
    sourceVideoJobId: job.id,
    sourceJobInput: job.input,
  });
  const voiceoverText = resolveDraftVoiceoverText({
    draft,
    sourceVideoJobId: job.id,
    sourceJobInput: job.input,
  });
  const sceneVisualChanges =
    draft !== null &&
    draft.source_video_job_id === job.id &&
    baselineScenes !== null &&
    !sceneDraftsEqual(draft.scenes, baselineScenes);
  const voiceoverChanges = voiceoverTextChangedInDraft({
    draft,
    sourceVideoJobId: job.id,
    baselineVoiceover: baselineVoiceoverText,
  });
  const hasDraftChanges = sceneVisualChanges || voiceoverChanges;

  const { data: activeRows } = await supabase
    .from("video_jobs")
    .select("id")
    .eq("project_id", input.projectId)
    .eq("content_item_id", contentItemId)
    .in("status", ["queued", "processing"])
    .limit(1);

  const previewUrls = await signScenePreviews(supabase, scenes);

  const envelope = buildSceneEditorDraft({
    sourceVideoJobId: job.id,
    scenes,
    existing: draft,
    baselineScenes: baselineScenes ?? scenes,
    baselineVoiceoverText: readSourceVoiceoverText(job.input),
  });

  const versionPreviewUrls = await signScenePreviews(
    supabase,
    envelope.image_versions
      ? Object.values(envelope.image_versions)
          .flat()
          .map((version) => ({
            id: version.version_id,
            image_prompt: version.image_prompt,
            image_bucket: version.image_bucket,
            image_path: version.image_path,
            duration_seconds: 1,
          }))
      : [],
  );

  return {
    sourceVideoJobId: job.id,
    contentItemId,
    voiceoverText,
    baselineVoiceoverText,
    scenes: scenes.map((scene, index) => {
      const versions = envelope.image_versions[scene.id] ?? [];
      const original = originalSceneImageVersion(envelope.image_versions, scene.id);
      return {
        id: scene.id,
        sceneNumber: index + 1,
        image_prompt: scene.image_prompt,
        image_bucket: scene.image_bucket,
        image_path: scene.image_path,
        duration_seconds: scene.duration_seconds,
        previewUrl: previewUrls.get(`${scene.image_bucket}\n${scene.image_path}`) ?? null,
        imageVersions: versions.map((version) => ({
          versionId: version.version_id,
          source: version.source,
          createdAt: version.created_at,
          isOriginal: version.is_original,
          image_prompt: version.image_prompt,
          image_bucket: version.image_bucket,
          image_path: version.image_path,
          previewUrl:
            versionPreviewUrls.get(
              `${version.image_bucket}\n${version.image_path}`,
            ) ?? null,
        })),
        originalVersionId: original?.version_id ?? null,
        originalPreviewUrl: original
          ? (versionPreviewUrls.get(
              `${original.image_bucket}\n${original.image_path}`,
            ) ?? null)
          : null,
        brandAssetInsertInstruction: resolveBrandAssetInsertInstructionOrDefault(
          envelope,
          scene.id,
        ),
      };
    }),
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
  const baselineFromOutput = extractRenderSpecScenes(job.output);
  if (!baselineFromOutput) {
    throw new WorkflowError("invalid_input", "missing render_spec baseline");
  }
  const baselineScenes = scenesToDraftScenes(baselineFromOutput);
  const existingDraft = readSceneEditorDraft(
    itemRow.generation_metadata as Json | null,
  );
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

  const historyBase =
    existingDraft?.image_versions ?? seedSceneImageHistory(baselineScenes);
  const imageVersions = appendSceneImageVersion(
    historyBase,
    input.sceneId,
    sceneVersionFromDraftScene(updated[index], "upload"),
  );

  await persistDraft(supabase, {
    projectId: input.projectId,
    contentItemId,
    sourceVideoJobId: job.id,
    scenes: updated,
    generationMetadata: itemRow.generation_metadata as Json | null,
    baselineScenes,
    baselineVoiceoverText: readSourceVoiceoverText(job.input),
    imageVersions,
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
  const baselineFromOutput = extractRenderSpecScenes(job.output);
  if (!baselineFromOutput) {
    throw new WorkflowError("invalid_input", "missing render_spec baseline");
  }
  const baselineScenes = scenesToDraftScenes(baselineFromOutput);
  const existingDraft = readSceneEditorDraft(
    itemRow.generation_metadata as Json | null,
  );
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

  const historyBase =
    existingDraft?.image_versions ?? seedSceneImageHistory(baselineScenes);
  const applied = applySceneImageWorkerResult({
    scenes,
    sceneId: input.sceneId,
    image_bucket: generated.image_bucket,
    image_path: generated.image_path,
    source: "regenerate",
    imageVersions: historyBase,
  });

  await persistDraft(supabase, {
    projectId: input.projectId,
    contentItemId,
    sourceVideoJobId: job.id,
    scenes: applied.scenes,
    generationMetadata: itemRow.generation_metadata as Json | null,
    baselineScenes,
    baselineVoiceoverText: readSourceVoiceoverText(job.input),
    imageVersions: applied.imageVersions,
  });

  return loadVideoSceneEditorState(
    { projectId: input.projectId, videoJobId: input.videoJobId },
    deps,
  );
}

export async function editSceneImageInEditor(
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
  const baselineFromOutput = extractRenderSpecScenes(job.output);
  if (!baselineFromOutput) {
    throw new WorkflowError("invalid_input", "missing render_spec baseline");
  }
  const baselineScenes = scenesToDraftScenes(baselineFromOutput);
  const existingDraft = readSceneEditorDraft(
    itemRow.generation_metadata as Json | null,
  );
  const index = scenes.findIndex((s) => s.id === input.sceneId);
  if (index < 0) {
    throw new WorkflowError("not_found", `scene ${input.sceneId} not found`);
  }

  const target = scenes[index]!;
  const edited = await editSceneImageViaWorker({
    project_id: input.projectId,
    source_video_job_id: job.id,
    scene_id: input.sceneId,
    image_bucket: target.image_bucket,
    image_path: target.image_path,
    instruction,
  });

  const historyBase =
    existingDraft?.image_versions ?? seedSceneImageHistory(baselineScenes);
  const applied = applySceneImageWorkerResult({
    scenes,
    sceneId: input.sceneId,
    image_bucket: edited.image_bucket,
    image_path: edited.image_path,
    source: "image_edit",
    imageVersions: historyBase,
  });

  await persistDraft(supabase, {
    projectId: input.projectId,
    contentItemId,
    sourceVideoJobId: job.id,
    scenes: applied.scenes,
    generationMetadata: itemRow.generation_metadata as Json | null,
    baselineScenes,
    baselineVoiceoverText: readSourceVoiceoverText(job.input),
    imageVersions: applied.imageVersions,
  });

  return loadVideoSceneEditorState(
    { projectId: input.projectId, videoJobId: input.videoJobId },
    deps,
  );
}

export async function insertBrandAssetInEditor(
  input: {
    projectId: string;
    videoJobId: string;
    sceneId: string;
    file: File;
    instruction: string;
  },
  deps: VideoSceneEditorDeps = {},
): Promise<VideoSceneEditorState> {
  const validationError = validateBrandAssetUpload({
    type: input.file.type,
    size: input.file.size,
  });
  if (validationError) {
    throw new WorkflowError("invalid_input", validationError);
  }

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
  const baselineFromOutput = extractRenderSpecScenes(job.output);
  if (!baselineFromOutput) {
    throw new WorkflowError("invalid_input", "missing render_spec baseline");
  }
  const baselineScenes = scenesToDraftScenes(baselineFromOutput);
  const existingDraft = readSceneEditorDraft(
    itemRow.generation_metadata as Json | null,
  );
  const index = scenes.findIndex((s) => s.id === input.sceneId);
  if (index < 0) {
    throw new WorkflowError("not_found", `scene ${input.sceneId} not found`);
  }

  const target = scenes[index]!;
  const ext =
    input.file.type === "image/png"
      ? "png"
      : input.file.type === "image/jpeg" || input.file.type === "image/jpg"
        ? "jpg"
        : "bin";
  const assetStoragePath = buildSceneEditorBrandAssetPath(
    input.projectId,
    job.id,
    `brand-${input.sceneId}-${Date.now()}.${ext}`,
  );

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.projectAssets)
    .upload(assetStoragePath, input.file, {
      contentType: input.file.type || undefined,
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const workerResult = await insertSceneBrandAssetViaWorker({
    project_id: input.projectId,
    source_video_job_id: job.id,
    scene_id: input.sceneId,
    scene_image_bucket: target.image_bucket,
    scene_image_path: target.image_path,
    asset_bucket: STORAGE_BUCKETS.projectAssets,
    asset_path: assetStoragePath,
    instruction,
  });

  const historyBase =
    existingDraft?.image_versions ?? seedSceneImageHistory(baselineScenes);
  const applied = applySceneImageWorkerResult({
    scenes,
    sceneId: input.sceneId,
    image_bucket: workerResult.image_bucket,
    image_path: workerResult.image_path,
    source: "brand_asset_edit",
    imageVersions: historyBase,
    version: sceneVersionFromBrandAssetEdit({
      scene: {
        ...target,
        image_bucket: workerResult.image_bucket,
        image_path: workerResult.image_path,
      },
      instruction,
      reference_asset_bucket: STORAGE_BUCKETS.projectAssets,
      reference_asset_path: assetStoragePath,
      edit_provider: workerResult.provider,
      edit_model: workerResult.model,
    }),
  });

  await persistDraft(supabase, {
    projectId: input.projectId,
    contentItemId,
    sourceVideoJobId: job.id,
    scenes: applied.scenes,
    generationMetadata: itemRow.generation_metadata as Json | null,
    baselineScenes,
    baselineVoiceoverText: readSourceVoiceoverText(job.input),
    imageVersions: applied.imageVersions,
    brandAssetInsertInstructions: mergeBrandAssetInsertInstruction(
      existingDraft?.brand_asset_insert_instructions,
      input.sceneId,
      instruction,
    ),
  });

  return loadVideoSceneEditorState(
    { projectId: input.projectId, videoJobId: input.videoJobId },
    deps,
  );
}

export async function updateSceneImagePromptInEditor(
  input: {
    projectId: string;
    videoJobId: string;
    sceneId: string;
    imagePrompt: string;
  },
  deps: VideoSceneEditorDeps = {},
): Promise<VideoSceneEditorState> {
  const imagePrompt = input.imagePrompt.trim();
  if (!imagePrompt) {
    throw new WorkflowError("invalid_input", "image prompt is required");
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
  const baselineFromOutput = extractRenderSpecScenes(job.output);
  if (!baselineFromOutput) {
    throw new WorkflowError("invalid_input", "missing render_spec baseline");
  }
  const baselineScenes = scenesToDraftScenes(baselineFromOutput);
  const existingDraft = readSceneEditorDraft(
    itemRow.generation_metadata as Json | null,
  );
  const index = scenes.findIndex((s) => s.id === input.sceneId);
  if (index < 0) {
    throw new WorkflowError("not_found", `scene ${input.sceneId} not found`);
  }

  const updated = [...scenes];
  updated[index] = { ...updated[index], image_prompt: imagePrompt };

  const historyBase =
    existingDraft?.image_versions ?? seedSceneImageHistory(baselineScenes);
  const imageVersions = appendSceneImageVersion(
    historyBase,
    input.sceneId,
    sceneVersionFromDraftScene(updated[index], "prompt_edit"),
  );

  await persistDraft(supabase, {
    projectId: input.projectId,
    contentItemId,
    sourceVideoJobId: job.id,
    scenes: updated,
    generationMetadata: itemRow.generation_metadata as Json | null,
    baselineScenes,
    baselineVoiceoverText: readSourceVoiceoverText(job.input),
    imageVersions,
  });

  return loadVideoSceneEditorState(
    { projectId: input.projectId, videoJobId: input.videoJobId },
    deps,
  );
}

export async function restoreSceneImageVersionInEditor(
  input: {
    projectId: string;
    videoJobId: string;
    sceneId: string;
    versionId: string;
  },
  deps: VideoSceneEditorDeps = {},
): Promise<VideoSceneEditorState> {
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
  const baselineFromOutput = extractRenderSpecScenes(job.output);
  if (!baselineFromOutput) {
    throw new WorkflowError("invalid_input", "missing render_spec baseline");
  }
  const baselineScenes = scenesToDraftScenes(baselineFromOutput);
  const existingDraft = readSceneEditorDraft(
    itemRow.generation_metadata as Json | null,
  );
  const envelope = buildSceneEditorDraft({
    sourceVideoJobId: job.id,
    scenes,
    existing: existingDraft,
    baselineScenes,
    baselineVoiceoverText: readSourceVoiceoverText(job.input),
  });
  const version = findSceneImageVersion(
    envelope.image_versions,
    input.sceneId,
    input.versionId,
  );
  if (!version) {
    throw new WorkflowError("not_found", "image version not found");
  }

  const index = scenes.findIndex((s) => s.id === input.sceneId);
  if (index < 0) {
    throw new WorkflowError("not_found", `scene ${input.sceneId} not found`);
  }

  const updated = [...scenes];
  updated[index] = {
    ...updated[index],
    image_bucket: version.image_bucket,
    image_path: version.image_path,
    image_prompt: version.image_prompt,
  };

  const imageVersions = appendSceneImageVersion(
    envelope.image_versions,
    input.sceneId,
    sceneVersionFromDraftScene(updated[index], "restore"),
  );

  await persistDraft(supabase, {
    projectId: input.projectId,
    contentItemId,
    sourceVideoJobId: job.id,
    scenes: updated,
    generationMetadata: itemRow.generation_metadata as Json | null,
    baselineScenes,
    baselineVoiceoverText: readSourceVoiceoverText(job.input),
    imageVersions,
  });

  return loadVideoSceneEditorState(
    { projectId: input.projectId, videoJobId: input.videoJobId },
    deps,
  );
}

export async function updateSceneEditorVoiceoverText(
  input: {
    projectId: string;
    videoJobId: string;
    voiceoverText: string;
  },
  deps: VideoSceneEditorDeps = {},
): Promise<VideoSceneEditorState> {
  const voiceoverText = input.voiceoverText.trim();
  if (!voiceoverText) {
    throw new WorkflowError("invalid_input", "voiceover text is required");
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

  let mergedMetadata: Json;
  try {
    mergedMetadata = await saveEditorVoiceoverText({
      supabase,
      projectId: input.projectId,
      contentItemId,
      sourceVideoJobId: job.id,
      generationMetadata: itemRow.generation_metadata as Json | null,
      jobInput: job.input,
      jobOutput: job.output,
      voiceoverText,
    });
  } catch (err) {
    if (err instanceof Error) {
      throw new WorkflowError("invalid_input", err.message);
    }
    throw err;
  }

  const { error: updateErr } = await supabase
    .from("content_items")
    .update({ generation_metadata: mergedMetadata })
    .eq("id", contentItemId)
    .eq("project_id", input.projectId);
  if (updateErr) throw updateErr;

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
