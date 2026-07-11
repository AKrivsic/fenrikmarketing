// Phase 2 — gates future non-IMAGE renderers. IMAGE always renders regardless.
export function isSceneTypesEnabled(): boolean {
  return process.env.SCENE_TYPES_ENABLED === "true";
}
