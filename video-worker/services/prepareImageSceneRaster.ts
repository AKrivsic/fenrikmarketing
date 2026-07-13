import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { getImageProvider } from "@/lib/ai";
import type { SceneRasterPrepareContext } from "@/lib/scene-types/renderers/types";
import type { Scene } from "@/lib/video-engine/schemas/sceneSchema";
import type { SceneImageGenerationWarning } from "@/lib/video-engine/sceneImageGenerationMeta";
import { downloadStorageObjectToFile } from "@/video-worker/services/storage";
import { parseVisualProfile } from "@/lib/visual-profile/visualProfile";
import { visualProfileImagePromptSuffix } from "@/lib/visual-profile/imagePromptProfile";
import { sanitizeImagePrompt } from "@/video-worker/services/imagePrompt";
import { generateSceneImageWithModerationFallback } from "@/video-worker/services/generateSceneImageWithModerationFallback";
import {
  shouldComposeAssetLayout,
  writeComposedAssetSceneFile,
} from "@/video-worker/services/assetSceneLayout";
import { coerceProductUiVideoUsage } from "@/lib/assets/productUiGuards";

function workerTempDir(): string {
  return (
    process.env.VIDEO_WORKER_TEMP_DIR ?? join(process.cwd(), ".video-worker-tmp")
  );
}

/** IMAGE scene raster preparation (reuse storage or AI generation). */
export async function prepareImageSceneRaster(
  scene: Scene,
  ctx: SceneRasterPrepareContext,
): Promise<{
  sceneId: string;
  imagePath: string;
  reusedBucket?: string;
  reusedPath?: string;
  imageGenerationWarning?: SceneImageGenerationWarning;
}> {
  const dir = workerTempDir();
  await mkdir(dir, { recursive: true });
  const imagePath = join(dir, `scene-${ctx.videoJobId}-${scene.id}.png`);

  if (scene.image_bucket && scene.image_path) {
    console.log(
      "[video-worker] Reusing scene image from storage; skipping image generation",
      JSON.stringify({
        scene_id: scene.id,
        bucket: scene.image_bucket,
        image_path: scene.image_path,
        local_path: imagePath,
      }),
    );
    await downloadStorageObjectToFile({
      bucket: scene.image_bucket,
      storagePath: scene.image_path,
      localPath: imagePath,
    });

    const assetMetadata = scene.asset_metadata;
    const videoUsage =
      coerceProductUiVideoUsage(scene.video_usage, assetMetadata) ??
      scene.video_usage;

    if (shouldComposeAssetLayout(videoUsage)) {
      const raw = await readFile(imagePath);
      await writeComposedAssetSceneFile({
        assetBytes: raw,
        videoUsage,
        assetMetadata,
        outputPath: imagePath,
      });
      console.log(
        "[video-worker] Composed asset scene layout",
        JSON.stringify({
          scene_id: scene.id,
          video_usage: videoUsage ?? scene.video_usage ?? "floating_card",
        }),
      );
    }

    return {
      sceneId: scene.id,
      imagePath,
      reusedBucket: scene.image_bucket,
      reusedPath: scene.image_path,
    };
  }

  console.log(
    "[video-worker] Generating scene image",
    JSON.stringify({
      video_job_id: ctx.videoJobId,
      scene_id: scene.id,
    }),
  );
  const provider = getImageProvider();
  const profile = parseVisualProfile(ctx.visualProfile ?? "");
  const profileSuffix = profile ? visualProfileImagePromptSuffix(profile) : "";
  const promptWithProfile = profileSuffix
    ? `${scene.image_prompt.trim()} ${profileSuffix}`
    : scene.image_prompt;
  const safePrompt = sanitizeImagePrompt(promptWithProfile);
  const { meta } = await generateSceneImageWithModerationFallback({
    provider,
    ctx,
    sceneId: scene.id,
    primaryPrompt: safePrompt,
    profileSuffix,
    outputPath: imagePath,
  });

  const hasWarning =
    meta.original_generation_blocked ||
    meta.safe_retry_attempted ||
    meta.local_fallback_used;

  return {
    sceneId: scene.id,
    imagePath,
    ...(hasWarning
      ? {
          imageGenerationWarning: {
            scene_id: scene.id,
            ...meta,
          },
        }
      : {}),
  };
}
