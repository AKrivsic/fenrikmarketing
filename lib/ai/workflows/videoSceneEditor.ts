import type { SupabaseClient } from "@supabase/supabase-js";
import { assertAssetInProject, assertContentItemInProject } from "@/lib/api/guards";
import { STORAGE_BUCKETS, buildVideoRenderPath } from "@/lib/api/storage";
import { extractRenderSpecScenes } from "@/lib/ai/workflows/languageVariantsHelpers";
import { WorkflowError } from "@/lib/ai/workflows/shared";
import {
  resolvePreferredVideoUsageFromMetadata,
  resolveVideoUsageForRender,
} from "@/lib/assets/preferredVideoUsage";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";
import { regenerateSceneImageViaWorker } from "@/lib/video-worker/regenerateSceneImageClient";
import { editSceneImageViaWorker } from "@/lib/video-worker/editSceneImageClient";
import { insertSceneBrandAssetViaWorker } from "@/lib/video-worker/insertSceneBrandAssetClient";
import { applySceneImageWorkerResult } from "@/lib/video-scene-editor/applySceneImageWorkerResult";
import { parseChecklistScenePayload } from "@/lib/scene-types/checklist/checklistScenePayload";
import { parseQuoteScenePayload } from "@/lib/scene-types/quote/quoteScenePayload";
import { parseStatisticScenePayload } from "@/lib/scene-types/statistic/statisticScenePayload";
import { parseCtaScenePayload } from "@/lib/scene-types/cta/ctaScenePayload";
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
  clearSceneEditorDraft,
  type SceneEditorDraft,
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
import {
  copySceneVisualSetting,
  getSceneVisualSetting,
  mergeVideoAssetWorkflow,
  omitSceneVisualSetting,
  readVideoAssetWorkflow,
  type SceneVisualMode,
  type VideoAssetWorkflowMetadata,
  type VideoVisualSource,
} from "@/lib/video-scene-editor/videoWorkflowMetadata";
import {
  MIN_SCENES_IN_VIDEO,
  MAX_SCENES_IN_VIDEO,
  MIN_SCENE_DURATION_SECONDS,
  MAX_SCENE_DURATION_SECONDS,
  DEFAULT_SCENE_DURATION_SECONDS,
  newEditorSceneId,
  normalizeSceneDurationSeconds,
} from "@/lib/video-scene-editor/sceneTimeline";

