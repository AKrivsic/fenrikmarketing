import type { Json } from "@/lib/supabase/types";
import {
  isVideoUsageRenderMode,
  resolvePreferredVideoUsageFromMetadata,
  resolveVideoUsageForRender,
  type VideoUsageRenderMode,
} from "@/lib/assets/preferredVideoUsage";
import type { SceneEditorDraftScene } from "@/lib/video-scene-editor/metadata";

export interface AssetRowForVideoUsage {
  id: string;
  title: string | null;
  metadata: Json;
}

/**
 * Re-resolves render video_usage from current asset metadata (e.g. before re-render).
 * Skips scenes with video_usage_locked or missing asset_id.
 */
export function resolveVideoUsageForDraftScene(
  scene: SceneEditorDraftScene,
  asset: AssetRowForVideoUsage | null,
): VideoUsageRenderMode | undefined {
  if (scene.video_usage_locked === true) {
    return isVideoUsageRenderMode(scene.video_usage)
      ? scene.video_usage
      : undefined;
  }
  if (!scene.asset_id || !asset || asset.id !== scene.asset_id) {
    return isVideoUsageRenderMode(scene.video_usage)
      ? scene.video_usage
      : undefined;
  }
  const preferred = resolvePreferredVideoUsageFromMetadata(asset.metadata, {
    title: asset.title ?? "",
  });
  return resolveVideoUsageForRender(preferred, undefined);
}

export function refreshDraftScenesVideoUsage(
  scenes: SceneEditorDraftScene[],
  assetsById: Map<string, AssetRowForVideoUsage>,
): SceneEditorDraftScene[] {
  return scenes.map((scene) => {
    const asset = scene.asset_id ? assetsById.get(scene.asset_id) ?? null : null;
    const nextUsage = resolveVideoUsageForDraftScene(scene, asset);
    if (!nextUsage || nextUsage === scene.video_usage) return scene;
    return { ...scene, video_usage: nextUsage };
  });
}
