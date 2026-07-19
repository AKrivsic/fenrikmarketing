import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";
import { loadRenderBrandTokensForWorker } from "@/video-worker/services/loadRenderBrandTokens";
import { composeCtaRasterPng } from "@/lib/scene-types/cta/composeCtaRaster";
import {
  parseCtaScenePayload,
  ctaPlaceholderImagePrompt,
} from "@/lib/scene-types/cta/ctaScenePayload";
import {
  pickCtaComposition,
  type CtaCompositionId,
} from "@/lib/scene-types/cta/ctaComposition";
import type {
  SceneRasterPrepareContext,
  SceneRasterPrepareResult,
} from "@/lib/scene-types/renderers/types";
import type { Scene } from "@/lib/video-engine/schemas/sceneSchema";
import { downloadStorageObjectToFile } from "@/video-worker/services/storage";

function workerTempDir(): string {
  return (
    process.env.VIDEO_WORKER_TEMP_DIR ?? join(process.cwd(), ".video-worker-tmp")
  );
}

async function loadAssetPng(
  projectId: string,
  assetId: string,
  suffix: string,
): Promise<Buffer | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("assets")
    .select("storage_bucket, storage_path, media_type")
    .eq("project_id", projectId)
    .eq("id", assetId)
    .maybeSingle();
  if (error || !data) return null;
  const bucket = data.storage_bucket as string | null;
  const path = data.storage_path as string | null;
  if (!bucket || !path || data.media_type !== "image") return null;
  const tmp = join(workerTempDir(), `cta-${suffix}-${assetId}.png`);
  await mkdir(workerTempDir(), { recursive: true });
  await downloadStorageObjectToFile({
    bucket,
    storagePath: path,
    localPath: tmp,
  });
  return readFile(tmp);
}

/** CTA scene raster — Sharp + SVG (no image provider). */
export async function prepareCtaSceneRaster(
  scene: Scene,
  ctx: SceneRasterPrepareContext,
): Promise<SceneRasterPrepareResult> {
  const rawPayload = scene.payload_snapshot ?? {};
  const parsed = parseCtaScenePayload(rawPayload);
  if (!parsed.ok) {
    throw new Error(`scene ${scene.id}: invalid cta payload — ${parsed.reason}`);
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
          `language_variant_visual_asset_missing: scene ${scene.id} failed to download cta raster (${message})`,
        );
      }
      throw err;
    }
    console.log(
      "[video-worker] Reusing cta raster from storage",
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
      `language_variant_visual_asset_missing: scene ${scene.id} missing durable cta raster; recomposition forbidden for language variants`,
    );
  }

  const tokens = await loadRenderBrandTokensForWorker(ctx, "dark");

  let logoPng: Buffer | null = null;
  if (parsed.data.show_logo !== false && tokens.logoAssetId) {
    try {
      logoPng = await loadAssetPng(ctx.projectId, tokens.logoAssetId, "logo");
    } catch {
      logoPng = null;
    }
  }

  let heroPng: Buffer | null = null;
  if (parsed.data.asset_id) {
    try {
      heroPng = await loadAssetPng(ctx.projectId, parsed.data.asset_id, "hero");
    } catch {
      heroPng = null;
    }
  }

  const composition: CtaCompositionId =
    parsed.data.composition ??
    pickCtaComposition({
      packageId: ctx.videoJobId,
      payload: parsed.data,
      funnelStage: null,
      recentCompositionIds: [],
      hasLogoAsset: Boolean(logoPng),
      hasHeroAsset: Boolean(heroPng),
      precedingSceneIsAsset: false,
    });

  const { png, metadata } = await composeCtaRasterPng({
    payload: parsed.data,
    tokens,
    logoPng,
    heroPng,
    composition,
  });

  const dir = workerTempDir();
  await mkdir(dir, { recursive: true });
  const imagePath = join(dir, `scene-${ctx.videoJobId}-${scene.id}.png`);
  await writeFile(imagePath, png);

  console.log(
    "[video-worker] Composed cta scene raster",
    JSON.stringify({
      scene_id: scene.id,
      layout: metadata,
      prompt: ctaPlaceholderImagePrompt(scene.id),
    }),
  );

  return { sceneId: scene.id, imagePath };
}
