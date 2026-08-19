import {
  fetchWithRetry,
} from "@/lib/http/fetchWithRetry";
import type { CombinedMixSettings } from "@/lib/ai-media-benchmark/combinedPlan";
import { resolveVideoWorkerEndpoint } from "@/lib/video-scene-editor/workerUrl";
import {
  VideoWorkerConfigError,
  VideoWorkerRequestError,
} from "@/lib/video-worker/client";

export interface AssembleBenchmarkCombinedSceneRequest {
  combined_run_id: string;
  project_id: string;
  video: { bucket: string; path: string };
  voice: { bucket: string; path: string };
  sound?: { bucket: string; path: string } | null;
  mix: CombinedMixSettings;
  output_bucket: string;
  output_path: string;
}

export interface AssembleBenchmarkCombinedSceneResponse {
  output_bucket: string;
  output_path: string;
  duration_seconds: number;
  voiceover_duration_seconds: number;
  reused_existing_output: boolean;
  used_scene_audio: boolean;
  used_ambient_sound: boolean;
}

export async function assembleBenchmarkCombinedSceneViaWorker(
  payload: AssembleBenchmarkCombinedSceneRequest,
): Promise<AssembleBenchmarkCombinedSceneResponse> {
  const secret = process.env.VIDEO_WORKER_SECRET;
  if (!secret) {
    throw new VideoWorkerConfigError("Missing VIDEO_WORKER_SECRET");
  }
  const url = resolveVideoWorkerEndpoint("/assemble-benchmark-combined-scene");
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
        timeoutMs: 120_000,
        maxAttempts: 1,
        label: "video-worker:assemble-benchmark-combined-scene",
      },
    );
  } catch (err) {
    const detail = err instanceof Error ? err.message : "network error";
    throw new VideoWorkerRequestError(
      `video worker assemble-benchmark-combined-scene failed: ${detail}`,
    );
  }
  const body = (await response.json()) as unknown;
  if (!response.ok) {
    const record =
      body && typeof body === "object" && !Array.isArray(body)
        ? (body as Record<string, unknown>)
        : {};
    const code = typeof record.error === "string" ? record.error : "assemble_failed";
    throw new VideoWorkerRequestError(code);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new VideoWorkerRequestError("invalid assemble-benchmark-combined-scene response");
  }
  const record = body as Record<string, unknown>;
  const outputBucket = record.output_bucket;
  const outputPath = record.output_path;
  if (typeof outputBucket !== "string" || typeof outputPath !== "string") {
    throw new VideoWorkerRequestError("invalid assemble-benchmark-combined-scene response");
  }
  return {
    output_bucket: outputBucket,
    output_path: outputPath,
    duration_seconds:
      typeof record.duration_seconds === "number"
        ? record.duration_seconds
        : 4,
    voiceover_duration_seconds:
      typeof record.voiceover_duration_seconds === "number"
        ? record.voiceover_duration_seconds
        : 4,
    reused_existing_output: record.reused_existing_output === true,
    used_scene_audio: record.used_scene_audio === true,
    used_ambient_sound: record.used_ambient_sound === true,
  };
}
