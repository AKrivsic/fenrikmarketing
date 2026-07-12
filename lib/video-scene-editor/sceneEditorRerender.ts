import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkflowErrorCode } from "@/lib/ai/workflows/shared";
import { claimAndDispatchVariantVideoJob } from "@/lib/ai/workflows/dispatchVariantVideoJob";
import { extractRenderSpecScenes } from "@/lib/ai/workflows/languageVariantsHelpers";
import { resolvePackageAssetImages } from "@/lib/ai/workflows/packageShared";
import { attachTtsToVideoJobInput } from "@/lib/voice/videoJobTtsInput";
import { applySemanticMotionPreservationFromSourceJob } from "@/lib/video-engine/semanticMotion/storedSemanticMotionJobInput";
import {
  readVideoAssetWorkflow,
  workflowToRenderAssetMode,
} from "@/lib/video-scene-editor/videoWorkflowMetadata";
import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
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
  refreshDraftScenesVideoUsage,
  type AssetRowForVideoUsage,
} from "@/lib/video-scene-editor/resolveDraftSceneVideoUsage";
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
      ...(typeof scene.video_usage === "string" && scene.video_usage.trim().length > 0
        ? { video_usage: scene.video_usage.trim() }
        : {}),
      ...(typeof scene.asset_id === "string" && scene.asset_id.trim().length > 0
        ? { asset_id: scene.asset_id.trim() }
        : {}),
      ...(typeof scene.type === "string" && scene.type.trim().length > 0
        ? { type: scene.type.trim() }
        : {}),
      ...(scene.payload_snapshot &&
      typeof scene.payload_snapshot === "object" &&
      !Array.isArray(scene.payload_snapshot)
        ? { payload_snapshot: scene.payload_snapshot as Record<string, unknown> }
        : {}),
      ...(typeof scene.renderer_version === "string" &&
      scene.renderer_version.trim().length > 0
        ? { renderer_version: scene.renderer_version.trim() }
        : {}),
      ...(scene.video_usage_locked === true ? { video_usage_locked: true } : {}),
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
    ...(scene.video_usage ? { video_usage: scene.video_usage } : {}),
    ...(scene.asset_id ? { asset_id: scene.asset_id } : {}),
    ...(scene.video_usage_locked ? { video_usage_locked: true } : {}),
    ...(scene.type ? { type: scene.type } : {}),
    ...(scene.payload_snapshot
      ? { payload_snapshot: scene.payload_snapshot }
      : {}),
    ...(scene.renderer_version
      ? { renderer_version: scene.renderer_version }
      : {}),
  }));
}

async function loadAssetMetadataForDraftScenes(
  supabase: SupabaseClient,
  projectId: string,
  scenes: SceneEditorDraftScene[],
): Promise<Map<string, AssetRowForVideoUsage>> {
  const ids = Array.from(
    new Set(scenes.map((s) => s.asset_id).filter((id): id is string => Boolean(id))),
  );
  const map = new Map<string, AssetRowForVideoUsage>();
  if (ids.length === 0) return map;

  const { data, error } = await supabase
    .from("assets")
    .select("id, title, metadata")
    .eq("project_id", projectId)
    .in("id", ids);
  if (error) throw error;
  for (const row of data ?? []) {
    map.set(row.id as string, {
      id: row.id as string,
      title: (row.title as string) ?? null,
      metadata: (row.metadata as Json) ?? {},
    });
  }
  return map;
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

export type SceneEditorRenderAssetMode =
  | "ai_only"
  | "asset_enabled"
  | "manual_assets";

function parsePackageAssetUsage(brief: unknown): ContentPackageOutput["asset_usage"] {
  if (!brief || typeof brief !== "object" || Array.isArray(brief)) return [];
  const raw = (brief as Record<string, unknown>).asset_usage;
  if (!Array.isArray(raw)) return [];
  const usage: NonNullable<ContentPackageOutput["asset_usage"]> = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const record = entry as Record<string, unknown>;
    const asset_id = typeof record.asset_id === "string" ? record.asset_id : "";
    const used_as = typeof record.used_as === "string" ? record.used_as : "";
    if (!asset_id || !used_as) continue;
    usage.push({
      asset_id,
      used_as,
      modify: typeof record.modify === "string" ? record.modify : undefined,
    });
  }
  return usage;
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
  input: {
    projectId: string;
    videoJobId: string;
    renderAssetMode?: SceneEditorRenderAssetMode;
    selectedAssetIds?: string[];
  },
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
  const workflow = readVideoAssetWorkflow(generationMetadata);
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
  const assetsById = await loadAssetMetadataForDraftScenes(
    supabase,
    input.projectId,
    scenes,
  );
  const scenesForRender = refreshDraftScenesVideoUsage(scenes, assetsById);
  let jobInput = {
    ...baseInput,
    scenes: draftScenesToInputScenes(scenesForRender),
    voiceover_text:
      resolvedVoiceover.length > 0
        ? resolvedVoiceover
        : readSourceVoiceoverText(job.input),
    scene_editor_rerender: true,
    scene_editor_source_video_job_id: job.id,
    explicit_scene_plan: true,
    asset_images: [],
  } as Record<string, unknown>;

  const renderAssetMode =
    input.renderAssetMode ?? workflowToRenderAssetMode(workflow);
  if (renderAssetMode === "ai_only") {
    jobInput = { ...jobInput, asset_images: [] };
  } else if (renderAssetMode === "asset_enabled" && packageId) {
    const { data: pkgRow, error: pkgLoadErr } = await supabase
      .from("content_packages")
      .select("package_brief")
      .eq("id", packageId)
      .eq("project_id", input.projectId)
      .maybeSingle();
    if (pkgLoadErr) throw pkgLoadErr;
    const assetImages = await resolvePackageAssetImages(
      supabase,
      input.projectId,
      parsePackageAssetUsage(pkgRow?.package_brief),
    );
    jobInput = { ...jobInput, asset_images: assetImages };
  } else if (renderAssetMode === "manual_assets") {
    const ids = (
      input.selectedAssetIds ??
      workflow.manual_asset_ids ??
      []
    ).filter(Boolean);
    if (ids.length === 0) {
      throw new SceneEditorRerenderError(
        "invalid_input",
        "selected assets mode requires at least one asset",
      );
    }
    const assetUsage: NonNullable<ContentPackageOutput["asset_usage"]> = ids.map(
      (asset_id) => ({
        asset_id,
        used_as: "selected asset",
        modify: "false",
      }),
    );
    const assetImages = await resolvePackageAssetImages(
      supabase,
      input.projectId,
      assetUsage,
    );
    if (assetImages.length === 0) {
      throw new SceneEditorRerenderError(
        "invalid_input",
        "none of the selected assets could be resolved as images",
      );
    }
    jobInput = { ...jobInput, asset_images: assetImages };
  }

  jobInput = await attachTtsToVideoJobInput(
    supabase,
    input.projectId,
    applySemanticMotionPreservationFromSourceJob({
      jobInput,
      sourceJobOutput: job.output,
    }),
    baseInput,
  );

  const jobInputJson = jobInput as unknown as Json;

  const { data: insertedRow, error: insertErr } = await supabase
    .from("video_jobs")
    .insert({
      project_id: input.projectId,
      content_item_id: contentItemId,
      provider: job.provider ?? "video_engine",
      status: "queued",
      input: jobInputJson,
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
    input: jobInput,
    startVideoJob,
  });
  if (dispatch.warning) warnings.push(dispatch.warning);

  return {
    videoJobId: newVideoJobId,
    dispatched: dispatch.dispatched,
    warnings,
  };
}
