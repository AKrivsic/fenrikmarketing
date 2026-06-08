import { z } from "zod";

// A single timeline scene of a generated video. MVP keeps only the fields the
// renderer truly needs: a stable id, the prompt used to generate the still
// image, and how long the scene stays on screen.
//
// image_bucket / image_path are optional durable references to an already
// rendered still in Supabase Storage. When both are present the worker reuses
// that image instead of calling the image provider (deterministic re-render /
// language variants). When absent the worker generates the image as before.
export const sceneSchema = z.object({
  id: z.string().min(1),
  image_prompt: z.string().min(1),
  duration_seconds: z.number().positive(),
  image_bucket: z.string().min(1).optional(),
  image_path: z.string().min(1).optional(),
});

export type Scene = z.infer<typeof sceneSchema>;
