import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getImageProvider } from "@/lib/ai";
import type { Scene } from "@/lib/video-engine/schemas/sceneSchema";
import { downloadStorageObjectToFile } from "@/video-worker/services/storage";

export interface GenerateSceneImagesInput {
  scenes: Scene[];
  projectId: string;
  videoJobId: string;
}

export interface SceneImage {
  sceneId: string;
  imagePath: string;
  // Set only when the still was reused from an existing Storage object
  // (input scene carried image_bucket + image_path). Freshly generated images
  // leave these undefined; the caller uploads them and assigns durable paths.
  reusedBucket?: string;
  reusedPath?: string;
}

function workerTempDir(): string {
  return (
    process.env.VIDEO_WORKER_TEMP_DIR ?? join(process.cwd(), ".video-worker-tmp")
  );
}

// Pulls the bytes for one generated image. The shared ImageProvider may return
// either inline base64 (OpenAI gpt-image-1) or a remote URL; handle both.
async function resolveImageBytes(
  imageBase64: string | undefined,
  imageUrl: string | undefined,
): Promise<Buffer> {
  if (imageBase64) {
    return Buffer.from(imageBase64, "base64");
  }
  if (imageUrl) {
    const res = await fetch(imageUrl);
    if (!res.ok) {
      throw new Error(`failed to download generated image (${res.status})`);
    }
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error("image provider returned neither imageBase64 nor imageUrl");
}

// Resolves one still PNG per scene to a local temp file for the FFmpeg step.
//
// Reuse path: when a scene carries a durable Storage reference (image_bucket +
// image_path) the image is downloaded from Storage and NO image provider is
// called. This makes deterministic re-renders / language variants reuse the
// exact same visuals.
//
// Generation path (default / first render): the image is created through the
// ImageProvider abstraction (getImageProvider — no direct OpenAI import here)
// exactly as before. Any provider/download failure throws so the jobRunner can
// report a failed callback.
export async function generateSceneImages(
  input: GenerateSceneImagesInput,
): Promise<SceneImage[]> {
  const { scenes } = input;
  if (scenes.length === 0) {
    throw new Error("generateSceneImages: at least one scene is required");
  }

  const provider = getImageProvider();
  const dir = workerTempDir();
  await mkdir(dir, { recursive: true });

  const results: SceneImage[] = [];
  for (const scene of scenes) {
    const imagePath = join(dir, `scene-${input.videoJobId}-${scene.id}.png`);

    if (scene.image_bucket && scene.image_path) {
      await downloadStorageObjectToFile({
        bucket: scene.image_bucket,
        storagePath: scene.image_path,
        localPath: imagePath,
      });
      results.push({
        sceneId: scene.id,
        imagePath,
        reusedBucket: scene.image_bucket,
        reusedPath: scene.image_path,
      });
      continue;
    }

    const generated = await provider.generateImage({
      prompt: scene.image_prompt,
      size: "1024x1024",
    });
    const bytes = await resolveImageBytes(
      generated.imageBase64,
      generated.imageUrl,
    );
    await writeFile(imagePath, bytes);
    results.push({ sceneId: scene.id, imagePath });
  }

  return results;
}
