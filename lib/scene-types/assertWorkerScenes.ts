import type { Scene } from "@/lib/video-engine/schemas/sceneSchema";
import { assertSceneRenderable } from "@/lib/scene-types/renderers/types";

/** Ensures every scene is renderable in the current phase (IMAGE-only). */
export function assertWorkerScenesRenderable(scenes: Scene[]): Scene[] {
  for (const scene of scenes) {
    assertSceneRenderable(scene);
  }
  return scenes;
}
