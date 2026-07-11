export const QUOTE_SCENE_RENDERER_VERSION = "quote@1";

import type { SceneRenderer } from "@/lib/scene-types/renderers/types";

export function createQuoteSceneRenderer(deps: {
  prepareRaster: SceneRenderer["prepareRaster"];
}): SceneRenderer {
  return {
    type: "QUOTE",
    version: QUOTE_SCENE_RENDERER_VERSION,
    prepareRaster: deps.prepareRaster,
  };
}
