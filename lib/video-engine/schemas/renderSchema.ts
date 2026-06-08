import { z } from "zod";
import { sceneSchema } from "./sceneSchema";

// The render specification: everything the Video Worker needs to assemble one
// video. This is the eventual shape of a job's `input`. MVP scope: ordered
// scenes + the voiceover text. `subtitles` and `duration_seconds` are optional
// hints (the worker can derive duration from the scenes when omitted).
export const renderSchema = z.object({
  scenes: z.array(sceneSchema).min(1),
  voiceover_text: z.string().min(1),
  subtitles: z.string().optional(),
  duration_seconds: z.number().positive().optional(),
});

export type RenderSpec = z.infer<typeof renderSchema>;

// The RESOLVED render spec, persisted to video_jobs.output.render_spec after a
// successful render. Unlike RenderSpec (the input), every scene here carries a
// durable Storage reference (image_bucket + image_path) to the still that was
// actually used, so a later render can reuse the exact same visuals without any
// new image generation. Durable bucket/path is stored (NOT a signed URL, which
// expires); callers re-sign on demand.
export const persistedSceneSchema = z.object({
  id: z.string().min(1),
  image_prompt: z.string().min(1),
  image_bucket: z.string().min(1),
  image_path: z.string().min(1),
  duration_seconds: z.number().positive(),
});

export const renderSpecOutputSchema = z.object({
  version: z.literal(1),
  scenes: z.array(persistedSceneSchema).min(1),
  duration_seconds: z.number().positive().optional(),
  subtitle_timing: z
    .array(
      z.object({
        start_seconds: z.number().nonnegative(),
        end_seconds: z.number().positive(),
        text: z.string(),
      }),
    )
    .optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type PersistedScene = z.infer<typeof persistedSceneSchema>;
export type RenderSpecOutput = z.infer<typeof renderSpecOutputSchema>;
