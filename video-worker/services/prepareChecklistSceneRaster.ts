import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";
import { composeChecklistRasterPng } from "@/lib/scene-types/checklist/composeChecklistRaster";
import { loadRenderBrandTokensForWorker } from "@/video-worker/services/loadRenderBrandTokens";
import {
  parseChecklistScenePayload,
  checklistPlaceholderImagePrompt,
} from "@/lib/scene-types/checklist/checklistScenePayload";
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
  const tmp = join(workerTempDir(), `checklist-logo-${logoAssetId}.png`);
  await mkdir(workerTempDir(), { recursive: true });
  await downloadStorageObjectToFile({
    bucket,
    storagePath: path,
    localPath: tmp,
  });
  return readFile(tmp);
}

/** CHECKLIST scene raster — Sharp + SVG composition (no image provider). */
export async function prepareChecklistSceneRaster(
  scene: Scene,
  ctx: SceneRasterPrepareContext,
): Promise<{
  sceneId: string;
  imagePath: string;
}> {
  const rawPayload = scene.payload_snapshot ?? {};
  const parsed = parseChecklistScenePayload(rawPayload);
  if (!parsed.ok) {
    throw new Error(
      `scene ${scene.id}: invalid checklist payload — ${parsed.reason}`,
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
      "[video-worker] Reusing checklist raster from storage",
      JSON.stringify({ scene_id: scene.id }),
    );
    return { sceneId: scene.id, imagePath };
  }

  const tokens = await loadRenderBrandTokensForWorker(
    ctx,
    parsed.data.background_style,
  );

  let logoPng: Buffer | null = null;
  if (tokens.logoAssetId) {
    try {
      logoPng = await loadLogoPng(ctx.projectId, tokens.logoAssetId);
    } catch {
      logoPng = null;
    }
  }

  const { png, metadata } = await composeChecklistRasterPng({
    payload: parsed.data,
    tokens,
    logoPng,
  });

  const dir = workerTempDir();
  await mkdir(dir, { recursive: true });
  const imagePath = join(dir, `scene-${ctx.videoJobId}-${scene.id}.png`);
  await writeFile(imagePath, png);

  console.log(
    "[video-worker] Composed checklist scene raster",
    JSON.stringify({
      scene_id: scene.id,
      layout: metadata,
      prompt: checklistPlaceholderImagePrompt(scene.id, parsed.data.title),
    }),
  );

  return { sceneId: scene.id, imagePath };
}
