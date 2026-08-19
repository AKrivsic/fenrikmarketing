import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

/** Matches Postgres `scene_video_generation_attempts.id` (UUID). */
export const SCENE_VIDEO_GENERATION_ATTEMPT_ID_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isSceneVideoGenerationAttemptUuid(value: string): boolean {
  return SCENE_VIDEO_GENERATION_ATTEMPT_ID_UUID.test(value.trim());
}

export async function sha256HexFile(filePath: string): Promise<string> {
  const bytes = await readFile(filePath);
  return createHash("sha256").update(bytes).digest("hex");
}

export function sha256HexBuffer(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}