export function typedPresentationViewFromDraftScene(scene: SceneEditorDraftScene): {
  sceneType: string | null;
  checklistTitle: string | null;
  checklistItems: string[] | null;
  quoteText: string | null;
  quoteAttribution: string | null;
  statisticValue: string | null;
  statisticUnit: string | null;
  statisticLabel: string | null;
  statisticSourceLine: string | null;
  statisticProofId: string | null;
  ctaHeadline: string | null;
  ctaSubline: string | null;
  ctaButtonLabel: string | null;
  ctaShowLogo: boolean | null;
} {
  const sceneType =
    typeof scene.type === "string" && scene.type.trim().length > 0
      ? scene.type.trim()
      : null;

  if (sceneType === "CHECKLIST" && scene.payload_snapshot) {
    const parsed = parseChecklistScenePayload(scene.payload_snapshot);
    if (parsed.ok) {
      return {
        sceneType,
        checklistTitle: parsed.data.title ?? null,
        checklistItems: parsed.data.items,
        quoteText: null,
        quoteAttribution: null,
        statisticValue: null,
        statisticUnit: null,
        statisticLabel: null,
        statisticSourceLine: null,
        statisticProofId: null,
        ctaHeadline: null,
        ctaSubline: null,
        ctaButtonLabel: null,
        ctaShowLogo: null,
      };
    }
  }

  if (sceneType === "QUOTE" && scene.payload_snapshot) {
    const parsed = parseQuoteScenePayload(scene.payload_snapshot);
    if (parsed.ok) {
      return {
        sceneType,
        checklistTitle: null,
        checklistItems: null,
        quoteText: parsed.data.quote,
        quoteAttribution: parsed.data.attribution,
        statisticValue: null,
        statisticUnit: null,
        statisticLabel: null,
        statisticSourceLine: null,
        statisticProofId: null,
        ctaHeadline: null,
        ctaSubline: null,
        ctaButtonLabel: null,
        ctaShowLogo: null,
      };
    }
  }

  if (sceneType === "STATISTIC" && scene.payload_snapshot) {
    const parsed = parseStatisticScenePayload(scene.payload_snapshot);
    if (parsed.ok) {
      return {
        sceneType,
        checklistTitle: null,
        checklistItems: null,
        quoteText: null,
        quoteAttribution: null,
        statisticValue: parsed.data.value,
        statisticUnit: parsed.data.unit ?? null,
        statisticLabel: parsed.data.label,
        statisticSourceLine: parsed.data.source_line ?? null,
        statisticProofId: parsed.data.proof_id,
        ctaHeadline: null,
        ctaSubline: null,
        ctaButtonLabel: null,
        ctaShowLogo: null,
      };
    }
  }

  if (sceneType === "CTA" && scene.payload_snapshot) {
    const parsed = parseCtaScenePayload(scene.payload_snapshot);
    if (parsed.ok) {
      return {
        sceneType,
        checklistTitle: null,
        checklistItems: null,
        quoteText: null,
        quoteAttribution: null,
        statisticValue: null,
        statisticUnit: null,
        statisticLabel: null,
        statisticSourceLine: null,
        statisticProofId: null,
        ctaHeadline: parsed.data.headline,
        ctaSubline: parsed.data.subline ?? null,
        ctaButtonLabel: parsed.data.button_label ?? null,
        ctaShowLogo: parsed.data.show_logo ?? null,
      };
    }
  }

  return {
    sceneType,
    checklistTitle: null,
    checklistItems: null,
    quoteText: null,
    quoteAttribution: null,
    statisticValue: null,
    statisticUnit: null,
    statisticLabel: null,
    statisticSourceLine: null,
    statisticProofId: null,
    ctaHeadline: null,
    ctaSubline: null,
    ctaButtonLabel: null,
    ctaShowLogo: null,
  };
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
      ...(typeof scene.video_usage === "string" && scene.video_usage.trim().length > 0
        ? { video_usage: String(scene.video_usage).trim() }
        : {}),
      ...(typeof scene.type === "string" && scene.type.trim().length > 0
        ? { type: String(scene.type).trim() }
        : {}),
      ...(scene.payload_snapshot &&
      typeof scene.payload_snapshot === "object" &&
      !Array.isArray(scene.payload_snapshot)
        ? {
            payload_snapshot: scene.payload_snapshot as Record<string, unknown>,
          }
        : {}),
      ...(typeof scene.renderer_version === "string" &&
      scene.renderer_version.trim().length > 0
        ? { renderer_version: String(scene.renderer_version).trim() }
        : {}),
    };
  });
}

function draftSceneWithoutVideoUsage(
  scene: SceneEditorDraftScene,
): SceneEditorDraftScene {
  const { video_usage: _omit, ...rest } = scene;
  return rest;
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
    transformMetadata?: (metadata: Json) => Json;
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
  let generation_metadata = mergeSceneEditorDraft(
    args.generationMetadata,
    draft,
  );
  if (args.transformMetadata) {
    generation_metadata = args.transformMetadata(generation_metadata);
  }
  const { error } = await supabase
    .from("content_items")
    .update({
      generation_metadata,
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
  visualMode: SceneVisualMode;
  projectAssetId: string | null;
  projectAssetTitle: string | null;
  sceneType: string | null;
  checklistTitle: string | null;
  checklistItems: string[] | null;
  quoteText: string | null;
  quoteAttribution: string | null;
  statisticValue: string | null;
  statisticUnit: string | null;
  statisticLabel: string | null;
  statisticSourceLine: string | null;
  statisticProofId: string | null;
  ctaHeadline: string | null;
  ctaSubline: string | null;
  ctaButtonLabel: string | null;
  ctaShowLogo: boolean | null;
}

export interface VideoWorkflowState {
  visualSource: VideoVisualSource | null;
  manualAssetIds: string[];
}

export interface VideoSceneEditorState {
  sourceVideoJobId: string;
  contentItemId: string;
  voiceoverText: string;
  baselineVoiceoverText: string;
  scenes: VideoSceneEditorSceneView[];
  hasDraftChanges: boolean;
  activeRenderInFlight: boolean;
  workflow: VideoWorkflowState;
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

  const workflowMeta = readVideoAssetWorkflow(
    itemRow.generation_metadata as Json | null,
  );
  const assetTitleById = await loadAssetTitlesById(
    supabase,
    input.projectId,
    collectWorkflowAssetIds(workflowMeta),
  );

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
        visualMode: getSceneVisualSetting(workflowMeta, scene.id).mode,
        projectAssetId:
          getSceneVisualSetting(workflowMeta, scene.id).project_asset_id ??
          null,
        projectAssetTitle:
          assetTitleById.get(
            getSceneVisualSetting(workflowMeta, scene.id).project_asset_id ??
              "",
          ) ?? null,
        ...typedPresentationViewFromDraftScene(scene),
      };
    }),
    hasDraftChanges,
    activeRenderInFlight: (activeRows ?? []).length > 0,
    workflow: {
      visualSource: workflowMeta.visual_source ?? null,
      manualAssetIds: workflowMeta.manual_asset_ids ?? [],
    },
  };
}

