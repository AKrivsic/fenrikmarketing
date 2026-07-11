import { isSceneTypesEnabled } from "@/lib/scene-types/config";

/** STATISTIC scenes render when typed scene infrastructure is enabled. */
export function shouldRenderStatisticScenes(): boolean {
  return isSceneTypesEnabled();
}
