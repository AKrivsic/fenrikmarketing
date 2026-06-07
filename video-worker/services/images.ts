import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getImageProvider } from "@/lib/ai";
import type { Scene } from "@/lib/video-engine/schemas/sceneSchema";

export interface GenerateSceneImagesInput {
  scenes: Scene[];
  projectId: string;
  videoJobId: string;
}

export interface SceneImage {
  sceneId: string;
  imagePath: string;
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

// Generates one PNG per scene through the ImageProvider abstraction
// (getImageProvider — no direct OpenAI import here). Writes each image to a temp
// file for the FFmpeg step. Any provider/download failure throws so the
// jobRunner can report a failed callback.
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
    const generated = await provider.generateImage({
      prompt: scene.image_prompt,
      size: "1024x1024",
    });
    const bytes = await resolveImageBytes(
      generated.imageBase64,
      generated.imageUrl,
    );
    const imagePath = join(
      dir,
      `scene-${input.videoJobId}-${scene.id}.png`,
    );
    await writeFile(imagePath, bytes);
    results.push({ sceneId: scene.id, imagePath });
  }

  return results;
}
