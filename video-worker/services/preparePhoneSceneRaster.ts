import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getImageProvider } from "@/lib/ai";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { composePhoneRasterPng } from "@/lib/scene-types/phone/composePhoneRaster";
import {
  parsePhoneScenePayload,
  phonePlaceholderImagePrompt,
} from "@/lib/scene-types/phone/phoneScenePayload";
import type { SceneRasterPrepareContext } from "@/lib/scene-types/renderers/types";
import type { Scene } from "@/lib/video-engine/schemas/sceneSchema";
import { VIDEO_SCENE_IMAGE_SIZE } from "@/lib/video-engine/videoSceneImageSize";
import { downloadStorageObjectToFile } from "@/video-worker/services/storage";
import { sanitizeImagePrompt } from "@/video-worker/services/imagePrompt";
import { loadRenderBrandTokensForWorker } from "@/video-worker/services/loadRenderBrandTokens";
import {
  fetchWithRetry,
  HTTP_MAX_ATTEMPTS,
  HTTP_TIMEOUT_MS,
} from "@/lib/http/fetchWithRetry";

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
        label: "phone-ui-image-download",
      },
    );
    if (!res.ok) {
      throw new Error(`failed to download phone UI image (${res.status})`);
    }
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error("image provider returned neither imageBase64 nor imageUrl");
}

async function loadAssetPng(projectId: string, assetId: string): Promise<Buffer> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("assets")
    .select("storage_bucket, storage_path, media_type")
    .eq("project_id", projectId)
    .eq("id", assetId)
    .maybeSingle();
  if (error || !data) {
    throw new Error(`phone scene asset ${assetId} not found`);
  }
  const bucket = data.storage_bucket as string | null;
  const path = data.storage_path as string | null;
  if (!bucket || !path || data.media_type !== "image") {
    throw new Error(`phone scene asset ${assetId} is not a stored image`);
  }
  const tmp = join(workerTempDir(), `phone-asset-${assetId}.png`);
  await mkdir(workerTempDir(), { recursive: true });
  await downloadStorageObjectToFile({
    bucket,
    storagePath: path,
    localPath: tmp,
  });
  return readFile(tmp);
}

async function generateUiScreenPng(prompt: string): Promise<Buffer> {
  const provider = getImageProvider();
  const result = await provider.generateImage({
    prompt: sanitizeImagePrompt(
      `${prompt}. Portrait mobile app UI screenshot, realistic interface, no device frame.`,
    ),
    size: VIDEO_SCENE_IMAGE_SIZE,
  });
  return resolveImageBytes(result.imageBase64, result.imageUrl);
}

/** PHONE scene raster — frame + screen + optional caption (no animation). */
export async function preparePhoneSceneRaster(
  scene: Scene,
  ctx: SceneRasterPrepareContext,
): Promise<{ sceneId: string; imagePath: string }> {
  const rawPayload = scene.payload_snapshot ?? {};
  const parsed = parsePhoneScenePayload(rawPayload);
  if (!parsed.ok) {
    throw new Error(`scene ${scene.id}: invalid phone payload — ${parsed.reason}`);
  }

  if (scene.image_bucket && scene.image_path) {
    const dir = workerTempDir();
    await mkdir(dir, { recursive: true });
    const imagePath = join(dir, `scene-${ctx.videoJobId}-${scene.id}.png`);
    await downloadStorageObjectToFile({
      bucket: scene.image_bucket,
      storagePath: scene.image_path,
      localPath: imagePath,
    });
    console.log(
      "[video-worker] Reusing phone raster from storage",
      JSON.stringify({ scene_id: scene.id }),
    );
    return { sceneId: scene.id, imagePath };
  }

  let screenPng: Buffer;
  if (parsed.data.asset_id) {
    screenPng = await loadAssetPng(ctx.projectId, parsed.data.asset_id);
  } else {
    screenPng = await generateUiScreenPng(parsed.data.image_prompt!);
  }

  const tokens = await loadRenderBrandTokensForWorker(ctx, "dark");

  const { png, metadata } = await composePhoneRasterPng({
    payload: parsed.data,
    screenPng,
    backgroundTop: tokens.backgroundColor,
    backgroundBottom: tokens.backgroundColor,
  });

  const dir = workerTempDir();
  await mkdir(dir, { recursive: true });
  const imagePath = join(dir, `scene-${ctx.videoJobId}-${scene.id}.png`);
  await writeFile(imagePath, png);

  console.log(
    "[video-worker] Composed phone scene raster",
    JSON.stringify({
      scene_id: scene.id,
      layout: metadata,
      prompt: phonePlaceholderImagePrompt(scene.id, parsed.data.caption),
    }),
  );

  return { sceneId: scene.id, imagePath };
}
