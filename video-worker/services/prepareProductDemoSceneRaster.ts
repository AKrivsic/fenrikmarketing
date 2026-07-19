import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { composeProductDemoRaster } from "@/lib/scene-types/product-demo/composeProductDemoRaster";
import {
  parseProductDemoScenePayload,
  productDemoPlaceholderImagePrompt,
} from "@/lib/scene-types/product-demo/productDemoBeat";
import { RenderProductDemoFailedError } from "@/lib/scene-types/presentation/renderFidelity";
import type { SceneRasterPrepareContext } from "@/lib/scene-types/renderers/types";
import type { Scene } from "@/lib/video-engine/schemas/sceneSchema";
import { downloadStorageObjectToFile } from "@/video-worker/services/storage";

function workerTempDir(): string {
  return (
    process.env.VIDEO_WORKER_TEMP_DIR ?? join(process.cwd(), ".video-worker-tmp")
  );
}

/** PRODUCT_DEMO scene raster — deterministic Fenrik chat UI (no image model). */
export async function prepareProductDemoSceneRaster(
  scene: Scene,
  ctx: SceneRasterPrepareContext,
): Promise<{
  sceneId: string;
  imagePath: string;
}> {
  const rawPayload = scene.payload_snapshot ?? {};
  const parsed = parseProductDemoScenePayload(rawPayload);
  if (!parsed.ok) {
    throw new RenderProductDemoFailedError(
      `render_product_demo_failed: invalid product_demo payload — ${parsed.reason}`,
      {
        stage: "prepare_product_demo_scene_raster",
        scene_id: scene.id,
        reason: parsed.reason,
      },
    );
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
      "[video-worker] Reusing product_demo raster from storage",
      JSON.stringify({ scene_id: scene.id }),
    );
    return { sceneId: scene.id, imagePath };
  }

  let png: Buffer;
  let metadata: {
    questionVisible: boolean;
    aiAnswerVisible: boolean;
    outcomeVisible: boolean;
  };
  try {
    const composed = await composeProductDemoRaster(parsed.data);
    png = composed.png;
    metadata = composed.metadata;
  } catch (err) {
    throw new RenderProductDemoFailedError(
      `render_product_demo_failed: ${
        err instanceof Error ? err.message : "compose failed"
      }`,
      {
        stage: "prepare_product_demo_scene_raster",
        scene_id: scene.id,
        reason: err instanceof Error ? err.message : "compose failed",
      },
    );
  }

  const dir = workerTempDir();
  await mkdir(dir, { recursive: true });
  const imagePath = join(dir, `scene-${ctx.videoJobId}-${scene.id}.png`);
  await writeFile(imagePath, png);

  console.log(
    "[video-worker] Composed product_demo scene raster",
    JSON.stringify({
      scene_id: scene.id,
      layout: metadata,
      prompt: productDemoPlaceholderImagePrompt(scene.id),
    }),
  );

  return { sceneId: scene.id, imagePath };
}
