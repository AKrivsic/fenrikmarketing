import type { Scene } from "@/lib/video-engine/schemas/sceneSchema";
import type { SceneImageGenerationWarning } from "@/lib/video-engine/sceneImageGenerationMeta";
import { prepareSceneRaster } from "@/lib/scene-types/renderers/types";
import { ensureSceneRendererRegistry } from "@/video-worker/services/sceneRendererRegistry";

export interface GenerateSceneImagesInput {
  scenes: Scene[];
  projectId: string;
  videoJobId: string;
  visualProfile?: string;
  visualProfileVersion?: string;
}

import type { SceneImageGenerationWarning } from "@/lib/video-engine/sceneImageGenerationMeta";

export interface SceneImage {
  sceneId: string;
  imagePath: string;
  reusedBucket?: string;
  reusedPath?: string;
  imageGenerationWarning?: SceneImageGenerationWarning;
}

// Resolves one still PNG per scene via the SceneRenderer registry (IMAGE in Phase 2).
export async function generateSceneImages(
  input: GenerateSceneImagesInput,
): Promise<SceneImage[]> {
  const { scenes } = input;
  if (scenes.length === 0) {
    throw new Error("generateSceneImages: at least one scene is required");
  }

  ensureSceneRendererRegistry();

  const ctx = {
    projectId: input.projectId,
    videoJobId: input.videoJobId,
    visualProfile: input.visualProfile,
    visualProfileVersion: input.visualProfileVersion,
  };

  const results: SceneImage[] = [];
  for (const scene of scenes) {
    const prepared = await prepareSceneRaster(scene, ctx);
    results.push({
      sceneId: prepared.sceneId,
      imagePath: prepared.imagePath,
      ...(prepared.reusedBucket ? { reusedBucket: prepared.reusedBucket } : {}),
      ...(prepared.reusedPath ? { reusedPath: prepared.reusedPath } : {}),
      ...(prepared.imageGenerationWarning
        ? { imageGenerationWarning: prepared.imageGenerationWarning }
        : {}),
    });
  }

  return results;
}
