import { readFile } from "node:fs/promises";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  AI_VIDEO_RENDER_BUCKET,
  buildAiVideoStagingStoragePath,
  expectedFinalArtifactRefs,
  type AiVideoStagingRefs,
  type DurableStorageRef,
} from "@/lib/video-worker/aiVideoStaging";

export interface AiVideoArtifactStorageDeps {
  uploadLocalFile(args: {
    bucket: string;
    storagePath: string;
    localPath: string;
    contentType: string;
  }): Promise<void>;
  copyStorageObject(args: {
    bucket: string;
    fromPath: string;
    toPath: string;
  }): Promise<void>;
  signStoragePath(args: { bucket: string; storagePath: string }): Promise<string>;
  removeStoragePaths(args: {
    bucket: string;
    paths: string[];
  }): Promise<void>;
  /** Optional existence probe (tests / fallback). Promotion does not skip copy. */
  storageObjectExists?(args: {
    bucket: string;
    path: string;
  }): Promise<boolean>;
}

const DEFAULT_SIGNED_URL_TTL_SECONDS = Number(
  process.env.VIDEO_WORKER_SIGNED_URL_TTL_SECONDS ?? 60 * 60 * 24 * 365,
);

export function createSupabaseAiVideoArtifactStorage(): AiVideoArtifactStorageDeps {
  return {
    async uploadLocalFile({ bucket, storagePath, localPath, contentType }) {
      const body = await readFile(localPath);
      const supabase = createSupabaseAdminClient();
      const { error } = await supabase.storage
        .from(bucket)
        .upload(storagePath, body, { contentType, upsert: true });
      if (error) throw error;
    },
    async copyStorageObject({ bucket, fromPath, toPath }) {
      const supabase = createSupabaseAdminClient();
      const { error } = await supabase.storage.from(bucket).copy(fromPath, toPath);
      if (error) throw error;
    },
    async signStoragePath({ bucket, storagePath }) {
      const supabase = createSupabaseAdminClient();
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(storagePath, DEFAULT_SIGNED_URL_TTL_SECONDS);
      if (error || !data?.signedUrl) {
        throw new Error(error?.message ?? "signed_url_failed");
      }
      return data.signedUrl;
    },
    async removeStoragePaths({ bucket, paths }) {
      if (paths.length === 0) return;
      const supabase = createSupabaseAdminClient();
      await supabase.storage.from(bucket).remove(paths);
    },
  };
}

export function stagingRefsForJob(
  projectId: string,
  videoJobId: string,
  subtitlesWanted: boolean,
): AiVideoStagingRefs {
  const bucket = AI_VIDEO_RENDER_BUCKET;
  const refs: AiVideoStagingRefs = {
    mp4: {
      bucket,
      path: buildAiVideoStagingStoragePath(projectId, videoJobId, "output.mp4"),
    },
    thumbnail: {
      bucket,
      path: buildAiVideoStagingStoragePath(
        projectId,
        videoJobId,
        "thumbnail.png",
      ),
    },
  };
  if (subtitlesWanted) {
    refs.subtitles = {
      bucket,
      path: buildAiVideoStagingStoragePath(
        projectId,
        videoJobId,
        "subtitles.srt",
      ),
    };
  }
  return refs;
}

export function finalRefsForJob(
  projectId: string,
  videoJobId: string,
  subtitlesWanted: boolean,
): {
  mp4: DurableStorageRef;
  thumbnail: DurableStorageRef;
  subtitles?: DurableStorageRef;
} {
  return expectedFinalArtifactRefs(projectId, videoJobId, subtitlesWanted);
}

export async function uploadAssemblyToStaging(args: {
  projectId: string;
  videoJobId: string;
  mp4LocalPath: string;
  thumbnailLocalPath: string;
  srtLocalPath?: string;
  storage?: AiVideoArtifactStorageDeps;
}): Promise<AiVideoStagingRefs> {
  const storage = args.storage ?? createSupabaseAiVideoArtifactStorage();
  const refs = stagingRefsForJob(
    args.projectId,
    args.videoJobId,
    Boolean(args.srtLocalPath),
  );
  await storage.uploadLocalFile({
    bucket: refs.mp4.bucket,
    storagePath: refs.mp4.path,
    localPath: args.mp4LocalPath,
    contentType: "video/mp4",
  });
  await storage.uploadLocalFile({
    bucket: refs.thumbnail.bucket,
    storagePath: refs.thumbnail.path,
    localPath: args.thumbnailLocalPath,
    contentType: "image/png",
  });
  if (args.srtLocalPath && refs.subtitles) {
    await storage.uploadLocalFile({
      bucket: refs.subtitles.bucket,
      storagePath: refs.subtitles.path,
      localPath: args.srtLocalPath,
      contentType: "application/x-subrip",
    });
  }
  return refs;
}

