import type { Json } from "@/lib/supabase/types";
import {
  isVideoUsageRenderMode,
  type VideoUsageRenderMode,
} from "@/lib/assets/preferredVideoUsage";
import { resolveScenePresentation } from "@/lib/video-scene-editor/scenePresentationOverride";
import type { SceneEditorDraftScene } from "@/lib/video-scene-editor/metadata";

export interface AssetRowForVideoUsage {
  id: string;
  title: string | null;
  metadata: Json;
}

/**
 * Re-resolves render video_usage from current asset metadata (e.g. before re-render).
 * Double-framing guard always applies, even when video_usage_locked.
 */
export function resolveVideoUsageForDraftScene(
  scene: SceneEditorDraftScene,
  asset: AssetRowForVideoUsage | null,
): VideoUsageRenderMode | undefined {
  if (!scene.asset_id || !asset || asset.id !== scene.asset_id) {
    return isVideoUsageRenderMode(scene.video_usage)
      ? scene.video_usage
      : undefined;
  }
  const { videoUsage } = resolveScenePresentation({
    assetMetadata: asset.metadata,
    assetTitle: asset.title ?? "",
    scene,
  });
  return videoUsage;
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