function collectWorkflowAssetIds(
  workflow: VideoAssetWorkflowMetadata,
): string[] {
  const ids = new Set<string>();
  for (const id of workflow.manual_asset_ids ?? []) ids.add(id);
  for (const setting of Object.values(workflow.scene_visual ?? {})) {
    if (setting.project_asset_id) ids.add(setting.project_asset_id);
  }
  return [...ids];
}

async function loadAssetTitlesById(
  supabase: SupabaseClient,
  projectId: string,
  assetIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (assetIds.length === 0) return map;
  const { data } = await supabase
    .from("assets")
    .select("id, title")
    .eq("project_id", projectId)
    .in("id", assetIds);
  for (const row of data ?? []) {
    map.set(row.id as string, row.title as string);
  }
  return map;
}

async function persistVideoAssetWorkflow(
  supabase: SupabaseClient,
  args: {
    projectId: string;
    contentItemId: string;
    generationMetadata: Json | null;
    patch: VideoAssetWorkflowMetadata;
  },
): Promise<Json> {
  const merged = mergeVideoAssetWorkflow(args.generationMetadata, args.patch);
  const { error } = await supabase
    .from("content_items")
    .update({ generation_metadata: merged })
    .eq("id", args.contentItemId)
    .eq("project_id", args.projectId);
  if (error) throw error;
  return merged;
}

export async function loadVideoWorkflowState(
  input: { projectId: string; contentItemId: string },
  deps: VideoSceneEditorDeps = {},
): Promise<VideoWorkflowState> {
  const supabase = deps.client ?? createSupabaseAdminClient();
  await assertContentItemInProject(
    supabase,
    input.contentItemId,
    input.projectId,
  );
  const { data, error } = await supabase
    .from("content_items")
    .select("generation_metadata")
    .eq("id", input.contentItemId)
    .eq("project_id", input.projectId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new WorkflowError("not_found", "content item not found");
  }
  const workflow = readVideoAssetWorkflow(data.generation_metadata as Json);
  return {
    visualSource: workflow.visual_source ?? null,
    manualAssetIds: workflow.manual_asset_ids ?? [],
  };
}