export async function idempotentCopyStorageObject(
  storage: AiVideoArtifactStorageDeps,
  args: { bucket: string; fromPath: string; toPath: string },
): Promise<"copied" | "already_present"> {
  if (args.fromPath === args.toPath) {
    throw new Error("copy_same_path");
  }
  if (storage.storageObjectExists) {
    const exists = await storage.storageObjectExists({
      bucket: args.bucket,
      path: args.toPath,
    });
    if (exists) return "already_present";
  }
  try {
    await storage.copyStorageObject(args);
    return "copied";
  } catch (err) {
    if (storage.storageObjectExists) {
      const exists = await storage.storageObjectExists({
        bucket: args.bucket,
        path: args.toPath,
      });
      if (exists) return "already_present";
    }
    throw err;
  }
}

/**
 * Idempotent promotion of one object:
 * 1. delete only the exact destination path (never a prefix),
 * 2. copy staging → that exact destination.
 * Does not skip an existing destination; it replaces it.
 */
export async function promoteStorageRefIdempotent(
  storage: AiVideoArtifactStorageDeps,
  args: { bucket: string; fromPath: string; toPath: string },
): Promise<void> {
  if (args.fromPath === args.toPath) {
    throw new Error("copy_same_path");
  }
  await storage
    .removeStoragePaths({ bucket: args.bucket, paths: [args.toPath] })
    .catch(() => undefined);
  await storage.copyStorageObject(args);
}

export async function promoteStagingToFinalArtifacts(args: {
  projectId: string;
  videoJobId: string;
  staging: AiVideoStagingRefs;
  subtitlesWanted: boolean;
  storage?: AiVideoArtifactStorageDeps;
  /** Called before each destination write and between steps. */
  assertLeaseHeld?: () => Promise<void>;
}): Promise<{
  mp4Url: string;
  thumbnailUrl: string;
  subtitleUrl?: string;
  finalRefs: ReturnType<typeof finalRefsForJob>;
}> {
  const storage = args.storage ?? createSupabaseAiVideoArtifactStorage();
  const finalRefs = finalRefsForJob(
    args.projectId,
    args.videoJobId,
    args.subtitlesWanted,
  );

  await args.assertLeaseHeld?.();
  await promoteStorageRefIdempotent(storage, {
    bucket: finalRefs.mp4.bucket,
    fromPath: args.staging.mp4.path,
    toPath: finalRefs.mp4.path,
  });

  await args.assertLeaseHeld?.();
  await promoteStorageRefIdempotent(storage, {
    bucket: finalRefs.thumbnail.bucket,
    fromPath: args.staging.thumbnail.path,
    toPath: finalRefs.thumbnail.path,
  });

  let subtitleUrl: string | undefined;
  if (args.subtitlesWanted && args.staging.subtitles && finalRefs.subtitles) {
    await args.assertLeaseHeld?.();
    await promoteStorageRefIdempotent(storage, {
      bucket: finalRefs.subtitles.bucket,
      fromPath: args.staging.subtitles.path,
      toPath: finalRefs.subtitles.path,
    });
    subtitleUrl = await storage.signStoragePath({
      bucket: finalRefs.subtitles.bucket,
      storagePath: finalRefs.subtitles.path,
    });
  }

  const mp4Url = await storage.signStoragePath({
    bucket: finalRefs.mp4.bucket,
    storagePath: finalRefs.mp4.path,
  });
  const thumbnailUrl = await storage.signStoragePath({
    bucket: finalRefs.thumbnail.bucket,
    storagePath: finalRefs.thumbnail.path,
  });
  return { mp4Url, thumbnailUrl, subtitleUrl, finalRefs };
}

export async function bestEffortCleanupStaging(args: {
  staging: AiVideoStagingRefs;
  storage?: AiVideoArtifactStorageDeps;
}): Promise<{ cleaned: boolean; error?: string }> {
  const storage = args.storage ?? createSupabaseAiVideoArtifactStorage();
  const paths = [
    args.staging.mp4.path,
    args.staging.thumbnail.path,
    args.staging.subtitles?.path,
  ].filter((p): p is string => Boolean(p));
  try {
    await storage.removeStoragePaths({
      bucket: args.staging.mp4.bucket,
      paths,
    });
    return { cleaned: true };
  } catch (err) {
    return {
      cleaned: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
