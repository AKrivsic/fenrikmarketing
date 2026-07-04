import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { editImageWithProvider } from "@/lib/ai/imageEdit";
import { getImageProvider } from "@/lib/ai";
import {
  fetchWithRetry,
  HTTP_MAX_ATTEMPTS,
  HTTP_TIMEOUT_MS,
} from "@/lib/http/fetchWithRetry";
import { VIDEO_SCENE_IMAGE_SIZE } from "@/lib/video-engine/videoSceneImageSize";
import { sanitizeImagePrompt } from "@/video-worker/services/imagePrompt";
import {
  downloadStorageObjectToFile,
  uploadVideoArtifact,
} from "@/video-worker/services/storage";

export interface EditSceneImageInput {
  projectId: string;
  sourceVideoJobId: string;
  sceneId: string;
  imageBucket: string;
  imagePath: string;
  instruction: string;
}

export interface EditSceneImageResult {
  image_bucket: string;
  image_path: string;
}

function workerTempDir(): string {
  return (
    process.env.VIDEO_WORKER_TEMP_DIR ?? join(process.cwd(), ".video-worker-tmp")
  );
}

function mimeFromPath(storagePath: string): "image/png" | "image/jpeg" {
  const lower = storagePath.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  return "image/png";
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
      throw new Error(`failed to download edited image (${res.status})`);
    }
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error("image provider returned neither imageBase64 nor imageUrl");
}

export async function editSceneImage(
  input: EditSceneImageInput,
): Promise<EditSceneImageResult> {
  const instruction = sanitizeImagePrompt(input.instruction.trim());
  if (!instruction) {
    throw new Error("instruction is required");
  }

  const dir = workerTempDir();
  await mkdir(dir, { recursive: true });
  const sourceLocal = join(
    dir,
    `scene-edit-source-${input.sourceVideoJobId}-${input.sceneId}${mimeFromPath(input.imagePath) === "image/jpeg" ? ".jpg" : ".png"}`,
  );

  await downloadStorageObjectToFile({
    bucket: input.imageBucket,
    storagePath: input.imagePath,
    localPath: sourceLocal,
  });

  const sourceBytes = await readFile(sourceLocal);
  const provider = getImageProvider();
  const edited = await editImageWithProvider(provider, {
    sourceImageBytes: sourceBytes,
    mimeType: mimeFromPath(input.imagePath),
    instruction,
    size: VIDEO_SCENE_IMAGE_SIZE,
  });

  const bytes = await resolveImageBytes(edited.imageBase64, edited.imageUrl);
  const outputLocal = join(
    dir,
    `scene-edit-out-${input.sourceVideoJobId}-${input.sceneId}.png`,
  );
  await writeFile(outputLocal, bytes);

  const upload = await uploadVideoArtifact({
    projectId: input.projectId,
    videoJobId: input.sourceVideoJobId,
    artifactType: "png",
    localPath: outputLocal,
    filename: `scene-editor-edit-${input.sceneId}-${Date.now()}.png`,
  });

  return {
    image_bucket: upload.bucket,
    image_path: upload.storagePath,
  };
}
