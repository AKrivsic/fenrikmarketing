import { isSceneTypesEnabled } from "@/lib/scene-types/config";

/** PHONE scenes render when typed scene infrastructure is enabled (no checklist allowlist). */
export function shouldRenderPhoneScenes(): boolean {
  return isSceneTypesEnabled();
}
