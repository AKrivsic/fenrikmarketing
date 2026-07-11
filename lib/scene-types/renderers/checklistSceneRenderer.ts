export const CHECKLIST_SCENE_RENDERER_VERSION = "checklist@1";

import type { SceneRenderer } from "@/lib/scene-types/renderers/types";

export function createChecklistSceneRenderer(deps: {
  prepareRaster: SceneRenderer["prepareRaster"];
}): SceneRenderer {
  return {
    type: "CHECKLIST",
    version: CHECKLIST_SCENE_RENDERER_VERSION,
    prepareRaster: deps.prepareRaster,
  };
}
