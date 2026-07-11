export const CTA_SCENE_RENDERER_VERSION = "cta@1";

import type { SceneRenderer } from "@/lib/scene-types/renderers/types";

export function createCtaSceneRenderer(deps: {
  prepareRaster: SceneRenderer["prepareRaster"];
}): SceneRenderer {
  return {
    type: "CTA",
    version: CTA_SCENE_RENDERER_VERSION,
    prepareRaster: deps.prepareRaster,
  };
}
