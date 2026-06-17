import {
  fetchWithRetry,
  HTTP_MAX_ATTEMPTS,
  HTTP_TIMEOUT_MS,
} from "@/lib/http/fetchWithRetry";
import { resolveVideoWorkerEndpoint } from "@/lib/video-scene-editor/workerUrl";
import {
  VideoWorkerConfigError,
  VideoWorkerRequestError,
} from "@/lib/video-worker/client";

export interface EditSceneImageRequest {
  project_id: string;
  source_video_job_id: string;
  scene_id: string;
  image_bucket: string;
  image_path: string;
  instruction: string;
}

export interface EditSceneImageResponse {
  image_bucket: string;
  image_path: string;
}

export async function editSceneImageViaWorker(
  payload: EditSceneImageRequest,
): Promise<EditSceneImageResponse> {
  const secret = process.env.VIDEO_WORKER_SECRET;
  if (!secret) {
    throw new VideoWorkerConfigError("Missing VIDEO_WORKER_SECRET");
  }

  const url = resolveVideoWorkerEndpoint("/edit-scene-image");

  let response: Response;
  try {
    response = await fetchWithRetry(
      url,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-video-worker-secret": secret,
        },
        body: JSON.stringify(payload),
      },
      {
        timeoutMs: HTTP_TIMEOUT_MS.ai,
        maxAttempts: HTTP_MAX_ATTEMPTS.ai,
        label: "video-worker:edit-scene-image",
      },
    );
  } catch (err) {
    const detail = err instanceof Error ? err.message : "network error";
    throw new VideoWorkerRequestError(
      `video worker edit-scene-image failed: ${detail}`,
    );
  }

  if (!response.ok) {
    throw new VideoWorkerRequestError(
      `video worker edit-scene-image returned status ${response.status}`,
    );
  }

  const body = (await response.json()) as unknown;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new VideoWorkerRequestError("invalid edit-scene-image response");
  }
  const record = body as Record<string, unknown>;
  const bucket = record.image_bucket;
  const path = record.image_path;
  if (typeof bucket !== "string" || typeof path !== "string") {
    throw new VideoWorkerRequestError("invalid edit-scene-image response");
  }
  return { image_bucket: bucket, image_path: path };
}
