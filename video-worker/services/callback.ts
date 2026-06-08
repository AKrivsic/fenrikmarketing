import { N8N_SECRET_HEADER } from "@/lib/n8n/callback";
import {
  workerCallbackSchema,
  type WorkerCallback,
} from "@/lib/video-engine/schemas/workerCallbackSchema";

/** Fields the existing /api/n8n/video-callback handler requires beyond WorkerCallback. */
export interface VideoCallbackTransportContext {
  project_id: string;
  content_package_id: string;
}

export class VideoCallbackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VideoCallbackError";
  }
}

// POSTs a schema-valid worker result to the job callback_url. Authenticates with
// the same x-n8n-secret header the Vercel callback routes expect.
export async function sendVideoCallback(
  callbackUrl: string,
  callback: WorkerCallback,
  transport: VideoCallbackTransportContext,
): Promise<void> {
  const parsed = workerCallbackSchema.parse(callback);

  const secret = process.env.N8N_CALLBACK_SECRET;
  if (!secret) {
    throw new VideoCallbackError("Missing N8N_CALLBACK_SECRET");
  }

  const body =
    parsed.status === "completed"
      ? {
          project_id: transport.project_id,
          content_package_id: transport.content_package_id,
          video_job_id: parsed.video_job_id,
          status: parsed.status,
          mp4_url: parsed.mp4_url,
          ...(parsed.thumbnail_url
            ? { thumbnail_url: parsed.thumbnail_url }
            : {}),
          ...(parsed.subtitle_url ? { subtitle_url: parsed.subtitle_url } : {}),
          ...(parsed.render_spec ? { render_spec: parsed.render_spec } : {}),
        }
      : {
          project_id: transport.project_id,
          content_package_id: transport.content_package_id,
          video_job_id: parsed.video_job_id,
          status: parsed.status,
          error_message: parsed.error_message,
        };

  let response: Response;
  try {
    response = await fetch(callbackUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [N8N_SECRET_HEADER]: secret,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "network error";
    throw new VideoCallbackError(`video callback request failed: ${detail}`);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new VideoCallbackError(
      `video callback returned status ${response.status}${detail ? `: ${detail}` : ""}`,
    );
  }
}
