import { extractRenderSpecScenes } from "@/lib/ai/workflows/languageVariantsHelpers";

export interface UsableSceneStill {
  sceneId: string;
  imageBucket: string;
  imagePath: string;
}

/**
 * Returns only scenes that have both durable storage identity fields.
 * Older/incomplete jobs without image_bucket are skipped (no data repair).
 */
export function extractUsableSceneStills(output: unknown): UsableSceneStill[] {
  const scenes = extractRenderSpecScenes(output);
  if (!scenes) return [];

  const result: UsableSceneStill[] = [];
  for (const scene of scenes) {
    const id = scene.id;
    const bucket = scene.image_bucket;
    const path = scene.image_path;
    if (typeof id !== "string" || !id.trim()) continue;
    if (typeof bucket !== "string" || !bucket.trim()) continue;
    if (typeof path !== "string" || !path.trim()) continue;
    result.push({
      sceneId: id.trim(),
      imageBucket: bucket.trim(),
      imagePath: path.trim(),
    });
  }
  return result;
}

export function findUsableSceneStill(
  output: unknown,
  sceneId: string,
): UsableSceneStill | null {
  const wanted = sceneId.trim();
  if (!wanted) return null;
  return (
    extractUsableSceneStills(output).find((s) => s.sceneId === wanted) ?? null
  );
}

/** Strip query string from URLs before any log / error surfacing. */
export function redactUrlForLog(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return "[invalid-url]";
  }
}
