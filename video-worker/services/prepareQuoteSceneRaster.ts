import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";
import { loadRenderBrandTokensForWorker } from "@/video-worker/services/loadRenderBrandTokens";
import { composeQuoteRasterPng } from "@/lib/scene-types/quote/composeQuoteRaster";
import {
  parseQuoteScenePayload,
  quotePlaceholderImagePrompt,
} from "@/lib/scene-types/quote/quoteScenePayload";
import type { SceneRasterPrepareContext } from "@/lib/scene-types/renderers/types";
import type { Scene } from "@/lib/video-engine/schemas/sceneSchema";
import { downloadStorageObjectToFile } from "@/video-worker/services/storage";

function workerTempDir(): string {
  return (
    process.env.VIDEO_WORKER_TEMP_DIR ?? join(process.cwd(), ".video-worker-tmp")
  );
}

async function loadLogoPng(
  projectId: string,
  logoAssetId: string,
): Promise<Buffer | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("assets")
    .select("storage_bucket, storage_path, media_type")
    .eq("project_id", projectId)
    .eq("id", logoAssetId)
    .maybeSingle();
  if (error || !data) return null;
  const bucket = data.storage_bucket as string | null;
  const path = data.storage_path as string | null;
  if (!bucket || !path || data.media_type !== "image") return null;
  const tmp = join(workerTempDir(), `quote-logo-${logoAssetId}.png`);
  await mkdir(workerTempDir(), { recursive: true });
  await downloadStorageObjectToFile({
    bucket,
    storagePath: path,
    localPath: tmp,
  });
  return readFile(tmp);
}

/** QUOTE scene raster — Sharp + SVG (no image provider). */
export async function prepareQuoteSceneRaster(
  scene: Scene,
  ctx: SceneRasterPrepareContext,
): Promise<{
  sceneId: string;
  imagePath: string;
}> {
  const rawPayload = scene.payload_snapshot ?? {};
  const parsed = parseQuoteScenePayload(rawPayload);
  if (!parsed.ok) {
    throw new Error(
      `scene ${scene.id}: invalid quote payload — ${parsed.reason}`,
    );
  }

  if (scene.image_bucket && scene.image_path) {
    const dir = workerTempDir();
    await mkdir(dir, { recursive: true });
    const imagePath = join(dir, `scene-${ctx.videoJobId}-${scene.id}.png`);
    try {
      await downloadStorageObjectToFile({
        bucket: scene.image_bucket,
        storagePath: scene.image_path,
        localPath: imagePath,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (ctx.forbidImageGeneration || ctx.isLanguageVariant) {
        throw new Error(
          `language_variant_visual_asset_missing: scene ${scene.id} failed to download quote raster (${message})`,
        );
      }
      throw err;
    }
    console.log(
      "[video-worker] Reusing quote raster from storage",
      JSON.stringify({ scene_id: scene.id }),
    );
    return {
      sceneId: scene.id,
      imagePath,
      reusedBucket: scene.image_bucket,
      reusedPath: scene.image_path,
    };
  }

  if (ctx.forbidImageGeneration || ctx.isLanguageVariant) {
    throw new Error(
      `language_variant_visual_asset_missing: scene ${scene.id} missing durable quote raster; recomposition forbidden for language variants`,
    );
  }

  const tokens = await loadRenderBrandTokensForWorker(ctx, "dark");

  let logoPng: Buffer | null = null;
  if (tokens.logoAssetId) {
    try {
      logoPng = await loadLogoPng(ctx.projectId, tokens.logoAssetId);
    } catch {
      logoPng = null;
    }
  }

  const { png, metadata } = await composeQuoteRasterPng({
    payload: parsed.data,
    tokens,
    logoPng,
  });

  const dir = workerTempDir();
  await mkdir(dir, { recursive: true });
  const imagePath = join(dir, `scene-${ctx.videoJobId}-${scene.id}.png`);
  await writeFile(imagePath, png);

  console.log(
    "[video-worker] Composed quote scene raster",
    JSON.stringify({
      scene_id: scene.id,
      layout: metadata,
      prompt: quotePlaceholderImagePrompt(scene.id),
    }),
  );

  return { sceneId: scene.id, imagePath };
}
