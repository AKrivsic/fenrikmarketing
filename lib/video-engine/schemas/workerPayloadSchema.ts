import { z } from "zod";
import type { VideoWorkerJobPayload } from "@/lib/video-worker/client";

// Payload the Vercel side POSTs to the Video Worker. It MUST stay byte-for-byte
// compatible with the existing transport type (VideoWorkerJobPayload) and with
// what /api/n8n/start-video-job sends. `input` is kept as a free-form record for
// now; it is expected to eventually satisfy the renderSchema, but the worker
// does not enforce that at the transport boundary yet.
export const workerPayloadSchema = z.object({
  video_job_id: z.string().min(1),
  project_id: z.string().min(1),
  content_package_id: z.string().min(1),
  content_item_id: z.string().nullable(),
  callback_url: z.string().url(),
  input: z.record(z.string(), z.unknown()),
});

export type WorkerPayload = z.infer<typeof workerPayloadSchema>;

// Compile-time guarantee that the Zod schema and the hand-written transport
// interface never drift apart. Both directions must hold (mutual assignability);
// if they diverge, `true` stops being assignable here and tsc fails.
type Extends<A, B> = A extends B ? true : false;
export const WORKER_PAYLOAD_MATCHES_TRANSPORT: Extends<
  WorkerPayload,
  VideoWorkerJobPayload
> &
  Extends<VideoWorkerJobPayload, WorkerPayload> = true;
