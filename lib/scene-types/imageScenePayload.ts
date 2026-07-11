import type { ImageScenePayload, VisualScene } from "@/lib/scene-types/visualScene";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function isImageScenePayload(
  payload: VisualScene["payload"],
): payload is ImageScenePayload {
  const root = asRecord(payload);
  if (!root) return false;
  const media = asRecord(root.media) ?? root;
  const source = media.source;
  if (source === "ai") {
    return typeof media.image_prompt === "string" && media.image_prompt.trim().length > 0;
  }
  if (source === "asset") {
    return (
      typeof media.asset_id === "string" &&
      media.asset_id.trim().length > 0 &&
      typeof media.used_as === "string" &&
      media.used_as.trim().length > 0
    );
  }
  return false;
}
