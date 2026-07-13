import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  STORAGE_BUCKETS,
  buildGeneratedVisualPath,
  buildVideoRenderPath,
} from "@/lib/api/storage";

export type VideoArtifactType = "mp4" | "png" | "srt" | "mp3";

const MIME_BY_ARTIFACT: Record<VideoArtifactType, string> = {
  mp4: "video/mp4",
  mp3: "audio/mpeg",
  png: "image/png",
  srt: "application/x-subrip",
};

const DEFAULT_FILENAME: Record<VideoArtifactType, string> = {
  mp4: "output.mp4",
  mp3: "voiceover.mp3",
  png: "visual.png",
  srt: "subtitles.srt",
};

/** Default signed URL lifetime (seconds). Buckets are private; callers get a signed URL. */
const DEFAULT_SIGNED_URL_TTL_SECONDS = Number(
  process.env.VIDEO_WORKER_SIGNED_URL_TTL_SECONDS ?? 60 * 60 * 24 * 365,
);

// Upload resilience. A render can succeed yet still fail when Supabase Storage
// drops the upload mid-body (observed in production as an `ABORTED REQ` that the
// storage client surfaces only as a generic HTTP 400 "Bad Request"). That is a
// transient transport failure, not a validation/policy/path error, so the upload
// is safe to retry. Because every artifact upload uses `upsert: true`, re-sending
// the SAME local bytes is idempotent whether a partial object exists or not.
const UPLOAD_MAX_ATTEMPTS = (() => {
  const raw = Number(process.env.VIDEO_WORKER_UPLOAD_MAX_ATTEMPTS);
  if (!Number.isFinite(raw) || raw < 1) return 3;
  return Math.min(Math.floor(raw), 5);
})();
const UPLOAD_BACKOFF_BASE_MS = 500;
const UPLOAD_BACKOFF_JITTER_MS = 250;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Normalizes a Supabase Storage upload error into the fields we log + classify.
function describeUploadError(error: unknown): {
  name: string | null;
  status: number | null;
  statusCode: string | null;
  message: string;
} {
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    return {
      name: typeof record.name === "string" ? record.name : null,
      status: typeof record.status === "number" ? record.status : null,
      statusCode:
        typeof record.statusCode === "string" ? record.statusCode : null,
      message:
        typeof record.message === "string" ? record.message : String(error),
    };
  }
  return { name: null, status: null, statusCode: null, message: String(error) };
}

// A storage upload error is retryable when it is a transient transport failure:
//   - no HTTP status      → network drop / abort (StorageUnknownError)
//   - 5xx / 429           → server-side transient
//   - 400 Bad Request     → observed surface form of an aborted mid-upload POST
//                           (the object was not durably created; upsert-safe)
// Validation/policy/not-found style errors (401/403/404/409/422) are permanent
// and never retried so we fail fast instead of looping.
function isRetryableUploadError(error: unknown): boolean {
  const { status } = describeUploadError(error);
  if (status === null) return true;
  if (status >= 500) return true;
  if (status === 429) return true;
  if (status === 400) return true;
  return false;
}

export interface UploadVideoArtifactInput {
  projectId: string;
  videoJobId: string;
  artifactType: VideoArtifactType;
  localPath: string;
  filename?: string;
  /** When set with artifactType png, uses generated-visuals + buildGeneratedVisualPath. */
  aiVisualId?: string;
}

export interface UploadVideoArtifactResult {
  signedUrl: string;
  bucket: string;
  storagePath: string;
}

function resolveStorageTarget(
  input: UploadVideoArtifactInput,
): { bucket: string; storagePath: string } {
  const filename = input.filename ?? DEFAULT_FILENAME[input.artifactType];

  if (input.artifactType === "png" && input.aiVisualId) {
    return {
      bucket: STORAGE_BUCKETS.generatedVisuals,
      storagePath: buildGeneratedVisualPath(
        input.projectId,
        input.aiVisualId,
        filename,
      ),
    };
  }

  return {
    bucket: STORAGE_BUCKETS.videoRenders,
    storagePath: buildVideoRenderPath(
      input.projectId,
      input.videoJobId,
      filename,
    ),
  };
}

