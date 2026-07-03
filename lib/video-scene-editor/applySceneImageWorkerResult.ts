import type { SceneEditorDraftScene } from "@/lib/video-scene-editor/metadata";
import {
  appendSceneImageVersion,
  sceneVersionFromDraftScene,
  type SceneImageVersion,
  type SceneImageVersionSource,
} from "@/lib/video-scene-editor/imageHistory";

export function applySceneImageWorkerResult(args: {
  scenes: SceneEditorDraftScene[];
  sceneId: string;
  image_bucket: string;
  image_path: string;
  source: SceneImageVersionSource;
  imageVersions: Record<string, SceneImageVersion[]>;
  version?: SceneImageVersion;
}): {
  scenes: SceneEditorDraftScene[];
  imageVersions: Record<string, SceneImageVersion[]>;
} {
  const index = args.scenes.findIndex((s) => s.id === args.sceneId);
  if (index < 0) {
    throw new Error(`scene ${args.sceneId} not found`);
  }

  const target = args.scenes[index]!;
  const { video_usage: _omit, ...base } = target;
  const updatedScenes = [...args.scenes];
  updatedScenes[index] = {
    ...base,
    image_bucket: args.image_bucket,
    image_path: args.image_path,
  };

  const version =
    args.version ??
    sceneVersionFromDraftScene(updatedScenes[index]!, args.source);

  const imageVersions = appendSceneImageVersion(
    args.imageVersions,
    args.sceneId,
    version,
  );

  return { scenes: updatedScenes, imageVersions };
}
