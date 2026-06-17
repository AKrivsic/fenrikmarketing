import { VideoWorkerConfigError } from "@/lib/video-worker/client";

/** Resolves a Video Worker path from VIDEO_WORKER_URL (typically …/render). */
export function resolveVideoWorkerEndpoint(path: string): string {
  const configured = process.env.VIDEO_WORKER_URL;
  if (!configured) {
    throw new VideoWorkerConfigError("Missing VIDEO_WORKER_URL");
  }
  const base = configured.replace(/\/render\/?$/i, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}