export async function saveVideoVisualSourceInEditor(
  input: {
    projectId: string;
    videoJobId: string;
    visualSource: VideoVisualSource;
    manualAssetIds?: string[];
  },
  deps: VideoSceneEditorDeps = {},
): Promise<VideoSceneEditorState> {
  const supabase = deps.client ?? createSupabaseAdminClient();
  const job = await loadSourceJob(supabase, input.projectId, input.videoJobId);
  const contentItemId = job.content_item_id;
  if (!contentItemId) {
    throw new WorkflowError("invalid_input", "video job has no content item");
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

  const patch: VideoAssetWorkflowMetadata = {
    visual_source: input.visualSource,
  };
  if (input.visualSource === "manual_assets") {
    const ids = (input.manualAssetIds ?? []).filter(Boolean);
    if (ids.length === 0) {
      throw new WorkflowError(
        "invalid_input",
        "manual assets mode requires at least one asset",
      );
    }
    patch.manual_asset_ids = ids;
  } else {
    patch.manual_asset_ids = [];
  }

  await persistVideoAssetWorkflow(supabase, {
    projectId: input.projectId,
    contentItemId,
    generationMetadata: itemRow.generation_metadata as Json | null,
    patch,
  });

  return loadVideoSceneEditorState(
    { projectId: input.projectId, videoJobId: input.videoJobId },
    deps,
  );
}

export async function setSceneVisualModeInEditor(
  input: {
    projectId: string;
    videoJobId: string;
    sceneId: string;
    mode: SceneVisualMode;
  },
  deps: VideoSceneEditorDeps = {},
): Promise<VideoSceneEditorState> {
  const supabase = deps.client ?? createSupabaseAdminClient();
  const job = await loadSourceJob(supabase, input.projectId, input.videoJobId);
  const contentItemId = job.content_item_id;
  if (!contentItemId) {
    throw new WorkflowError("invalid_input", "video job has no content item");
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

  const prior = readVideoAssetWorkflow(itemRow.generation_metadata as Json);
  const scene_visual = { ...(prior.scene_visual ?? {}) };
  if (input.mode === "ai") {
    scene_visual[input.sceneId] = { mode: "ai" };
  } else {
    scene_visual[input.sceneId] = {
      mode: "project_asset",
      ...(scene_visual[input.sceneId]?.project_asset_id
        ? { project_asset_id: scene_visual[input.sceneId]!.project_asset_id }
        : {}),
    };
  }

  await persistVideoAssetWorkflow(supabase, {
    projectId: input.projectId,
    contentItemId,
    generationMetadata: itemRow.generation_metadata as Json | null,
    patch: { scene_visual },
  });

  return loadVideoSceneEditorState(
    { projectId: input.projectId, videoJobId: input.videoJobId },
    deps,
  );
}

export async function setSceneProjectAssetInEditor(
  input: {
    projectId: string;
    videoJobId: string;
    sceneId: string;
    assetId: string;
  },
  deps: VideoSceneEditorDeps = {},
): Promise<VideoSceneEditorState> {
  const supabase = deps.client ?? createSupabaseAdminClient();
  const job = await loadSourceJob(supabase, input.projectId, input.videoJobId);
  const contentItemId = job.content_item_id;
  if (!contentItemId) {
    throw new WorkflowError("invalid_input", "video job has no content item");
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

  const prior = readVideoAssetWorkflow(itemRow.generation_metadata as Json);
  await persistVideoAssetWorkflow(supabase, {
    projectId: input.projectId,
    contentItemId,
    generationMetadata: itemRow.generation_metadata as Json | null,
    patch: {
      scene_visual: {
        ...(prior.scene_visual ?? {}),
        [input.sceneId]: {
          mode: "project_asset",
          project_asset_id: input.assetId,
        },
      },
    },
  });

  return applyLibraryAssetAsSceneReplacement(
    {
      projectId: input.projectId,
      videoJobId: input.videoJobId,
      sceneId: input.sceneId,
      assetId: input.assetId,
    },
    {
      ...deps,
      client: supabase,
    },
  );
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

interface SceneEditorMutationContext {
  supabase: SupabaseClient;
  job: Awaited<ReturnType<typeof loadSourceJob>>;
  contentItemId: string;
  generationMetadata: Json | null;
  scenes: SceneEditorDraftScene[];
  baselineScenes: SceneEditorDraftScene[];
  existingDraft: SceneEditorDraft | null;
}

async function loadSceneEditorMutationContext(
  supabase: SupabaseClient,
  projectId: string,
  videoJobId: string,
): Promise<SceneEditorMutationContext> {
  const job = await loadSourceJob(supabase, projectId, videoJobId);
  if (job.status !== "completed") {
    throw new WorkflowError("invalid_input", "only completed videos can be edited");
  }
  const contentItemId = job.content_item_id;
  if (!contentItemId) {
    throw new WorkflowError("invalid_input", "video job has no content item");
  }
  await assertNoActiveRender(supabase, projectId, contentItemId);

  const { data: itemRow, error: itemErr } = await supabase
    .from("content_items")
    .select("generation_metadata")
    .eq("id", contentItemId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (itemErr) throw itemErr;
  if (!itemRow) {
    throw new WorkflowError("not_found", `content item ${contentItemId} not found`);
  }

  const generationMetadata = itemRow.generation_metadata as Json | null;
  const scenes = await loadBaselineScenes(supabase, {
    projectId,
    contentItemId,
    sourceVideoJobId: job.id,
    generationMetadata,
    jobOutput: job.output,
  });
  const baselineFromOutput = extractRenderSpecScenes(job.output);
  if (!baselineFromOutput) {
    throw new WorkflowError("invalid_input", "missing render_spec baseline");
  }
  const baselineScenes = scenesToDraftScenes(baselineFromOutput);
  const existingDraft = readSceneEditorDraft(generationMetadata);

  return {
    supabase,
    job,
    contentItemId,
    generationMetadata,
    scenes,
    baselineScenes,
    existingDraft,
  };
}

async function finishSceneEditorMutation(
  ctx: SceneEditorMutationContext,
  projectId: string,
  videoJobId: string,
  deps: VideoSceneEditorDeps,
): Promise<VideoSceneEditorState> {
  return loadVideoSceneEditorState({ projectId, videoJobId }, deps);
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
    ...draftSceneWithoutVideoUsage(updated[index]!),
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

async function loadProjectImageAssetStorage(
  supabase: SupabaseClient,
  projectId: string,
  assetId: string,
): Promise<{ bucket: string; path: string }> {
  await assertAssetInProject(supabase, assetId, projectId);
  const { data, error } = await supabase
    .from("assets")
    .select("media_type, storage_bucket, storage_path")
    .eq("id", assetId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.media_type !== "image") {
    throw new WorkflowError("invalid_input", "asset must be an image");
  }
  const bucket = data.storage_bucket as string | null;
  const path = data.storage_path as string | null;
  if (!bucket || !path) {
    throw new WorkflowError("invalid_input", "asset has no storage location");
  }
  return { bucket, path };
}

async function resolveVideoUsageForProjectAsset(
  supabase: SupabaseClient,
  projectId: string,
  assetId: string,
): Promise<string> {
  await assertAssetInProject(supabase, assetId, projectId);
  const { data, error } = await supabase
    .from("assets")
    .select("title, metadata")
    .eq("id", assetId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new WorkflowError("not_found", "asset not found");
  }
  const preferred = resolvePreferredVideoUsageFromMetadata(
    (data.metadata as Json) ?? {},
    { title: (data.title as string) ?? "" },
  );
  return resolveVideoUsageForRender(preferred, undefined);
}

export async function applyLibraryAssetAsSceneReplacement(
  input: {
    projectId: string;
    videoJobId: string;
    sceneId: string;
    assetId: string;
  },
  deps: VideoSceneEditorDeps = {},
): Promise<VideoSceneEditorState> {
  const supabase = deps.client ?? createSupabaseAdminClient();
  const storage = await loadProjectImageAssetStorage(
    supabase,
    input.projectId,
    input.assetId,
  );
  const video_usage = await resolveVideoUsageForProjectAsset(
    supabase,
    input.projectId,
    input.assetId,
  );

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

  const updated = [...scenes];
  updated[index] = {
    ...draftSceneWithoutVideoUsage(updated[index]!),
    image_bucket: storage.bucket,
    image_path: storage.path,
    video_usage,
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

export async function insertLibraryBrandAssetInEditor(
  input: {
    projectId: string;
    videoJobId: string;
    sceneId: string;
    assetId: string;
    instruction: string;
  },
  deps: VideoSceneEditorDeps = {},
): Promise<VideoSceneEditorState> {
  const instruction = input.instruction.trim();
  if (!instruction) {
    throw new WorkflowError("invalid_input", "instruction is required");
  }

  const supabase = deps.client ?? createSupabaseAdminClient();
  const assetStorage = await loadProjectImageAssetStorage(
    supabase,
    input.projectId,
    input.assetId,
  );

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

  const workerResult = await insertSceneBrandAssetViaWorker({
    project_id: input.projectId,
    source_video_job_id: job.id,
    scene_id: input.sceneId,
    scene_image_bucket: target.image_bucket,
    scene_image_path: target.image_path,
    asset_bucket: assetStorage.bucket,
    asset_path: assetStorage.path,
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
      reference_asset_bucket: assetStorage.bucket,
      reference_asset_path: assetStorage.path,
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

  const workflow = readVideoAssetWorkflow(itemRow.generation_metadata as Json);
  const sceneSetting = getSceneVisualSetting(workflow, input.sceneId);
  if (sceneSetting.mode === "project_asset") {
    if (!sceneSetting.project_asset_id) {
      throw new WorkflowError(
        "invalid_input",
        "select a project asset for this scene first",
      );
    }
    return applyLibraryAssetAsSceneReplacement(
      {
        projectId: input.projectId,
        videoJobId: input.videoJobId,
        sceneId: input.sceneId,
        assetId: sceneSetting.project_asset_id,
      },
      deps,
    );
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
    ...draftSceneWithoutVideoUsage(updated[index]!),
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

export async function updateSceneDurationInEditor(
  input: {
    projectId: string;
    videoJobId: string;
    sceneId: string;
    durationSeconds: number;
  },
  deps: VideoSceneEditorDeps = {},
): Promise<VideoSceneEditorState> {
  const duration_seconds = normalizeSceneDurationSeconds(input.durationSeconds);
  if (duration_seconds === null) {
    throw new WorkflowError(
      "invalid_input",
      `scene duration must be between ${MIN_SCENE_DURATION_SECONDS} and ${MAX_SCENE_DURATION_SECONDS} seconds`,
    );
  }

  const supabase = deps.client ?? createSupabaseAdminClient();
  const ctx = await loadSceneEditorMutationContext(
    supabase,
    input.projectId,
    input.videoJobId,
  );
  const index = ctx.scenes.findIndex((s) => s.id === input.sceneId);
  if (index < 0) {
    throw new WorkflowError("not_found", `scene ${input.sceneId} not found`);
  }

  const updated = [...ctx.scenes];
  updated[index] = { ...updated[index]!, duration_seconds };

  await persistDraft(supabase, {
    projectId: input.projectId,
    contentItemId: ctx.contentItemId,
    sourceVideoJobId: ctx.job.id,
    scenes: updated,
    generationMetadata: ctx.generationMetadata,
    baselineScenes: ctx.baselineScenes,
    baselineVoiceoverText: readSourceVoiceoverText(ctx.job.input),
    imageVersions: ctx.existingDraft?.image_versions,
    brandAssetInsertInstructions:
      ctx.existingDraft?.brand_asset_insert_instructions,
  });

  return finishSceneEditorMutation(
    ctx,
    input.projectId,
    input.videoJobId,
    deps,
  );
}

export async function removeSceneFromEditor(
  input: { projectId: string; videoJobId: string; sceneId: string },
  deps: VideoSceneEditorDeps = {},
): Promise<VideoSceneEditorState> {
  const supabase = deps.client ?? createSupabaseAdminClient();
  const ctx = await loadSceneEditorMutationContext(
    supabase,
    input.projectId,
    input.videoJobId,
  );
  if (ctx.scenes.length <= MIN_SCENES_IN_VIDEO) {
    throw new WorkflowError(
      "invalid_input",
      "video must keep at least one scene",
    );
  }
  const index = ctx.scenes.findIndex((s) => s.id === input.sceneId);
  if (index < 0) {
    throw new WorkflowError("not_found", `scene ${input.sceneId} not found`);
  }

  const updated = ctx.scenes.filter((s) => s.id !== input.sceneId);
  const historyBase =
    ctx.existingDraft?.image_versions ??
    seedSceneImageHistory(ctx.baselineScenes);
  const imageVersions = { ...historyBase };
  delete imageVersions[input.sceneId];

  const instructions = {
    ...(ctx.existingDraft?.brand_asset_insert_instructions ?? {}),
  };
  delete instructions[input.sceneId];

  await persistDraft(supabase, {
    projectId: input.projectId,
    contentItemId: ctx.contentItemId,
    sourceVideoJobId: ctx.job.id,
    scenes: updated,
    generationMetadata: ctx.generationMetadata,
    baselineScenes: ctx.baselineScenes,
    baselineVoiceoverText: readSourceVoiceoverText(ctx.job.input),
    imageVersions,
    brandAssetInsertInstructions: instructions,
    transformMetadata: (meta) => omitSceneVisualSetting(meta, input.sceneId),
  });

  return finishSceneEditorMutation(
    ctx,
    input.projectId,
    input.videoJobId,
    deps,
  );
}

export async function moveSceneInEditor(
  input: {
    projectId: string;
    videoJobId: string;
    sceneId: string;
    direction: "up" | "down";
  },
  deps: VideoSceneEditorDeps = {},
): Promise<VideoSceneEditorState> {
  const supabase = deps.client ?? createSupabaseAdminClient();
  const ctx = await loadSceneEditorMutationContext(
    supabase,
    input.projectId,
    input.videoJobId,
  );
  const index = ctx.scenes.findIndex((s) => s.id === input.sceneId);
  if (index < 0) {
    throw new WorkflowError("not_found", `scene ${input.sceneId} not found`);
  }
  const targetIndex = input.direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= ctx.scenes.length) {
    throw new WorkflowError("invalid_input", "scene cannot move further");
  }

  const updated = [...ctx.scenes];
  const [moved] = updated.splice(index, 1);
  updated.splice(targetIndex, 0, moved!);

  await persistDraft(supabase, {
    projectId: input.projectId,
    contentItemId: ctx.contentItemId,
    sourceVideoJobId: ctx.job.id,
    scenes: updated,
    generationMetadata: ctx.generationMetadata,
    baselineScenes: ctx.baselineScenes,
    baselineVoiceoverText: readSourceVoiceoverText(ctx.job.input),
    imageVersions: ctx.existingDraft?.image_versions,
    brandAssetInsertInstructions:
      ctx.existingDraft?.brand_asset_insert_instructions,
  });

  return finishSceneEditorMutation(
    ctx,
    input.projectId,
    input.videoJobId,
    deps,
  );
}

export async function duplicateSceneInEditor(
  input: { projectId: string; videoJobId: string; sceneId: string },
  deps: VideoSceneEditorDeps = {},
): Promise<VideoSceneEditorState> {
  const supabase = deps.client ?? createSupabaseAdminClient();
  const ctx = await loadSceneEditorMutationContext(
    supabase,
    input.projectId,
    input.videoJobId,
  );
  if (ctx.scenes.length >= MAX_SCENES_IN_VIDEO) {
    throw new WorkflowError(
      "invalid_input",
      `video cannot exceed ${MAX_SCENES_IN_VIDEO} scenes`,
    );
  }
  const index = ctx.scenes.findIndex((s) => s.id === input.sceneId);
  if (index < 0) {
    throw new WorkflowError("not_found", `scene ${input.sceneId} not found`);
  }

  const source = ctx.scenes[index]!;
  const newScene: SceneEditorDraftScene = {
    id: newEditorSceneId(),
    image_prompt: source.image_prompt,
    image_bucket: source.image_bucket,
    image_path: source.image_path,
    duration_seconds: source.duration_seconds,
  };
  const updated = [...ctx.scenes];
  updated.splice(index + 1, 0, newScene);

  const historyBase =
    ctx.existingDraft?.image_versions ??
    seedSceneImageHistory(ctx.baselineScenes);
  const imageVersions = appendSceneImageVersion(
    historyBase,
    newScene.id,
    sceneVersionFromDraftScene(newScene, "original", { isOriginal: true }),
  );

  await persistDraft(supabase, {
    projectId: input.projectId,
    contentItemId: ctx.contentItemId,
    sourceVideoJobId: ctx.job.id,
    scenes: updated,
    generationMetadata: ctx.generationMetadata,
    baselineScenes: ctx.baselineScenes,
    baselineVoiceoverText: readSourceVoiceoverText(ctx.job.input),
    imageVersions,
    brandAssetInsertInstructions:
      ctx.existingDraft?.brand_asset_insert_instructions,
    transformMetadata: (meta) =>
      copySceneVisualSetting(meta, input.sceneId, newScene.id),
  });

  return finishSceneEditorMutation(
    ctx,
    input.projectId,
    input.videoJobId,
    deps,
  );
}

export async function insertVideoSceneWithUpload(
  input: {
    projectId: string;
    videoJobId: string;
    afterSceneId?: string | null;
    file: File;
    imagePrompt: string;
    durationSeconds?: number;
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
  const image_prompt = input.imagePrompt.trim();
  if (!image_prompt) {
    throw new WorkflowError("invalid_input", "image prompt is required");
  }
  const duration_seconds = normalizeSceneDurationSeconds(
    input.durationSeconds ?? DEFAULT_SCENE_DURATION_SECONDS,
  );
  if (duration_seconds === null) {
    throw new WorkflowError("invalid_input", "invalid scene duration");
  }

  const supabase = deps.client ?? createSupabaseAdminClient();
  const ctx = await loadSceneEditorMutationContext(
    supabase,
    input.projectId,
    input.videoJobId,
  );
  if (ctx.scenes.length >= MAX_SCENES_IN_VIDEO) {
    throw new WorkflowError(
      "invalid_input",
      `video cannot exceed ${MAX_SCENES_IN_VIDEO} scenes`,
    );
  }

  const newSceneId = newEditorSceneId();
  const ext =
    input.file.type === "image/png"
      ? "png"
      : input.file.type === "image/jpeg" || input.file.type === "image/jpg"
        ? "jpg"
        : "bin";
  const storagePath = buildVideoRenderPath(
    input.projectId,
    ctx.job.id,
    `scene-editor-${newSceneId}-${Date.now()}.${ext}`,
  );

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.videoRenders)
    .upload(storagePath, input.file, {
      contentType: input.file.type || undefined,
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const newScene: SceneEditorDraftScene = {
    id: newSceneId,
    image_prompt,
    image_bucket: STORAGE_BUCKETS.videoRenders,
    image_path: storagePath,
    duration_seconds,
  };

  const updated = [...ctx.scenes];
  const insertIndex =
    input.afterSceneId != null && input.afterSceneId.length > 0
      ? (() => {
          const idx = updated.findIndex((s) => s.id === input.afterSceneId);
          return idx >= 0 ? idx + 1 : updated.length;
        })()
      : updated.length;
  updated.splice(insertIndex, 0, newScene);

  const historyBase =
    ctx.existingDraft?.image_versions ??
    seedSceneImageHistory(ctx.baselineScenes);
  const imageVersions = appendSceneImageVersion(
    historyBase,
    newScene.id,
    sceneVersionFromDraftScene(newScene, "upload"),
  );

  await persistDraft(supabase, {
    projectId: input.projectId,
    contentItemId: ctx.contentItemId,
    sourceVideoJobId: ctx.job.id,
    scenes: updated,
    generationMetadata: ctx.generationMetadata,
    baselineScenes: ctx.baselineScenes,
    baselineVoiceoverText: readSourceVoiceoverText(ctx.job.input),
    imageVersions,
    brandAssetInsertInstructions:
      ctx.existingDraft?.brand_asset_insert_instructions,
  });

  return finishSceneEditorMutation(
    ctx,
    input.projectId,
    input.videoJobId,
    deps,
  );
}

/** Replaces the content-item scene draft with render_spec from a completed video job. */
export async function resetSceneEditorFromVideoJob(
  input: { projectId: string; videoJobId: string },
  deps: VideoSceneEditorDeps = {},
): Promise<VideoSceneEditorState> {
  const supabase = deps.client ?? createSupabaseAdminClient();
  const job = await loadSourceJob(supabase, input.projectId, input.videoJobId);
  if (job.status !== "completed") {
    throw new WorkflowError(
      "invalid_input",
      "only completed video versions can be loaded into the editor",
    );
  }
  const contentItemId = job.content_item_id;
  if (!contentItemId) {
    throw new WorkflowError("invalid_input", "video job has no content item");
  }
  await assertNoActiveRender(supabase, input.projectId, contentItemId);

  const baselineFromOutput = extractRenderSpecScenes(job.output);
  if (!baselineFromOutput) {
    throw new WorkflowError(
      "invalid_input",
      "this video version has no render_spec scenes",
    );
  }
  const baselineScenes = scenesToDraftScenes(baselineFromOutput);
  const voiceoverText = readSourceVoiceoverText(job.input);

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

  const draft = buildSceneEditorDraft({
    sourceVideoJobId: job.id,
    scenes: baselineScenes,
    existing: null,
    baselineScenes,
    baselineVoiceoverText: voiceoverText,
  });
  draft.voiceover_text = voiceoverText;

  const { error: updateErr } = await supabase
    .from("content_items")
    .update({
      generation_metadata: mergeSceneEditorDraft(
        itemRow.generation_metadata as Json | null,
        draft,
      ),
    })
    .eq("id", contentItemId)
    .eq("project_id", input.projectId);
  if (updateErr) throw updateErr;

  return loadVideoSceneEditorState(
    { projectId: input.projectId, videoJobId: job.id },
    deps,
  );
}

export async function deleteProjectVideoJobVersion(
  input: { projectId: string; videoJobId: string },
  deps: VideoSceneEditorDeps = {},
): Promise<void> {
  const supabase = deps.client ?? createSupabaseAdminClient();
  const job = await loadSourceJob(supabase, input.projectId, input.videoJobId);
  if (job.status === "queued" || job.status === "processing") {
    throw new WorkflowError(
      "invalid_input",
      "cannot delete a video that is still rendering",
    );
  }
  const contentItemId = job.content_item_id;
  if (contentItemId) {
    await assertNoActiveRender(supabase, input.projectId, contentItemId);

    const { count, error: countErr } = await supabase
      .from("video_jobs")
      .select("id", { count: "exact", head: true })
      .eq("project_id", input.projectId)
      .eq("content_item_id", contentItemId);
    if (countErr) throw countErr;
    if ((count ?? 0) <= 1) {
      throw new WorkflowError(
        "invalid_input",
        "cannot delete the only video version for this content item",
      );
    }

    const { data: itemRow, error: itemErr } = await supabase
      .from("content_items")
      .select("generation_metadata")
      .eq("id", contentItemId)
      .eq("project_id", input.projectId)
      .maybeSingle();
    if (itemErr) throw itemErr;
    if (itemRow) {
      const draft = readSceneEditorDraft(
        itemRow.generation_metadata as Json | null,
      );
      if (draft?.source_video_job_id === job.id) {
        const cleared = clearSceneEditorDraft(
          itemRow.generation_metadata as Json | null,
        );
        const { error: metaErr } = await supabase
          .from("content_items")
          .update({ generation_metadata: cleared })
          .eq("id", contentItemId)
          .eq("project_id", input.projectId);
        if (metaErr) throw metaErr;
      }
    }
  }

  const { error: deleteErr } = await supabase
    .from("video_jobs")
    .delete()
    .eq("id", job.id)
    .eq("project_id", input.projectId);
  if (deleteErr) throw deleteErr;
}

export type {
  SceneEditorRerenderSummary,
  SceneEditorRerenderDeps,
  SceneEditorRenderAssetMode,
} from "@/lib/video-scene-editor/sceneEditorRerender";

export async function runSceneEditorRerender(
  input: {
    projectId: string;
    videoJobId: string;
    renderAssetMode?: import("@/lib/video-scene-editor/sceneEditorRerender").SceneEditorRenderAssetMode;
    selectedAssetIds?: string[];
  },
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
