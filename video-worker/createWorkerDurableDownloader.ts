import type { DurableAssetDownloader } from "@/video-worker/services/reel/durableDownload";
import { downloadStorageObjectToFile } from "@/video-worker/services/storage";

/** Production clip downloader for reel assembly (Supabase Storage). */
export function createWorkerDurableAssetDownloader(): DurableAssetDownloader {
  return {
    async downloadAsset({ bucket, path, destinationPath }) {
      await downloadStorageObjectToFile({
        bucket,
        storagePath: path,
        localPath: destinationPath,
      });
    },
  };
}
