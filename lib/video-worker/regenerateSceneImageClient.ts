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

export interface RegenerateSceneImageRequest {
  project_id: string;
  source_video_job_id: string;
  scene_id: string;
  image_prompt: string;
  instruction: string;
}

export interface RegenerateSceneImageResponse {
  image_bucket: string;
  image_path: string;
}

export async function regenerateSceneImageViaWorker(
  payload: RegenerateSceneImageRequest,
): Promise<RegenerateSceneImageResponse> {
  const secret = process.env.VIDEO_WORKER_SECRET;
  if (!secret) {
    throw new VideoWorkerConfigError("Missing VIDEO_WORKER_SECRET");
  }

  const url = resolveVideoWorkerEndpoint("/regenerate-scene-image");

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
        label: "video-worker:regenerate-scene-image",
      },
    );
  } catch (err) {
    const detail = err instanceof Error ? err.message : "network error";
    throw new VideoWorkerRequestError(
      `video worker regenerate-scene-image failed: ${detail}`,
    );
  }

  if (!response.ok) {
    throw new VideoWorkerRequestError(
      `video worker regenerate-scene-image returned status ${response.status}`,
    );
  }

  const body = (await response.json()) as unknown;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new VideoWorkerRequestError("invalid regenerate-scene-image response");
  }
  const record = body as Record<string, unknown>;
  const bucket = record.image_bucket;
  const path = record.image_path;
  if (typeof bucket !== "string" || typeof path !== "string") {
    throw new VideoWorkerRequestError("invalid regenerate-scene-image response");
  }
  return { image_bucket: bucket, image_path: path };
}
