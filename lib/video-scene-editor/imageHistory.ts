import type { SceneEditorDraftScene } from "@/lib/video-scene-editor/metadata";

export type SceneImageVersionSource =
  | "original"
  | "upload"
  | "regenerate"
  | "restore"
  | "prompt_edit";

export interface SceneImageVersion {
  version_id: string;
  image_bucket: string;
  image_path: string;
  image_prompt: string;
  source: SceneImageVersionSource;
  created_at: string;
  /** Permanent first-generated still for this scene (never removed from history). */
  is_original: boolean;
}

export function sceneVersionFromDraftScene(
  scene: SceneEditorDraftScene,
  source: SceneImageVersionSource,
  args?: { isOriginal?: boolean; versionId?: string },
): SceneImageVersion {
  const version_id =
    args?.versionId ??
    (typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `ver-${Date.now()}`);
  return {
    version_id,
    image_bucket: scene.image_bucket,
    image_path: scene.image_path,
    image_prompt: scene.image_prompt,
    source,
    created_at: new Date().toISOString(),
    is_original: args?.isOriginal ?? false,
  };
}

export function seedSceneImageHistory(
  baselineScenes: SceneEditorDraftScene[],
): Record<string, SceneImageVersion[]> {
  const history: Record<string, SceneImageVersion[]> = {};
  for (const scene of baselineScenes) {
    history[scene.id] = [
      sceneVersionFromDraftScene(scene, "original", { isOriginal: true }),
    ];
  }
  return history;
}

export function seedOriginalScenes(
  baselineScenes: SceneEditorDraftScene[],
): Record<string, SceneEditorDraftScene> {
  const originals: Record<string, SceneEditorDraftScene> = {};
  for (const scene of baselineScenes) {
    originals[scene.id] = { ...scene };
  }
  return originals;
}

export function appendSceneImageVersion(
  history: Record<string, SceneImageVersion[]>,
  sceneId: string,
  version: SceneImageVersion,
): Record<string, SceneImageVersion[]> {
  const existing = history[sceneId] ?? [];
  return {
    ...history,
    [sceneId]: [...existing, version],
  };
}

export function findSceneImageVersion(
  history: Record<string, SceneImageVersion[]>,
  sceneId: string,
  versionId: string,
): SceneImageVersion | null {
  const versions = history[sceneId] ?? [];
  return versions.find((v) => v.version_id === versionId) ?? null;
}

export function originalSceneImageVersion(
  history: Record<string, SceneImageVersion[]>,
  sceneId: string,
): SceneImageVersion | null {
  const versions = history[sceneId] ?? [];
  return versions.find((v) => v.is_original) ?? versions[0] ?? null;
}
