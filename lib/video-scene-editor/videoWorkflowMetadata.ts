import type { Json } from "@/lib/supabase/types";

/** Workflow-only metadata on content_items.generation_metadata (not assets schema). */
export const VIDEO_ASSET_WORKFLOW_KEY = "video_asset_workflow";

export type VideoVisualSource = "ai_only" | "asset_enabled" | "manual_assets";

export type SceneVisualMode = "ai" | "project_asset";

export interface SceneVisualSetting {
  mode: SceneVisualMode;
  project_asset_id?: string;
}

export interface VideoAssetWorkflowMetadata {
  visual_source?: VideoVisualSource;
  manual_asset_ids?: string[];
  scene_visual?: Record<string, SceneVisualSetting>;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function isVideoVisualSource(value: string): value is VideoVisualSource {
  return (
    value === "ai_only" ||
    value === "asset_enabled" ||
    value === "manual_assets"
  );
}

function isSceneVisualMode(value: string): value is SceneVisualMode {
  return value === "ai" || value === "project_asset";
}

export function readVideoAssetWorkflow(
  generationMetadata: Json | null | undefined,
): VideoAssetWorkflowMetadata {
  const meta = asRecord(generationMetadata);
  if (!meta) return {};
  const raw = asRecord(meta[VIDEO_ASSET_WORKFLOW_KEY]);
  if (!raw) return {};

  const visual_source =
    typeof raw.visual_source === "string" &&
    isVideoVisualSource(raw.visual_source)
      ? raw.visual_source
      : undefined;

  const manual_asset_ids = Array.isArray(raw.manual_asset_ids)
    ? raw.manual_asset_ids.filter(
        (id): id is string => typeof id === "string" && id.length > 0,
      )
    : undefined;

  const scene_visual: Record<string, SceneVisualSetting> = {};
  const scenesRaw = raw.scene_visual;
  if (scenesRaw && typeof scenesRaw === "object" && !Array.isArray(scenesRaw)) {
    for (const [sceneId, entry] of Object.entries(scenesRaw)) {
      const row = asRecord(entry);
      if (!row || typeof row.mode !== "string" || !isSceneVisualMode(row.mode)) {
        continue;
      }
      const setting: SceneVisualSetting = { mode: row.mode };
      if (
        typeof row.project_asset_id === "string" &&
        row.project_asset_id.trim().length > 0
      ) {
        setting.project_asset_id = row.project_asset_id.trim();
      }
      scene_visual[sceneId] = setting;
    }
  }

  return {
    ...(visual_source ? { visual_source } : {}),
    ...(manual_asset_ids && manual_asset_ids.length > 0
      ? { manual_asset_ids }
      : {}),
    ...(Object.keys(scene_visual).length > 0 ? { scene_visual } : {}),
  };
}

export function mergeVideoAssetWorkflow(
  generationMetadata: Json | null | undefined,
  patch: VideoAssetWorkflowMetadata,
): Json {
  const base = asRecord(generationMetadata) ?? {};
  const prior = readVideoAssetWorkflow(generationMetadata);
  const next: VideoAssetWorkflowMetadata = {
    ...prior,
    ...patch,
    scene_visual: {
      ...(prior.scene_visual ?? {}),
      ...(patch.scene_visual ?? {}),
    },
  };
  if (next.scene_visual && Object.keys(next.scene_visual).length === 0) {
    delete next.scene_visual;
  }
  if (next.manual_asset_ids && next.manual_asset_ids.length === 0) {
    delete next.manual_asset_ids;
  }
  return {
    ...base,
    [VIDEO_ASSET_WORKFLOW_KEY]: next,
  } as unknown as Json;
}

export function getSceneVisualSetting(
  workflow: VideoAssetWorkflowMetadata,
  sceneId: string,
): SceneVisualSetting {
  return workflow.scene_visual?.[sceneId] ?? { mode: "ai" };
}

export function omitSceneVisualSetting(
  generationMetadata: Json | null | undefined,
  sceneId: string,
): Json {
  const workflow = readVideoAssetWorkflow(generationMetadata);
  if (!workflow.scene_visual?.[sceneId]) {
    return (generationMetadata ?? {}) as Json;
  }
  const scene_visual = { ...workflow.scene_visual };
  delete scene_visual[sceneId];
  return mergeVideoAssetWorkflow(generationMetadata, { scene_visual });
}

export function copySceneVisualSetting(
  generationMetadata: Json | null | undefined,
  fromSceneId: string,
  toSceneId: string,
): Json {
  const workflow = readVideoAssetWorkflow(generationMetadata);
  const source = workflow.scene_visual?.[fromSceneId];
  if (!source) return (generationMetadata ?? {}) as Json;
  return mergeVideoAssetWorkflow(generationMetadata, {
    scene_visual: { [toSceneId]: { ...source } },
  });
}

/** Maps stored workflow to scene-editor re-render asset mode (optional override). */
export function workflowToRenderAssetMode(
  workflow: VideoAssetWorkflowMetadata,
): import("@/lib/video-scene-editor/sceneEditorRerender").SceneEditorRenderAssetMode | undefined {
  if (!workflow.visual_source) return undefined;
  return workflow.visual_source;
}
