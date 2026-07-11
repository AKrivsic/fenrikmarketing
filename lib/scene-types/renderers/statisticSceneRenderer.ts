export const STATISTIC_SCENE_RENDERER_VERSION = "statistic@1";

import type { SceneRenderer } from "@/lib/scene-types/renderers/types";

export function createStatisticSceneRenderer(deps: {
  prepareRaster: SceneRenderer["prepareRaster"];
}): SceneRenderer {
  return {
    type: "STATISTIC",
    version: STATISTIC_SCENE_RENDERER_VERSION,
    prepareRaster: deps.prepareRaster,
  };
}
