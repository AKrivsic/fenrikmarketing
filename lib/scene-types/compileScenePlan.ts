import type { SupabaseClient } from "@supabase/supabase-js";
import {
  resolveVisualPlanToRenderScenes,
  type VisualScenePlanItem,
} from "@/lib/content-package/visualScenePlan";
import {
  normalizeVisualSceneEntries,
  visualSceneToPlanItem,
} from "@/lib/scene-types/normalizeVisualScene";
import { isSceneTypesEnabled } from "@/lib/scene-types/config";
import {
  checklistPlaceholderImagePrompt,
  parseChecklistScenePayload,
} from "@/lib/scene-types/checklist/checklistScenePayload";
import {
  parsePhoneScenePayload,
  phonePlaceholderImagePrompt,
} from "@/lib/scene-types/phone/phoneScenePayload";
import { DEFAULT_SCENE_TYPE, type SceneType } from "@/lib/scene-types/sceneType";
import type { VisualScene } from "@/lib/scene-types/visualScene";
import type { Scene } from "@/lib/video-engine/schemas/sceneSchema";
import { IMAGE_SCENE_RENDERER_VERSION } from "@/lib/scene-types/renderers/imageSceneRenderer";
import { CHECKLIST_SCENE_RENDERER_VERSION } from "@/lib/scene-types/renderers/checklistSceneRenderer";
import { PHONE_SCENE_RENDERER_VERSION } from "@/lib/scene-types/renderers/phoneSceneRenderer";
import {
  parseQuoteScenePayload,
  quotePlaceholderImagePrompt,
} from "@/lib/scene-types/quote/quoteScenePayload";
import { QUOTE_SCENE_RENDERER_VERSION } from "@/lib/scene-types/renderers/quoteSceneRenderer";
import {
  parseStatisticScenePayload,
  statisticPlaceholderImagePrompt,
} from "@/lib/scene-types/statistic/statisticScenePayload";
import { STATISTIC_SCENE_RENDERER_VERSION } from "@/lib/scene-types/renderers/statisticSceneRenderer";
import {
  parseCtaScenePayload,
  ctaPlaceholderImagePrompt,
} from "@/lib/scene-types/cta/ctaScenePayload";
import { CTA_SCENE_RENDERER_VERSION } from "@/lib/scene-types/renderers/ctaSceneRenderer";

const DEFAULT_SCENE_DURATION_SECONDS = 4;

export type CompiledWorkerScene = Scene & {
  type: SceneType;
  payload_snapshot: Record<string, unknown>;
  renderer_version: string;
};

export function normalizePackageVisualScenes(
  entries: readonly unknown[] | undefined,
): VisualScene[] {
  if (!entries || entries.length === 0) return [];
  return normalizeVisualSceneEntries(entries);
}

function assertCompilableVisualScenes(scenes: VisualScene[]): void {
  for (const scene of scenes) {
    if (scene.type === DEFAULT_SCENE_TYPE) continue;
    if (scene.type === "CHECKLIST" && isSceneTypesEnabled()) continue;
    if (scene.type === "PHONE" && isSceneTypesEnabled()) continue;
    if (scene.type === "QUOTE" && isSceneTypesEnabled()) continue;
    if (scene.type === "STATISTIC" && isSceneTypesEnabled()) continue;
    if (scene.type === "CTA" && isSceneTypesEnabled()) continue;
    throw new Error(
      `visual scene ${scene.id ?? "?"} has unsupported type ${scene.type}`,
    );
  }
}

