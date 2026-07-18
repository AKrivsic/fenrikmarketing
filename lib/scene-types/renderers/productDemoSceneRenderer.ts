export const PRODUCT_DEMO_SCENE_RENDERER_VERSION = "product_demo@1";

import type { SceneRenderer } from "@/lib/scene-types/renderers/types";

export function createProductDemoSceneRenderer(deps: {
  prepareRaster: SceneRenderer["prepareRaster"];
}): SceneRenderer {
  return {
    type: "PRODUCT_DEMO",
    version: PRODUCT_DEMO_SCENE_RENDERER_VERSION,
    prepareRaster: deps.prepareRaster,
  };
}
