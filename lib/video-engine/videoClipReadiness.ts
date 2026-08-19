import type { SceneVideoClip } from "@/lib/video-engine/schemas/sceneVideoClipSchema";
import { normalizeSceneVideoClip } from "@/lib/video-engine/schemas/sceneVideoClipSchema";

export type StorageIdentityIssue =
  | "empty_bucket"
  | "empty_path"
  | "path_traversal"
  | "absolute_path"
  | "invalid_bucket_chars";

/**
 * Validates durable storage identity without touching the network.
 * Rejects empty values, path traversal, and absolute / escaped paths.
 */
export function validateDurableStorageIdentity(
  bucket: string,
  path: string,
): { ok: true } | { ok: false; issue: StorageIdentityIssue } {
  const b = bucket.trim();
  const p = path.trim();
  if (!b) return { ok: false, issue: "empty_bucket" };
  if (!p) return { ok: false, issue: "empty_path" };
  if (b.includes("..") || p.includes("..")) {
    return { ok: false, issue: "path_traversal" };
  }
  if (p.startsWith("/") || p.startsWith("\\") || /^[a-zA-Z]:[\\/]/.test(p)) {
    return { ok: false, issue: "absolute_path" };
  }
  if (b.includes("/") || b.includes("\\") || b.includes("\0") || p.includes("\0")) {
    return { ok: false, issue: "invalid_bucket_chars" };
  }
  return { ok: true };
}

export type VideoClipReadinessReason =
  | "ready"
  | "missing_video_clip"
  | "invalid_video_clip"
  | "invalid_storage_identity"
  | "duplicate_scene_id";

export interface SceneVideoClipAssessment {
  sceneId: string;
  hasVideoClip: boolean;
  clip: SceneVideoClip | null;
  declaredHasAudio: boolean | null;
  storageOk: boolean;
  storageIssue: StorageIdentityIssue | null;
  reason: VideoClipReadinessReason;
}

export interface DurableAssetNeed {
  kind: "video_clip" | "music" | "ambient";
  sceneId?: string;
  bucket: string;
  path: string;
}

export interface VideoClipRenderReadiness {
  /** True only when every scene has a usable durable video clip. */
  ready: boolean;
  status: "ready" | "not_ready";
  reason: VideoClipReadinessReason;
  scenes: SceneVideoClipAssessment[];
  /** Assets the orchestrator must download when ready (or for diagnostics). */
  assetsToDownload: DurableAssetNeed[];
  missingSceneIds: string[];
  invalidSceneIds: string[];
  duplicateSceneIds: string[];
}

export interface AssessVideoClipReadinessInput {
  scenes: Array<{
    id: string;
    video_clip?: unknown;
  }>;
  music?: { bucket: string; path: string } | null;
  ambient?: { bucket: string; path: string } | null;
}

/**
 * Pure readiness check for the video-clip Reel path.
 * Does not generate clips, call providers, or fall back to still render.
 */
export function assessVideoClipRenderReadiness(
  input: AssessVideoClipReadinessInput,
): VideoClipRenderReadiness {
  const seen = new Map<string, number>();
  const duplicateSceneIds: string[] = [];
  for (const scene of input.scenes) {
    const count = (seen.get(scene.id) ?? 0) + 1;
    seen.set(scene.id, count);
    if (count === 2) duplicateSceneIds.push(scene.id);
  }

  const scenes: SceneVideoClipAssessment[] = input.scenes.map((scene) => {
    if (scene.video_clip === undefined || scene.video_clip === null) {
      return {
        sceneId: scene.id,
        hasVideoClip: false,
        clip: null,
        declaredHasAudio: null,
        storageOk: false,
        storageIssue: null,
        reason: "missing_video_clip",
      };
    }
    const clip = normalizeSceneVideoClip(scene.video_clip);
    if (!clip) {
      return {
        sceneId: scene.id,
        hasVideoClip: false,
        clip: null,
        declaredHasAudio: null,
        storageOk: false,
        storageIssue: null,
        reason: "invalid_video_clip",
      };
    }
    const identity = validateDurableStorageIdentity(clip.bucket, clip.path);
    if (!identity.ok) {
      return {
        sceneId: scene.id,
        hasVideoClip: true,
        clip,
        declaredHasAudio:
          typeof clip.has_audio === "boolean" ? clip.has_audio : null,
        storageOk: false,
        storageIssue: identity.issue,
        reason: "invalid_storage_identity",
      };
    }
    return {
      sceneId: scene.id,
      hasVideoClip: true,
      clip,
      declaredHasAudio:
        typeof clip.has_audio === "boolean" ? clip.has_audio : null,
      storageOk: true,
      storageIssue: null,
      reason: "ready",
    };
  });

  const missingSceneIds = scenes
    .filter((s) => s.reason === "missing_video_clip")
    .map((s) => s.sceneId);
  const invalidSceneIds = scenes
    .filter(
      (s) =>
        s.reason === "invalid_video_clip" ||
        s.reason === "invalid_storage_identity",
    )
    .map((s) => s.sceneId);

  let status: "ready" | "not_ready" = "ready";
  let reason: VideoClipReadinessReason = "ready";

  if (duplicateSceneIds.length > 0) {
    status = "not_ready";
    reason = "duplicate_scene_id";
  } else if (missingSceneIds.length > 0) {
    status = "not_ready";
    reason = "missing_video_clip";
  } else if (invalidSceneIds.length > 0) {
    const firstInvalid = scenes.find((s) => invalidSceneIds.includes(s.sceneId));
    status = "not_ready";
    reason = firstInvalid?.reason ?? "invalid_video_clip";
  }

  const assetsToDownload: DurableAssetNeed[] = [];
  if (status === "ready") {
    for (const scene of scenes) {
      if (!scene.clip) continue;
      assetsToDownload.push({
        kind: "video_clip",
        sceneId: scene.sceneId,
        bucket: scene.clip.bucket,
        path: scene.clip.path,
      });
    }
  }

  const appendBed = (
    kind: "music" | "ambient",
    bed: { bucket: string; path: string } | null | undefined,
  ) => {
    if (!bed) return;
    const identity = validateDurableStorageIdentity(bed.bucket, bed.path);
    if (!identity.ok) {
      status = "not_ready";
      if (reason === "ready") reason = "invalid_storage_identity";
      return;
    }
    if (status === "ready") {
      assetsToDownload.push({
        kind,
        bucket: bed.bucket,
        path: bed.path,
      });
    }
  };
  appendBed("music", input.music);
  appendBed("ambient", input.ambient);

  return {
    ready: status === "ready",
    status,
    reason,
    scenes,
    assetsToDownload,
    missingSceneIds,
    invalidSceneIds,
    duplicateSceneIds,
  };
}
