import { randomUUID } from "node:crypto";
import {
  MAX_SCENE_DURATION_SECONDS,
  MIN_SCENE_DURATION_SECONDS,
} from "@/lib/video-scene-editor/constants";

export {
  DEFAULT_SCENE_DURATION_SECONDS,
  MAX_SCENE_DURATION_SECONDS,
  MAX_SCENES_IN_VIDEO,
  MIN_SCENE_DURATION_SECONDS,
  MIN_SCENES_IN_VIDEO,
} from "@/lib/video-scene-editor/constants";

export function newEditorSceneId(): string {
  return `scene-${randomUUID()}`;
}

export function normalizeSceneDurationSeconds(
  value: number,
): number | null {
  if (!Number.isFinite(value)) return null;
  const rounded = Math.round(value * 10) / 10;
  if (rounded < MIN_SCENE_DURATION_SECONDS) return null;
  if (rounded > MAX_SCENE_DURATION_SECONDS) return null;
  return rounded;
}
