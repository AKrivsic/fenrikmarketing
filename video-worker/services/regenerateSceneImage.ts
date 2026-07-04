import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getImageProvider } from "@/lib/ai";
import {
  fetchWithRetry,
  HTTP_MAX_ATTEMPTS,
  HTTP_TIMEOUT_MS,
} from "@/lib/http/fetchWithRetry";
import { VIDEO_SCENE_IMAGE_SIZE } from "@/lib/video-engine/videoSceneImageSize";
import { sanitizeImagePrompt } from "@/video-worker/services/imagePrompt";
import { uploadVideoArtifact } from "@/video-worker/services/storage";

export interface RegenerateSceneImageInput {
  projectId: string;
  sourceVideoJobId: string;
  sceneId: string;
  imagePrompt: string;
  instruction: string;
}

export interface RegenerateSceneImageResult {
  image_bucket: string;
  image_path: string;
}

function workerTempDir(): string {
  return (
    process.env.VIDEO_WORKER_TEMP_DIR ?? join(process.cwd(), ".video-worker-tmp")
  );
}

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

export async function regenerateSceneImage(
  input: RegenerateSceneImageInput,
): Promise<RegenerateSceneImageResult> {
  const instruction = input.instruction.trim();
  if (!instruction) {
    throw new Error("instruction is required");
  }

  const combinedPrompt = sanitizeImagePrompt(
    `${input.imagePrompt.trim()}\n\nEdit instruction: ${instruction}`,
  );

  const provider = getImageProvider();
  const generated = await provider.generateImage({
    prompt: combinedPrompt,
    size: VIDEO_SCENE_IMAGE_SIZE,
  });
  const bytes = await resolveImageBytes(
    generated.imageBase64,
    generated.imageUrl,
  );

  const dir = workerTempDir();
  await mkdir(dir, { recursive: true });
  const localPath = join(
    dir,
    `scene-editor-${input.sourceVideoJobId}-${input.sceneId}.png`,
  );
  await writeFile(localPath, bytes);

  const upload = await uploadVideoArtifact({
    projectId: input.projectId,
    videoJobId: input.sourceVideoJobId,
    artifactType: "png",
    localPath,
    filename: `scene-editor-${input.sceneId}.png`,
  });

  return {
    image_bucket: upload.bucket,
    image_path: upload.storagePath,
  };
}
