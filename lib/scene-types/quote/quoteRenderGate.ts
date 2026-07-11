import { isSceneTypesEnabled } from "@/lib/scene-types/config";

/** QUOTE scenes render when typed scene infrastructure is enabled. */
export function shouldRenderQuoteScenes(): boolean {
  return isSceneTypesEnabled();
}
