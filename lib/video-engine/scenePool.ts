import type { Scene } from "@/lib/video-engine/schemas/sceneSchema";
import { MAX_VIDEO_SCENE_STILLS } from "@/lib/video-engine/storyboard";

export const MAX_SCENE_POOL = 8;

/** Max generated stills when product asset stills are also in the pool. */
export const MAX_GENERATED_SCENES_WITH_ASSETS = 4;

const ASSET_SCENE_ID_PREFIX = "asset-";

export function isAssetSceneId(id: string): boolean {
  return id.startsWith(ASSET_SCENE_ID_PREFIX);
}

/**
 * Merges capped generated scenes with reused asset stills for vertical video.
 * Asset scenes are inserted after the first two generated beats (early in the
 * storyboard) and are never dropped when trimming to the pool limit.
 */
export function mergeGeneratedAndAssetScenes(
  generatedScenes: Scene[],
  assetScenes: Scene[],
  maxPool: number = MAX_SCENE_POOL,
): Scene[] {
  if (assetScenes.length === 0) {
    return generatedScenes.slice(0, maxPool);
  }

  const maxGenerated = Math.min(
    MAX_GENERATED_SCENES_WITH_ASSETS,
    MAX_VIDEO_SCENE_STILLS,
  );
  const gen = generatedScenes.slice(0, maxGenerated);
  const insertAfter = Math.min(2, gen.length);

  const merged: Scene[] = [
    ...gen.slice(0, insertAfter),
    ...assetScenes,
    ...gen.slice(insertAfter),
  ];

  return trimScenePoolPreservingAssets(merged, maxPool);
}

export function trimScenePoolPreservingAssets(
  scenes: Scene[],
  maxPool: number,
): Scene[] {
  if (scenes.length <= maxPool) return scenes;

  const assets = scenes.filter((s) => isAssetSceneId(s.id));
  const generatedBudget = Math.max(0, maxPool - assets.length);

  const out: Scene[] = [];
  let generatedUsed = 0;
  for (const scene of scenes) {
    if (isAssetSceneId(scene.id)) {
      out.push(scene);
      continue;
    }
    if (generatedUsed < generatedBudget) {
      out.push(scene);
      generatedUsed++;
    }
  }
  return out;
}
