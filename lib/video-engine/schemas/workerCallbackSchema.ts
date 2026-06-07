import { z } from "zod";

// What the Video Worker reports back once a render finishes. Modelled as a
// discriminated union on `status` so a successful result and a failure can never
// be confused. The field set mirrors what /api/n8n/video-callback already
// understands (mp4_url + optional thumbnail/subtitle, or an error message).

export const workerCallbackSuccessSchema = z.object({
  video_job_id: z.string().min(1),
  status: z.literal("completed"),
  mp4_url: z.string().url(),
  thumbnail_url: z.string().url().optional(),
  subtitle_url: z.string().url().optional(),
});

export const workerCallbackFailureSchema = z.object({
  video_job_id: z.string().min(1),
  status: z.literal("failed"),
  error_message: z.string().min(1),
});

export const workerCallbackSchema = z.discriminatedUnion("status", [
  workerCallbackSuccessSchema,
  workerCallbackFailureSchema,
]);

export type WorkerCallbackSuccess = z.infer<typeof workerCallbackSuccessSchema>;
export type WorkerCallbackFailure = z.infer<typeof workerCallbackFailureSchema>;
export type WorkerCallback = z.infer<typeof workerCallbackSchema>;
