import type { Json } from "@/lib/supabase/types";
import { SCENE_EDITOR_METADATA_KEY } from "@/lib/video-scene-editor/constants";

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
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
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
    const row = asRecord(scene);
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
    parsed.push({
      id,
      image_prompt,
      image_bucket,
      image_path,
      duration_seconds,
    });
  }
  const updated_at =
    typeof draft.updated_at === "string" ? draft.updated_at : new Date(0).toISOString();
  return {
    source_video_job_id: sourceJobId,
    scenes: parsed,
    updated_at,
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
