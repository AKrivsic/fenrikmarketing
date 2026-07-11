import type { Scene } from "@/lib/video-engine/schemas/sceneSchema";
import {
  assertSceneRenderable,
  type SceneRasterPrepareContext,
} from "@/lib/scene-types/renderers/types";

/** Ensures every scene is renderable with the worker SceneRenderer registry. */
export function assertWorkerScenesRenderable(
  scenes: Scene[],
  ctx?: SceneRasterPrepareContext,
): Scene[] {
  for (const scene of scenes) {
    assertSceneRenderable(scene, ctx);
  }
  return scenes;
}
