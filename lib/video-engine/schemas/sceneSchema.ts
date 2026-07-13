import { z } from "zod";
import { SCENE_TYPES } from "@/lib/scene-types/sceneType";

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
  /** Source project asset when this still is a brand/product insert (optional). */
  asset_id: z.string().min(1).optional(),
  image_prompt: z.string().min(1),
  duration_seconds: z.number().positive(),
  image_bucket: z.string().min(1).optional(),
  image_path: z.string().min(1).optional(),
  /** How the renderer should treat this still (compositing hook; optional). */
  video_usage: z.string().min(1).optional(),
  /** Snapshot of source asset metadata for Product UI layout/motion (optional). */
  asset_metadata: z.unknown().optional(),
  /** Scene Types — optional; omitted means IMAGE (Phase 2). */
  type: z.enum(SCENE_TYPES).optional(),
  payload_snapshot: z.record(z.string(), z.unknown()).optional(),
  renderer_version: z.string().min(1).optional(),
});

export type Scene = z.infer<typeof sceneSchema>;
