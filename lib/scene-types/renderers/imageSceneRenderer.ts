export const IMAGE_SCENE_RENDERER_VERSION = "image@1";

import type { SceneRenderer } from "@/lib/scene-types/renderers/types";
import { DEFAULT_SCENE_TYPE } from "@/lib/scene-types/sceneType";

export function createImageSceneRenderer(deps: {
  prepareRaster: SceneRenderer["prepareRaster"];
}): SceneRenderer {
  return {
    type: DEFAULT_SCENE_TYPE,
    version: IMAGE_SCENE_RENDERER_VERSION,
    prepareRaster: deps.prepareRaster,
  };
}
