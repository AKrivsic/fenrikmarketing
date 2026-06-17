import type { Json } from "@/lib/supabase/types";
import { SCENE_EDITOR_METADATA_KEY } from "@/lib/video-scene-editor/constants";
import type { SceneImageVersion } from "@/lib/video-scene-editor/imageHistory";

export interface SceneEditorDraftScene {
  id: string;
  image_prompt: string;
  image_bucket: string;
  image_path: string;
  duration_seconds: number;
}

export interface SceneEditorDraft {
  source_video_job_id: string;
  scenes: SceneEditorDraftScene[];
  updated_at: string;
  /** Immutable snapshot of the first render_spec scenes for this editor session. */
  original_scenes: Record<string, SceneEditorDraftScene>;
  image_versions: Record<string, SceneImageVersion[]>;
  /** Edited narration for the next re-render (optional until the user saves). */
  voiceover_text?: string;
  /** Voiceover copied from the source job when the editor session started. */
  original_voiceover_text?: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseSceneImageVersion(value: unknown): SceneImageVersion | null {
  const row = asRecord(value);
  if (!row) return null;
  const version_id = row.version_id;
  const image_bucket = row.image_bucket;
  const image_path = row.image_path;
  const image_prompt = row.image_prompt;
  const source = row.source;
  const created_at = row.created_at;
  const is_original = row.is_original;
  if (
    typeof version_id !== "string" ||
    typeof image_bucket !== "string" ||
    typeof image_path !== "string" ||
    typeof image_prompt !== "string" ||
    typeof source !== "string" ||
    typeof created_at !== "string"
  ) {
    return null;
  }
  return {
    version_id,
    image_bucket,
    image_path,
    image_prompt,
    source: source as SceneImageVersion["source"],
    created_at,
    is_original: is_original === true,
    ...(typeof row.instruction === "string"
      ? { instruction: row.instruction }
      : {}),
    ...(typeof row.reference_asset_bucket === "string"
      ? { reference_asset_bucket: row.reference_asset_bucket }
      : {}),
    ...(typeof row.reference_asset_path === "string"
      ? { reference_asset_path: row.reference_asset_path }
      : {}),
    ...(typeof row.edit_provider === "string"
      ? { edit_provider: row.edit_provider }
      : {}),
    ...(typeof row.edit_model === "string" ? { edit_model: row.edit_model } : {}),
  };
}

function parseDraftScene(value: unknown): SceneEditorDraftScene | null {
  const row = asRecord(value);
  if (!row) return null;
  const id = row.id;
  const image_prompt = row.image_prompt;
  const image_bucket = row.image_bucket;
  const image_path = row.image_path;
  const duration_seconds = row.duration_seconds;
  if (
    typeof id !== "string" ||
    typeof image_prompt !== "string" ||
    typeof image_bucket !== "string" ||
    typeof image_path !== "string" ||
    typeof duration_seconds !== "number" ||
    duration_seconds <= 0
  ) {
    return null;
  }
  return {
    id,
    image_prompt,
    image_bucket,
    image_path,
    duration_seconds,
  };
}

export function readSceneEditorDraft(
  generationMetadata: Json | null | undefined,
): SceneEditorDraft | null {
  const meta = asRecord(generationMetadata);
  if (!meta) return null;
  const raw = meta[SCENE_EDITOR_METADATA_KEY];
  const draft = asRecord(raw);
  if (!draft) return null;
  const sourceJobId = draft.source_video_job_id;
  if (typeof sourceJobId !== "string" || sourceJobId.length === 0) return null;
  const scenes = draft.scenes;
  if (!Array.isArray(scenes) || scenes.length === 0) return null;
  const parsed: SceneEditorDraftScene[] = [];
  for (const scene of scenes) {
    const row = parseDraftScene(scene);
    if (!row) return null;
    parsed.push(row);
  }

  const original_scenes: Record<string, SceneEditorDraftScene> = {};
  const originalRaw = draft.original_scenes;
  if (originalRaw && typeof originalRaw === "object" && !Array.isArray(originalRaw)) {
    for (const [sceneId, sceneValue] of Object.entries(originalRaw)) {
      const row = parseDraftScene(sceneValue);
      if (row) original_scenes[sceneId] = row;
    }
  }

  const image_versions: Record<string, SceneImageVersion[]> = {};
  const versionsRaw = draft.image_versions;
  if (versionsRaw && typeof versionsRaw === "object" && !Array.isArray(versionsRaw)) {
    for (const [sceneId, list] of Object.entries(versionsRaw)) {
      if (!Array.isArray(list)) continue;
      const parsedVersions: SceneImageVersion[] = [];
      for (const entry of list) {
        const version = parseSceneImageVersion(entry);
        if (version) parsedVersions.push(version);
      }
      if (parsedVersions.length > 0) image_versions[sceneId] = parsedVersions;
    }
  }

  const updated_at =
    typeof draft.updated_at === "string" ? draft.updated_at : new Date(0).toISOString();

  const voiceover_text =
    typeof draft.voiceover_text === "string" ? draft.voiceover_text : undefined;
  const original_voiceover_text =
    typeof draft.original_voiceover_text === "string"
      ? draft.original_voiceover_text
      : undefined;

  return {
    source_video_job_id: sourceJobId,
    scenes: parsed,
    updated_at,
    original_scenes,
    image_versions,
    ...(voiceover_text !== undefined ? { voiceover_text } : {}),
    ...(original_voiceover_text !== undefined ? { original_voiceover_text } : {}),
  };
}

export function mergeSceneEditorDraft(
  generationMetadata: Json | null | undefined,
  draft: SceneEditorDraft,
): Json {
  const base = asRecord(generationMetadata) ?? {};
  return {
    ...base,
    [SCENE_EDITOR_METADATA_KEY]: draft,
  } as unknown as Json;
}

export function clearSceneEditorDraft(
  generationMetadata: Json | null | undefined,
): Json {
  const base = asRecord(generationMetadata) ?? {};
  const rest = { ...base };
  delete rest[SCENE_EDITOR_METADATA_KEY];
  return rest as Json;
}
