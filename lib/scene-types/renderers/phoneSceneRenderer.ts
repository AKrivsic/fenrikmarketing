export const PHONE_SCENE_RENDERER_VERSION = "phone@1";

import type { SceneRenderer } from "@/lib/scene-types/renderers/types";

export function createPhoneSceneRenderer(deps: {
  prepareRaster: SceneRenderer["prepareRaster"];
}): SceneRenderer {
  return {
    type: "PHONE",
    version: PHONE_SCENE_RENDERER_VERSION,
    prepareRaster: deps.prepareRaster,
  };
}
