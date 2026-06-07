// Outbound Video Worker client. Single place that knows how to send a render
// job to the external Video Worker. Pure transport: it builds the HTTP request,
// adds auth, and turns a non-2xx / network failure into an error. No business
// logic, no DB access, no FFmpeg — the worker renders, this only calls it.

// Missing VIDEO_WORKER_URL / VIDEO_WORKER_SECRET -> mapped to HTTP 500.
export class VideoWorkerConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VideoWorkerConfigError";
  }
}

// Network failure or non-2xx response from the worker -> mapped to HTTP 500.
export class VideoWorkerRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VideoWorkerRequestError";
  }
}

// Payload sent to the Video Worker. Assembled by the caller from the existing
// video_jobs / content_items / content_packages model.
export interface VideoWorkerJobPayload {
  video_job_id: string;
  project_id: string;
  content_package_id: string;
  content_item_id: string | null;
  callback_url: string;
  input: Record<string, unknown>;
}

export async function startVideoWorkerJob(
  payload: VideoWorkerJobPayload,
): Promise<void> {
  const url = process.env.VIDEO_WORKER_URL;
  const secret = process.env.VIDEO_WORKER_SECRET;
  if (!url || !secret) {
    throw new VideoWorkerConfigError(
      "Missing VIDEO_WORKER_URL or VIDEO_WORKER_SECRET",
    );
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-video-worker-secret": secret,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "network error";
    throw new VideoWorkerRequestError(
      `video worker request failed: ${detail}`,
    );
  }

  if (!response.ok) {
    throw new VideoWorkerRequestError(
      `video worker returned status ${response.status}`,
    );
  }
}
