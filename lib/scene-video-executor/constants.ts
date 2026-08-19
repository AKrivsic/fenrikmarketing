/**
 * Server-only feature flag for the scene-video generation executor.
 * Default is off. Presence of RUNWAYML_API_SECRET does not enable generation.
 */
export const SCENE_VIDEO_GENERATION_FLAG = "SCENE_VIDEO_GENERATION_ENABLED";

export function isSceneVideoGenerationEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env[SCENE_VIDEO_GENERATION_FLAG]?.trim().toLowerCase() === "true";
}

export function hasRunwayApiSecret(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return Boolean(env.RUNWAYML_API_SECRET?.trim());
}
