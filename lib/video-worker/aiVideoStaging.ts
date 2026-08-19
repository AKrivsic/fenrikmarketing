import { STORAGE_BUCKETS, buildVideoRenderPath } from "@/lib/api/storage";

export interface DurableStorageRef {
  bucket: string;
  path: string;
}

/** Bucket used for staging upload and final promotion copy. */
export const AI_VIDEO_RENDER_BUCKET = STORAGE_BUCKETS.videoRenders;

export function expectedFinalArtifactRefs(
  projectId: string,
  videoJobId: string,
  subtitlesWanted: boolean,
): {
  mp4: DurableStorageRef;
  thumbnail: DurableStorageRef;
  subtitles?: DurableStorageRef;
} {
  const bucket = AI_VIDEO_RENDER_BUCKET;
  const out = {
    mp4: {
      bucket,
      path: buildVideoRenderPath(projectId, videoJobId, "output.mp4"),
    },
    thumbnail: {
      bucket,
      path: buildVideoRenderPath(projectId, videoJobId, "thumbnail.png"),
    },
  };
  if (subtitlesWanted) {
    return {
      ...out,
      subtitles: {
        bucket,
        path: buildVideoRenderPath(projectId, videoJobId, "subtitles.srt"),
      },
    };
  }
  return out;
}

function refsEqual(a: DurableStorageRef, b: DurableStorageRef): boolean {
  return a.bucket === b.bucket && a.path === b.path;
}

export function subtitlesDeclaredUsedInFinalMeta(meta: {
  assembly?: Record<string, unknown>;
  final_artifacts?: {
    mp4: DurableStorageRef;
    thumbnail: DurableStorageRef;
    subtitles?: DurableStorageRef;
  };
}): boolean {
  const assembly = meta.assembly;
  if (assembly && typeof assembly === "object") {
    if (assembly.subtitlesBurnInUsed === true) return true;
    if (assembly.subtitles_burn_in_used === true) return true;
  }
  return Boolean(meta.final_artifacts?.subtitles);
}

export function inspectFinalAiVideoArtifacts(args: {
  meta: {
    assembly?: Record<string, unknown>;
    final_artifacts?: {
      mp4: DurableStorageRef;
      thumbnail: DurableStorageRef;
      subtitles?: DurableStorageRef;
    };
  };
  projectId: string;
  videoJobId: string;
  thumbnailUrl: string | null | undefined;
}): { ok: true } | { ok: false; reason: string } {
  const usedSubtitles = subtitlesDeclaredUsedInFinalMeta(args.meta);
  const expected = expectedFinalArtifactRefs(
    args.projectId,
    args.videoJobId,
    usedSubtitles,
  );
  const artifacts = args.meta.final_artifacts;
  if (!artifacts?.mp4 || !artifacts.thumbnail) {
    return { ok: false, reason: "final_artifacts_missing" };
  }
  if (!args.thumbnailUrl) {
    return { ok: false, reason: "final_thumbnail_url_missing" };
  }
  if (artifacts.mp4.bucket !== AI_VIDEO_RENDER_BUCKET) {
    return { ok: false, reason: "final_artifact_bucket_mismatch" };
  }
  if (!refsEqual(artifacts.mp4, expected.mp4)) {
    return { ok: false, reason: "final_artifact_mp4_path_mismatch" };
  }
  if (!refsEqual(artifacts.thumbnail, expected.thumbnail)) {
    return { ok: false, reason: "final_artifact_thumbnail_path_mismatch" };
  }
  if (usedSubtitles) {
    if (!artifacts.subtitles || !expected.subtitles) {
      return { ok: false, reason: "final_subtitles_artifact_missing" };
    }
    if (!refsEqual(artifacts.subtitles, expected.subtitles)) {
      return { ok: false, reason: "final_artifact_subtitles_path_mismatch" };
    }
  }
  return { ok: true };
}

export interface AiVideoStagingRefs {
  mp4: DurableStorageRef;
  thumbnail: DurableStorageRef;
  subtitles?: DurableStorageRef;
}

export interface AiVideoPersistedArtifacts {
  mp4Url: string;
  thumbnailUrl: string;
  subtitleUrl?: string;
  renderSpec: import("@/lib/video-engine/schemas/renderSchema").RenderSpecOutput;
  debug: Record<string, unknown>;
}

function sanitizeStagingFilename(filename: string): string {
  const base = filename.split("/").pop() ?? filename;
  return base.replace(/[^\w.\-]+/g, "_");
}

/** Durable staging objects under the job prefix — not publishable until promoted. */
export function buildAiVideoStagingStoragePath(
  projectId: string,
  videoJobId: string,
  filename: string,
): string {
  return `${projectId}/video/${videoJobId}/ai-staging/${sanitizeStagingFilename(filename)}`;
}

export function readStagingRefsFromAiMeta(
  meta: Record<string, unknown> | null | undefined,
): AiVideoStagingRefs | null {
  if (!meta) return null;
  const raw = meta.staging;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const readRef = (key: string): DurableStorageRef | null => {
    const v = record[key];
    if (!v || typeof v !== "object" || Array.isArray(v)) return null;
    const r = v as Record<string, unknown>;
    if (typeof r.bucket !== "string" || typeof r.path !== "string") return null;
    return { bucket: r.bucket, path: r.path };
  };
  const mp4 = readRef("mp4");
  const thumbnail = readRef("thumbnail");
  if (!mp4 || !thumbnail) return null;
  const subtitles = readRef("subtitles") ?? undefined;
  return { mp4, thumbnail, subtitles };
}
