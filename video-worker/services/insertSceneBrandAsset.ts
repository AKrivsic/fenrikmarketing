import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { editImageWithProvider } from "@/lib/ai/imageEdit";
import { getImageProvider } from "@/lib/ai";
import {
  fetchWithRetry,
  HTTP_MAX_ATTEMPTS,
  HTTP_TIMEOUT_MS,
} from "@/lib/http/fetchWithRetry";
import { normalizeBrandAssetInsertInstruction } from "@/lib/video-scene-editor/brandAssetInstruction";
import {
  downloadStorageObjectToFile,
  uploadVideoArtifact,
} from "@/video-worker/services/storage";

export interface InsertSceneBrandAssetInput {
  projectId: string;
  sourceVideoJobId: string;
  sceneId: string;
  sceneImageBucket: string;
  sceneImagePath: string;
  assetBucket: string;
  assetPath: string;
  instruction: string;
}

export interface InsertSceneBrandAssetResult {
  image_bucket: string;
  image_path: string;
  provider: string;
  model: string;
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

export async function insertSceneBrandAsset(
  input: InsertSceneBrandAssetInput,
): Promise<InsertSceneBrandAssetResult> {
  // Brand-asset insert must keep logo/placement wording intact. The scene-gen
  // sanitizer strips "logo" clauses and forbids logos in the output image.
  const instruction = normalizeBrandAssetInsertInstruction(input.instruction);
  if (!instruction) {
    throw new Error("instruction is required");
  }

  const dir = workerTempDir();
  await mkdir(dir, { recursive: true });
  const sceneLocal = join(
    dir,
    `scene-brand-src-${input.sourceVideoJobId}-${input.sceneId}${mimeFromPath(input.sceneImagePath) === "image/jpeg" ? ".jpg" : ".png"}`,
  );
  const assetLocal = join(
    dir,
    `scene-brand-asset-${input.sourceVideoJobId}-${input.sceneId}${mimeFromPath(input.assetPath) === "image/jpeg" ? ".jpg" : ".png"}`,
  );

  await downloadStorageObjectToFile({
    bucket: input.sceneImageBucket,
    storagePath: input.sceneImagePath,
    localPath: sceneLocal,
  });
  await downloadStorageObjectToFile({
    bucket: input.assetBucket,
    storagePath: input.assetPath,
    localPath: assetLocal,
  });

  const sceneBytes = await readFile(sceneLocal);
  const assetBytes = await readFile(assetLocal);
  const provider = getImageProvider();
  const edited = await editImageWithProvider(provider, {
    sourceImageBytes: sceneBytes,
    mimeType: mimeFromPath(input.sceneImagePath),
    instruction,
    size: "1024x1024",
    additionalImages: [
      {
        imageBytes: assetBytes,
        mimeType: mimeFromPath(input.assetPath),
        role: "logo",
      },
    ],
  });

  const bytes = await resolveImageBytes(edited.imageBase64, edited.imageUrl);
  const outputLocal = join(
    dir,
    `scene-brand-out-${input.sourceVideoJobId}-${input.sceneId}.png`,
  );
  await writeFile(outputLocal, bytes);

  const upload = await uploadVideoArtifact({
    projectId: input.projectId,
    videoJobId: input.sourceVideoJobId,
    artifactType: "png",
    localPath: outputLocal,
    filename: `scene-editor-brand-${input.sceneId}-${Date.now()}.png`,
  });

  return {
    image_bucket: upload.bucket,
    image_path: upload.storagePath,
    provider: edited.provider,
    model: edited.model,
  };
}
