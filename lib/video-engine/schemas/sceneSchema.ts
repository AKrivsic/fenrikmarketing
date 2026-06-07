import { z } from "zod";

// A single timeline scene of a generated video. MVP keeps only the fields the
// renderer truly needs: a stable id, the prompt used to generate the still
// image, and how long the scene stays on screen.
export const sceneSchema = z.object({
  id: z.string().min(1),
  image_prompt: z.string().min(1),
  duration_seconds: z.number().positive(),
});

export type Scene = z.infer<typeof sceneSchema>;
