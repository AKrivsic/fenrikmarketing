import { createHash } from "node:crypto";
import type { SceneVideoPlanIdempotencyMaterial } from "@/lib/scene-video-plan";

/** Fenrik scene-video executor namespace (UUID v5). */
export const SCENE_VIDEO_CLIENT_REQUEST_NAMESPACE =
  "8f3c1a2e-5b47-4d91-9c0e-a1b2c3d4e5f6";

function uuidToBytes(uuid: string): Buffer {
  const hex = uuid.replace(/-/g, "");
  return Buffer.from(hex, "hex");
}

/**
 * RFC 4122 UUID v5 from a namespace + name. Stable across processes.
 * The resulting identifier is 36 chars — never embeds the motion prompt.
 */
export function uuidV5(namespaceUuid: string, name: string): string {
  const hash = createHash("sha1")
    .update(uuidToBytes(namespaceUuid))
    .update(name, "utf8")
    .digest();
  hash[6] = (hash[6]! & 0x0f) | 0x50;
  hash[8] = (hash[8]! & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export function buildSceneVideoClientRequestName(args: {
  videoJobId: string;
  material: SceneVideoPlanIdempotencyMaterial;
}): string {
  const m = args.material;
  return [
    args.videoJobId,
    m.sceneId,
    m.sourceImageBucket ?? "",
    m.sourceImagePath ?? "",
    m.motionPrompt,
    m.provider,
    m.model,
    String(m.providerDurationSeconds),
    m.ratio,
  ].join("\n");
}

export function buildSceneVideoClientRequestId(args: {
  videoJobId: string;
  material: SceneVideoPlanIdempotencyMaterial;
}): string {
  return uuidV5(
    SCENE_VIDEO_CLIENT_REQUEST_NAMESPACE,
    buildSceneVideoClientRequestName(args),
  );
}
