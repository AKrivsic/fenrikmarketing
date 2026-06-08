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
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, body, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(
      `uploadVideoArtifact failed (${bucket}/${storagePath}): ${uploadError.message}`,
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
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(input.bucket)
    .download(input.storagePath);

  if (error || !data) {
    throw new Error(
      `downloadStorageObjectToFile failed (${input.bucket}/${input.storagePath}): ${
        error?.message ?? "missing object"
      }`,
    );
  }

  const bytes = Buffer.from(await data.arrayBuffer());
  await mkdir(dirname(input.localPath), { recursive: true });
  await writeFile(input.localPath, bytes);

  return { localPath: input.localPath };
}
