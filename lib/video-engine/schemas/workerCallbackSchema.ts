import { z } from "zod";
import { renderSpecOutputSchema } from "@/lib/video-engine/schemas/renderSchema";

// What the Video Worker reports back once a render finishes. Modelled as a
// discriminated union on `status` so a successful result and a failure can never
// be confused. The field set mirrors what /api/n8n/video-callback already
// understands (mp4_url + optional thumbnail/subtitle, or an error message).
//
// render_spec is the OPTIONAL resolved visual spec (scenes + durable storage
// paths). It is additive: older workers that omit it stay valid, and the
// callback handler only merges it into output when present.

// Subtitle Reliability V1 (Part E + G) — observability/debug metadata recorded
// per render. Additive and OPTIONAL: older workers omit it, the callback handler
// only persists it when present, and a malformed/missing value never fails a
// render. Stored verbatim under video_jobs.output.debug.
export const renderDebugSchema = z
  .object({
    subtitle_source: z.enum(["whisper", "proportional"]).optional(),
    match_ratio: z.number().nullable().optional(),
    fallback_used: z.boolean().optional(),
    language_hint: z.string().nullable().optional(),
    language_detected: z.string().nullable().optional(),
    whisper_word_count: z.number().nullable().optional(),
    audio_duration: z.number().nullable().optional(),
    video_duration: z.number().nullable().optional(),
    srt_last_cue_end: z.number().nullable().optional(),
    duration_delta: z.number().nullable().optional(),
    subtitle_warning: z.boolean().optional(),
    render_warning: z.boolean().optional(),
    render_warnings: z.array(z.string()).optional(),
  })
  .passthrough();

export type RenderDebug = z.infer<typeof renderDebugSchema>;

export const workerCallbackSuccessSchema = z.object({
  video_job_id: z.string().min(1),
  status: z.literal("completed"),
  mp4_url: z.string().url(),
  thumbnail_url: z.string().url().optional(),
  subtitle_url: z.string().url().optional(),
  render_spec: renderSpecOutputSchema.optional(),
  debug: renderDebugSchema.optional(),
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
