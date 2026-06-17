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

export interface InsertSceneBrandAssetRequest {
  project_id: string;
  source_video_job_id: string;
  scene_id: string;
  scene_image_bucket: string;
  scene_image_path: string;
  asset_bucket: string;
  asset_path: string;
  instruction: string;
}

export interface InsertSceneBrandAssetResponse {
  image_bucket: string;
  image_path: string;
  provider: string;
  model: string;
}

export async function insertSceneBrandAssetViaWorker(
  payload: InsertSceneBrandAssetRequest,
): Promise<InsertSceneBrandAssetResponse> {
  const secret = process.env.VIDEO_WORKER_SECRET;
  if (!secret) {
    throw new VideoWorkerConfigError("Missing VIDEO_WORKER_SECRET");
  }

  const url = resolveVideoWorkerEndpoint("/insert-scene-asset");

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
        label: "video-worker:insert-scene-asset",
      },
    );
  } catch (err) {
    const detail = err instanceof Error ? err.message : "network error";
    throw new VideoWorkerRequestError(
      `video worker insert-scene-asset failed: ${detail}`,
    );
  }

  if (!response.ok) {
    throw new VideoWorkerRequestError(
      `video worker insert-scene-asset returned status ${response.status}`,
    );
  }

  const body = (await response.json()) as unknown;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new VideoWorkerRequestError("invalid insert-scene-asset response");
  }
  const record = body as Record<string, unknown>;
  const bucket = record.image_bucket;
  const path = record.image_path;
  const provider = record.provider;
  const model = record.model;
  if (
    typeof bucket !== "string" ||
    typeof path !== "string" ||
    typeof provider !== "string" ||
    typeof model !== "string"
  ) {
    throw new VideoWorkerRequestError("invalid insert-scene-asset response");
  }
  return {
    image_bucket: bucket,
    image_path: path,
    provider,
    model,
  };
}