// Uploads a local artifact into Supabase Storage using existing path conventions,
// then returns a signed URL (private buckets — no public URLs).
export async function uploadVideoArtifact(
  input: UploadVideoArtifactInput,
): Promise<UploadVideoArtifactResult> {
  const body = await readFile(input.localPath);
  const { bucket, storagePath } = resolveStorageTarget(input);
  const contentType = MIME_BY_ARTIFACT[input.artifactType];

  const supabase = createSupabaseAdminClient();

  // Bounded retry with short exponential backoff. Transient upload failures
  // (aborted mid-body, network, 5xx, 400 Bad Request) are retried; permanent
  // errors (policy/path/validation) fail immediately. Never loops forever.
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= UPLOAD_MAX_ATTEMPTS; attempt++) {
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, body, {
        contentType,
        upsert: true,
      });

    if (!uploadError) {
      lastError = null;
      if (attempt > 1) {
        console.log(
          "[video-worker:storage] upload succeeded after retry",
          JSON.stringify({
            attempt,
            max_attempts: UPLOAD_MAX_ATTEMPTS,
            bucket,
            storage_path: storagePath,
            file_size_bytes: body.length,
          }),
        );
      }
      break;
    }

    lastError = uploadError;
    const details = describeUploadError(uploadError);
    const retryable = isRetryableUploadError(uploadError);
    const willRetry = retryable && attempt < UPLOAD_MAX_ATTEMPTS;

    console.warn(
      "[video-worker:storage] upload attempt failed",
      JSON.stringify({
        attempt,
        max_attempts: UPLOAD_MAX_ATTEMPTS,
        bucket,
        storage_path: storagePath,
        file_size_bytes: body.length,
        content_type: contentType,
        retryable,
        will_retry: willRetry,
        error_name: details.name,
        error_status: details.status,
        error_status_code: details.statusCode,
        error_message: details.message,
      }),
    );

    if (!willRetry) break;

    const delay =
      UPLOAD_BACKOFF_BASE_MS * 2 ** (attempt - 1) +
      Math.floor(Math.random() * UPLOAD_BACKOFF_JITTER_MS);
    await sleep(delay);
  }

  if (lastError) {
    const details = describeUploadError(lastError);
    throw new Error(
      `uploadVideoArtifact failed (${bucket}/${storagePath}) after ${UPLOAD_MAX_ATTEMPTS} attempt(s): ${details.message}`,
    );
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, DEFAULT_SIGNED_URL_TTL_SECONDS);

  if (signError || !signed?.signedUrl) {
    throw new Error(
      `uploadVideoArtifact signed URL failed: ${signError?.message ?? "missing url"}`,
    );
  }

  return {
    signedUrl: signed.signedUrl,
    bucket,
    storagePath,
  };
}

export interface DownloadStorageObjectInput {
  bucket: string;
  storagePath: string;
  localPath: string;
}

// Downloads an existing Storage object (private bucket, admin client) to a local
// file. Used to reuse a previously rendered scene image instead of generating a
// new one. Throws when the object is missing so the caller can fail the job.
export async function downloadStorageObjectToFile(
  input: DownloadStorageObjectInput,
): Promise<{ localPath: string }> {
  const bytes = await downloadStorageObjectBytes(input.bucket, input.storagePath);
  await mkdir(dirname(input.localPath), { recursive: true });
  await writeFile(input.localPath, bytes);
  return { localPath: input.localPath };
}

export async function downloadStorageObjectBytes(
  bucket: string,
  storagePath: string,
): Promise<Buffer> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage.from(bucket).download(storagePath);
  if (error || !data) {
    throw new Error(
      `downloadStorageObjectBytes failed (${bucket}/${storagePath}): ${
        error?.message ?? "missing object"
      }`,
    );
  }
  return Buffer.from(await data.arrayBuffer());
}
