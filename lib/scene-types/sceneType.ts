export const SCENE_TYPES = [
  "IMAGE",
  "CHECKLIST",
  "STATISTIC",
  "QUOTE",
  "PHONE",
  "CTA",
] as const;

export type SceneType = (typeof SCENE_TYPES)[number];

export const DEFAULT_SCENE_TYPE: SceneType = "IMAGE";

const SCENE_TYPE_SET = new Set<string>(SCENE_TYPES);

export function isSceneType(value: string): value is SceneType {
  return SCENE_TYPE_SET.has(value);
}

export function normalizeSceneType(value: unknown): SceneType | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toUpperCase();
  return isSceneType(trimmed) ? trimmed : null;
}

export function effectiveSceneType(
  value: unknown,
  fallback: SceneType = DEFAULT_SCENE_TYPE,
): SceneType {
  return normalizeSceneType(value) ?? fallback;
}
