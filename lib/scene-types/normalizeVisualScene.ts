import type { VisualScenePlanItem } from "@/lib/content-package/visualScenePlan";
import {
  DEFAULT_SCENE_TYPE,
  normalizeSceneType,
  type SceneType,
} from "@/lib/scene-types/sceneType";
import type {
  ImageSceneMedia,
  ImageScenePayload,
  VisualScene,
} from "@/lib/scene-types/visualScene";
import { isImageScenePayload } from "@/lib/scene-types/imageScenePayload";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseImageMedia(raw: unknown): ImageSceneMedia | null {
  const media = asRecord(raw);
  if (!media) return null;
  const source = media.source;
  if (source === "ai") {
    const image_prompt =
      typeof media.image_prompt === "string" ? media.image_prompt.trim() : "";
    if (!image_prompt) return null;
    return { source: "ai", image_prompt };
  }
  if (source === "asset") {
    const asset_id =
      typeof media.asset_id === "string" ? media.asset_id.trim() : "";
    const used_as = typeof media.used_as === "string" ? media.used_as.trim() : "";
    if (!asset_id || !used_as) return null;
    return {
      source: "asset",
      asset_id,
      used_as,
      ...(typeof media.video_usage === "string" && media.video_usage.trim()
        ? { video_usage: media.video_usage.trim() }
        : {}),
      ...(typeof media.modify === "string" ? { modify: media.modify } : {}),
    };
  }
  return null;
}

function legacyPlanItemToVisualScene(
  item: VisualScenePlanItem,
  index: number,
  id?: string,
): VisualScene {
  const media: ImageSceneMedia =
    item.source === "ai"
      ? { source: "ai", image_prompt: item.image_prompt }
      : {
          source: "asset",
          asset_id: item.asset_id,
          used_as: item.used_as,
          ...(item.video_usage ? { video_usage: item.video_usage } : {}),
          ...(item.modify ? { modify: item.modify } : {}),
        };
  return {
    id: id ?? `scene-${index + 1}`,
    type: DEFAULT_SCENE_TYPE,
    payload: { media },
  };
}

function canonicalImagePayload(raw: unknown): ImageScenePayload | null {
  const payload = asRecord(raw);
  if (!payload) return null;
  const media = parseImageMedia(payload.media ?? payload);
  if (!media) return null;
  return { media };
}

/**
 * Normalizes one visual_scenes entry (legacy or canonical) to VisualScene.
 * Returns null when the entry cannot be parsed as a visual scene.
 */
export function normalizeVisualSceneEntry(
  raw: unknown,
  index: number,
): VisualScene | null {
  const record = asRecord(raw);
  if (!record) return null;

  const explicitType = normalizeSceneType(record.type);

  if (explicitType && explicitType !== DEFAULT_SCENE_TYPE) {
    const payload = asRecord(record.payload);
    if (!payload) return null;
    const id =
      typeof record.id === "string" && record.id.trim().length > 0
        ? record.id.trim()
        : `scene-${index + 1}`;
    return {
      id,
      type: explicitType,
      payload,
      ...(typeof record.narration_hint === "string"
        ? { narration_hint: record.narration_hint.trim() }
        : {}),
      ...(typeof record.role === "string" ? { role: record.role.trim() } : {}),
    };
  }

  if (explicitType === DEFAULT_SCENE_TYPE && record.payload) {
    const typedPayload = canonicalImagePayload(record.payload);
    if (typedPayload) {
      const id =
        typeof record.id === "string" && record.id.trim().length > 0
          ? record.id.trim()
          : `scene-${index + 1}`;
      return {
        id,
        type: DEFAULT_SCENE_TYPE,
        payload: typedPayload,
      };
    }
  }

  if (record.source === "ai" || record.source === "asset") {
    if (record.source === "ai") {
      const prompt =
        typeof record.image_prompt === "string" ? record.image_prompt.trim() : "";
      if (!prompt) return null;
      return legacyPlanItemToVisualScene(
        { source: "ai", image_prompt: prompt },
        index,
        typeof record.id === "string" ? record.id.trim() : undefined,
      );
    }
    const asset_id =
      typeof record.asset_id === "string" ? record.asset_id.trim() : "";
    const used_as = typeof record.used_as === "string" ? record.used_as.trim() : "";
    if (!asset_id || !used_as) return null;
    return legacyPlanItemToVisualScene(
      {
        source: "asset",
        asset_id,
        used_as,
        ...(typeof record.video_usage === "string" && record.video_usage.trim()
          ? { video_usage: record.video_usage.trim() }
          : {}),
        ...(typeof record.modify === "string" ? { modify: record.modify } : {}),
      },
      index,
      typeof record.id === "string" ? record.id.trim() : undefined,
    );
  }

  const payload = canonicalImagePayload(record.payload);
  if (!payload) return null;

  const id =
    typeof record.id === "string" && record.id.trim().length > 0
      ? record.id.trim()
      : `scene-${index + 1}`;

  return {
    id,
    type: DEFAULT_SCENE_TYPE,
    payload,
  };
}

export function normalizeVisualSceneEntries(
  entries: readonly unknown[],
): VisualScene[] {
  const out: VisualScene[] = [];
  for (let i = 0; i < entries.length; i++) {
    const scene = normalizeVisualSceneEntry(entries[i], i);
    if (scene) out.push(scene);
  }
  return out;
}

export function visualSceneToPlanItem(
  scene: VisualScene,
): VisualScenePlanItem | null {
  if (scene.type !== DEFAULT_SCENE_TYPE) return null;
  if (!isImageScenePayload(scene.payload)) return null;
  const media = scene.payload.media;
  if (media.source === "ai") {
    return { source: "ai", image_prompt: media.image_prompt };
  }
  return {
    source: "asset",
    asset_id: media.asset_id,
    used_as: media.used_as,
    ...(media.video_usage ? { video_usage: media.video_usage } : {}),
    ...(media.modify ? { modify: media.modify } : {}),
  };
}

export function assertImageOnlyVisualScenes(scenes: VisualScene[]): void {
  for (const scene of scenes) {
    if (scene.type !== DEFAULT_SCENE_TYPE) {
      throw new Error(
        `visual scene ${scene.id ?? "?"} has unsupported type ${scene.type as SceneType}`,
      );
    }
  }
}
