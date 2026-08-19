import {
  buildVideoRenderPath,
  STORAGE_BUCKETS,
} from "@/lib/api/storage";
import type {
  VideoReelArtifactUploadInput,
  VideoReelArtifactUploadResult,
  VideoReelArtifactUploader,
} from "@/lib/video-reel-assembly/types";

/**
 * Default uploader shape using existing video render path conventions.
 * Production can bind to Supabase; tests inject a fake.
 */
export function createDefaultVideoReelArtifactUploader(deps: {
  uploadFile: (args: {
    bucket: string;
    storagePath: string;
    localPath: string;
    contentType: string;
  }) => Promise<void>;
}): VideoReelArtifactUploader {
  return {
    async uploadArtifacts(input: VideoReelArtifactUploadInput) {
      const mp4Path = buildVideoRenderPath(
        input.projectId,
        input.videoJobId,
        "output.mp4",
      );
      const thumbPath = buildVideoRenderPath(
        input.projectId,
        input.videoJobId,
        "thumbnail.png",
      );
      await deps.uploadFile({
        bucket: STORAGE_BUCKETS.videoRenders,
        storagePath: mp4Path,
        localPath: input.mp4LocalPath,
        contentType: "video/mp4",
      });
      await deps.uploadFile({
        bucket: STORAGE_BUCKETS.videoRenders,
        storagePath: thumbPath,
        localPath: input.thumbnailLocalPath,
        contentType: "image/png",
      });
      const result: VideoReelArtifactUploadResult = {
        mp4: { bucket: STORAGE_BUCKETS.videoRenders, path: mp4Path },
        thumbnail: { bucket: STORAGE_BUCKETS.videoRenders, path: thumbPath },
      };
      if (input.srtLocalPath) {
        const srtStoragePath = buildVideoRenderPath(
          input.projectId,
          input.videoJobId,
          "subtitles.srt",
        );
        await deps.uploadFile({
          bucket: STORAGE_BUCKETS.videoRenders,
          storagePath: srtStoragePath,
          localPath: input.srtLocalPath,
          contentType: "application/x-subrip",
        });
        result.subtitles = {
          bucket: STORAGE_BUCKETS.videoRenders,
          path: srtStoragePath,
        };
      }
      return result;
    },
  };
}

/**
 * Upload only — never re-renders or calls scene-video executor.
 */
export async function uploadVideoReelArtifacts(
  uploader: VideoReelArtifactUploader,
  input: VideoReelArtifactUploadInput,
): Promise<VideoReelArtifactUploadResult> {
  return uploader.uploadArtifacts(input);
}
