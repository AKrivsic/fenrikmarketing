import type { Scene } from "@/lib/video-engine/schemas/sceneSchema";
import type { SceneImageGenerationWarning } from "@/lib/video-engine/sceneImageGenerationMeta";
import type { CreativeIdentity } from "@/lib/creative-identity/types";
import {
  DEFAULT_SCENE_TYPE,
  effectiveSceneType,
  type SceneType,
} from "@/lib/scene-types/sceneType";
import { isChecklistProductionEnabledForProject } from "@/lib/scene-types/checklistProductionRollout";
import { shouldRenderPhoneScenes } from "@/lib/scene-types/phone/phoneRenderGate";
import { shouldRenderQuoteScenes } from "@/lib/scene-types/quote/quoteRenderGate";
import { shouldRenderStatisticScenes } from "@/lib/scene-types/statistic/statisticRenderGate";
import { shouldRenderCtaScenes } from "@/lib/scene-types/cta/ctaRenderGate";

export interface SceneRasterPrepareContext {
  projectId: string;
  videoJobId: string;
  visualProfile?: string;
  visualProfileVersion?: string;
  /** Creative Identity v1 — stable staging axes for all AI image scenes in this job. */
  creativeIdentity?: CreativeIdentity | null;
}

export interface SceneRasterPrepareResult {
  sceneId: string;
  imagePath: string;
  reusedBucket?: string;
  reusedPath?: string;
  imageGenerationWarning?: SceneImageGenerationWarning;
}

export interface SceneRenderer {
  readonly type: SceneType;
  readonly version: string;
  prepareRaster(
    scene: Scene,
    ctx: SceneRasterPrepareContext,
  ): Promise<SceneRasterPrepareResult>;
}

export type SceneRasterPrepareFn = (
  scene: Scene,
  ctx: SceneRasterPrepareContext,
) => Promise<SceneRasterPrepareResult>;

const renderers = new Map<SceneType, SceneRenderer>();

export function registerSceneRenderer(renderer: SceneRenderer): void {
  renderers.set(renderer.type, renderer);
}

export function getSceneRenderer(type: SceneType): SceneRenderer {
  const renderer = renderers.get(type);
  if (!renderer) {
    throw new Error(`no SceneRenderer registered for type ${type}`);
  }
  return renderer;
}

export function getRegisteredSceneRendererTypes(): SceneType[] {
  return Array.from(renderers.keys());
}

export function assertSceneRenderable(
  scene: Scene,
  ctx?: SceneRasterPrepareContext,
): SceneType {
  const declared = effectiveSceneType(
    (scene as Scene & { type?: string }).type,
    DEFAULT_SCENE_TYPE,
  );

  let type = declared;
  if (
    type === "CHECKLIST" &&
    (!ctx || !isChecklistProductionEnabledForProject(ctx.projectId))
  ) {
    type = DEFAULT_SCENE_TYPE;
  }
  if (type === "PHONE" && (!ctx || !shouldRenderPhoneScenes())) {
    type = DEFAULT_SCENE_TYPE;
  }
  if (type === "QUOTE" && (!ctx || !shouldRenderQuoteScenes())) {
    type = DEFAULT_SCENE_TYPE;
  }
  if (type === "STATISTIC" && (!ctx || !shouldRenderStatisticScenes())) {
    type = DEFAULT_SCENE_TYPE;
  }
  if (type === "CTA" && (!ctx || !shouldRenderCtaScenes())) {
    type = DEFAULT_SCENE_TYPE;
  }

  if (type !== DEFAULT_SCENE_TYPE) {
    if (!renderers.has(type)) {
      throw new Error(
        `scene ${scene.id}: type ${type} has no renderer implementation yet`,
      );
    }
    return type;
  }

  if (!renderers.has(type)) {
    throw new Error(`scene ${scene.id}: missing renderer for type ${type}`);
  }

  return type;
}

export async function prepareSceneRaster(
  scene: Scene,
  ctx: SceneRasterPrepareContext,
): Promise<SceneRasterPrepareResult> {
  const type = assertSceneRenderable(scene, ctx);
  const renderer = getSceneRenderer(type);
  return renderer.prepareRaster(scene, ctx);
}
