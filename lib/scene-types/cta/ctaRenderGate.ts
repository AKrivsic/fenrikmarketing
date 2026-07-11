import { isSceneTypesEnabled } from "@/lib/scene-types/config";

/** CTA scenes render when typed scene infrastructure is enabled. */
export function shouldRenderCtaScenes(): boolean {
  return isSceneTypesEnabled();
}
