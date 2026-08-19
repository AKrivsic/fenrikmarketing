import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  validateDurableStorageIdentity,
  type StorageIdentityIssue,
} from "@/lib/video-engine/videoClipReadiness";

/**
 * Minimal injectable download port. Tests copy local fixtures; the worker can
 * later bind this to Supabase Storage without coupling render logic.
 */
export interface DurableAssetDownloader {
  downloadAsset(args: {
    bucket: string;
    path: string;
    destinationPath: string;
  }): Promise<void>;
}

export class DurableDownloadError extends Error {
  readonly code:
    | StorageIdentityIssue
    | "not_found"
    | "too_large"
    | "download_failed"
    | "empty_file";

  constructor(
    code: DurableDownloadError["code"],
    message: string,
  ) {
    super(message);
    this.name = "DurableDownloadError";
    this.code = code;
  }
}

export const DEFAULT_MAX_CLIP_BYTES = 120 * 1024 * 1024; // 120 MiB

/**
 * Downloads a durable asset to a safe destination with identity + size checks.
 * Never uses the storage filename as the local path — caller chooses destination.
 */
export async function downloadDurableAsset(args: {
  downloader: DurableAssetDownloader;
  bucket: string;
  path: string;
  destinationPath: string;
  maxBytes?: number;
}): Promise<{ localPath: string; bytes: number }> {
  const identity = validateDurableStorageIdentity(args.bucket, args.path);
  if (!identity.ok) {
    throw new DurableDownloadError(
      identity.issue,
      `invalid storage identity (${identity.issue}): ${args.bucket}/${args.path}`,
    );
  }

  const maxBytes = args.maxBytes ?? DEFAULT_MAX_CLIP_BYTES;
  const dest = args.destinationPath;
  const partial = `${dest}.partial`;

  await mkdir(dirname(dest), { recursive: true });
  await rm(partial, { force: true }).catch(() => undefined);
  await rm(dest, { force: true }).catch(() => undefined);

  try {
    await args.downloader.downloadAsset({
      bucket: args.bucket,
      path: args.path,
      destinationPath: partial,
    });
  } catch (err) {
    await rm(partial, { force: true }).catch(() => undefined);
    const message = err instanceof Error ? err.message : String(err);
    if (/enoent|not found|missing/i.test(message)) {
      throw new DurableDownloadError(
        "not_found",
        `asset not found: ${args.bucket}/${args.path}`,
      );
    }
    throw new DurableDownloadError(
      "download_failed",
      `download failed (${args.bucket}/${args.path}): ${message}`,
    );
  }

  let info;
  try {
    info = await stat(partial);
  } catch {
    throw new DurableDownloadError(
      "not_found",
      `download produced no file: ${args.bucket}/${args.path}`,
    );
  }

  if (!info.isFile() || info.size <= 0) {
    await rm(partial, { force: true }).catch(() => undefined);
    throw new DurableDownloadError(
      "empty_file",
      `downloaded file empty: ${args.bucket}/${args.path}`,
    );
  }
  if (info.size > maxBytes) {
    await rm(partial, { force: true }).catch(() => undefined);
    throw new DurableDownloadError(
      "too_large",
      `asset exceeds max size (${info.size} > ${maxBytes}): ${args.bucket}/${args.path}`,
    );
  }

  await rename(partial, dest);
  return { localPath: dest, bytes: info.size };
}

/** Test/local fixture downloader: copies bytes from a local map. */
export function createLocalFixtureDownloader(
  fixtures: Map<string, string> | Record<string, string>,
): DurableAssetDownloader {
  const map =
    fixtures instanceof Map ? fixtures : new Map(Object.entries(fixtures));
  return {
    async downloadAsset({ bucket, path, destinationPath }) {
      const key = `${bucket}/${path}`;
      const source = map.get(key);
      if (!source) {
        throw new Error(`missing fixture for ${key}`);
      }
      const { readFile } = await import("node:fs/promises");
      const bytes = await readFile(source);
      await mkdir(dirname(destinationPath), { recursive: true });
      await writeFile(destinationPath, bytes);
    },
  };
}
