import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getImageProvider } from "@/lib/ai";
import {
  fetchWithRetry,
  HTTP_MAX_ATTEMPTS,
  HTTP_TIMEOUT_MS,
} from "@/lib/http/fetchWithRetry";
import type { SceneRasterPrepareContext } from "@/lib/scene-types/renderers/types";
import type { Scene } from "@/lib/video-engine/schemas/sceneSchema";
import { VIDEO_SCENE_IMAGE_SIZE } from "@/lib/video-engine/videoSceneImageSize";
import { downloadStorageObjectToFile } from "@/video-worker/services/storage";
import { parseVisualProfile } from "@/lib/visual-profile/visualProfile";
import { visualProfileImagePromptSuffix } from "@/lib/visual-profile/imagePromptProfile";
import { sanitizeImagePrompt } from "@/video-worker/services/imagePrompt";
import {
  shouldComposeAssetLayout,
  writeComposedAssetSceneFile,
} from "@/video-worker/services/assetSceneLayout";

async function resolveImageBytes(
  imageBase64: string | undefined,
  imageUrl: string | undefined,
): Promise<Buffer> {
  if (imageBase64) {
    return Buffer.from(imageBase64, "base64");
  }
  if (imageUrl) {
    const res = await fetchWithRetry(
      imageUrl,
      { method: "GET" },
      {
        timeoutMs: HTTP_TIMEOUT_MS.ai,
        maxAttempts: HTTP_MAX_ATTEMPTS.ai,
        label: "image-download",
      },
    );
    if (!res.ok) {
      throw new Error(`failed to download generated image (${res.status})`);
    }
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error("image provider returned neither imageBase64 nor imageUrl");
}

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

    if (shouldComposeAssetLayout(scene.video_usage)) {
      const raw = await readFile(imagePath);
      await writeComposedAssetSceneFile({
        assetBytes: raw,
        videoUsage: scene.video_usage,
        outputPath: imagePath,
      });
      console.log(
        "[video-worker] Composed asset scene layout",
        JSON.stringify({
          scene_id: scene.id,
          video_usage: scene.video_usage ?? "floating_card",
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
    JSON.stringify({ scene_id: scene.id }),
  );
  const provider = getImageProvider();
  const profile = parseVisualProfile(ctx.visualProfile ?? "");
  const profileSuffix = profile ? visualProfileImagePromptSuffix(profile) : "";
  const promptWithProfile = profileSuffix
    ? `${scene.image_prompt.trim()} ${profileSuffix}`
    : scene.image_prompt;
  const safePrompt = sanitizeImagePrompt(promptWithProfile);
  const generated = await provider.generateImage({
    prompt: safePrompt,
    size: VIDEO_SCENE_IMAGE_SIZE,
  });
  const bytes = await resolveImageBytes(
    generated.imageBase64,
    generated.imageUrl,
  );
  await writeFile(imagePath, bytes);
  return { sceneId: scene.id, imagePath };
}