export async function compileVisualScenesToWorkerScenes(
  supabase: SupabaseClient,
  projectId: string,
  visualScenes: VisualScene[],
): Promise<CompiledWorkerScene[]> {
  assertCompilableVisualScenes(visualScenes);

  const slots: (CompiledWorkerScene | null)[] = new Array(visualScenes.length).fill(
    null,
  );
  const imageScenes: VisualScene[] = [];
  const imageSlotIndexes: number[] = [];

  for (let i = 0; i < visualScenes.length; i++) {
    const scene = visualScenes[i]!;
    const id =
      typeof scene.id === "string" && scene.id.trim()
        ? scene.id.trim()
        : `scene-${i + 1}`;

    if (scene.type === "CHECKLIST") {
      const parsed = parseChecklistScenePayload(scene.payload);
      if (!parsed.ok) {
        throw new Error(
          `compileVisualScenesToWorkerScenes: checklist scene ${id} invalid — ${parsed.reason}`,
        );
      }
      slots[i] = {
        id,
        type: "CHECKLIST",
        image_prompt: checklistPlaceholderImagePrompt(id, parsed.data.title),
        duration_seconds: DEFAULT_SCENE_DURATION_SECONDS,
        payload_snapshot: parsed.data as unknown as Record<string, unknown>,
        renderer_version: CHECKLIST_SCENE_RENDERER_VERSION,
      };
      continue;
    }

    if (scene.type === "PHONE") {
      const parsed = parsePhoneScenePayload(scene.payload);
      if (!parsed.ok) {
        throw new Error(
          `compileVisualScenesToWorkerScenes: phone scene ${id} invalid — ${parsed.reason}`,
        );
      }
      slots[i] = {
        id,
        type: "PHONE",
        image_prompt: phonePlaceholderImagePrompt(id, parsed.data.caption),
        duration_seconds: DEFAULT_SCENE_DURATION_SECONDS,
        payload_snapshot: parsed.data as unknown as Record<string, unknown>,
        renderer_version: PHONE_SCENE_RENDERER_VERSION,
      };
      continue;
    }

    if (scene.type === "QUOTE") {
      const parsed = parseQuoteScenePayload(scene.payload);
      if (!parsed.ok) {
        throw new Error(
          `compileVisualScenesToWorkerScenes: quote scene ${id} invalid — ${parsed.reason}`,
        );
      }
      slots[i] = {
        id,
        type: "QUOTE",
        image_prompt: quotePlaceholderImagePrompt(id),
        duration_seconds: DEFAULT_SCENE_DURATION_SECONDS,
        payload_snapshot: parsed.data as unknown as Record<string, unknown>,
        renderer_version: QUOTE_SCENE_RENDERER_VERSION,
      };
      continue;
    }

    if (scene.type === "STATISTIC") {
      const parsed = parseStatisticScenePayload(scene.payload);
      if (!parsed.ok) {
        throw new Error(
          `compileVisualScenesToWorkerScenes: statistic scene ${id} invalid — ${parsed.reason}`,
        );
      }
      slots[i] = {
        id,
        type: "STATISTIC",
        image_prompt: statisticPlaceholderImagePrompt(id),
        duration_seconds: DEFAULT_SCENE_DURATION_SECONDS,
        payload_snapshot: parsed.data as unknown as Record<string, unknown>,
        renderer_version: STATISTIC_SCENE_RENDERER_VERSION,
      };
      continue;
    }

    if (scene.type === "CTA") {
      const parsed = parseCtaScenePayload(scene.payload);
      if (!parsed.ok) {
        throw new Error(
          `compileVisualScenesToWorkerScenes: cta scene ${id} invalid — ${parsed.reason}`,
        );
      }
      slots[i] = {
        id,
        type: "CTA",
        image_prompt: ctaPlaceholderImagePrompt(id),
        duration_seconds: DEFAULT_SCENE_DURATION_SECONDS,
        payload_snapshot: parsed.data as unknown as Record<string, unknown>,
        renderer_version: CTA_SCENE_RENDERER_VERSION,
      };
      continue;
    }

    imageScenes.push(scene);
    imageSlotIndexes.push(i);
  }

  if (imageScenes.length > 0) {
    const plan: VisualScenePlanItem[] = [];
    for (const scene of imageScenes) {
      const item = visualSceneToPlanItem(scene);
      if (!item) {
        throw new Error(
          `compileVisualScenesToWorkerScenes: cannot map scene ${scene.id ?? "?"} to legacy plan item`,
        );
      }
      plan.push(item);
    }

    const workerScenes = await resolveVisualPlanToRenderScenes(
      supabase,
      projectId,
      plan,
    );

    for (let j = 0; j < workerScenes.length; j++) {
      const slotIndex = imageSlotIndexes[j]!;
      const source = imageScenes[j]!;
      const scene = workerScenes[j]!;
      slots[slotIndex] = {
        ...scene,
        id: source.id ?? scene.id,
        type: DEFAULT_SCENE_TYPE,
        payload_snapshot: (source.payload ?? {
          media: plan[j],
        }) as unknown as Record<string, unknown>,
        renderer_version: IMAGE_SCENE_RENDERER_VERSION,
      };
    }
  }

  return slots.map((scene, i) => {
    if (!scene) {
      throw new Error(
        `compileVisualScenesToWorkerScenes: missing compiled scene at index ${i}`,
      );
    }
    return scene;
  });
}
