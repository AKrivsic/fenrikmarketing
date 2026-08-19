import { z } from "zod";
import { SCENE_TYPES } from "@/lib/scene-types/sceneType";
import { sceneVideoClipSchema } from "@/lib/video-engine/schemas/sceneVideoClipSchema";
import { RUNWAY_GEN4_MOTION_PROMPT_MAX_UTF16 } from "@/lib/ai/runway";

/** Light xfade vocabulary shared with storyboard / clip reel (optional on scenes). */
export const SCENE_TRANSITION_IN_VALUES = [
  "fade",
  "slide",
  "push",
  "none",
] as const;

export const sceneTransitionInSchema = z.enum(SCENE_TRANSITION_IN_VALUES);

// A single timeline scene of a generated video. MVP keeps only the fields the
// renderer truly needs: a stable id, the prompt used to generate the still
// image, and how long the scene stays on screen.
//
// image_bucket / image_path are optional durable references to an already
// rendered still in Supabase Storage. When both are present the worker reuses
// that image instead of calling the image provider (deterministic re-render /
// language variants). When absent the worker generates the image as before.
//
// video_clip is an optional durable reference to a pre-generated video clip for
// the standalone video-clip render path. When absent, production still uses
// stills. Canonical clip identity is bucket + path (never signed URL / local path).
//
// motion_prompt is optional text for future image-to-video generation (Runway
// promptText). Omitted on legacy still-only storyboards — planners may fall back.
// transition_in is optional incoming xfade for the clip-reel path only.
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
  /** Optional durable video clip for the non-default clip-render path. */
  video_clip: sceneVideoClipSchema.optional(),
  /**
   * Optional image-to-video motion prompt (snake_case, same family as image_prompt).
   * Max length matches Runway Gen-4 promptText (UTF-16 code units = JS string.length).
   */
  motion_prompt: z
    .string()
    .min(1)
    .max(RUNWAY_GEN4_MOTION_PROMPT_MAX_UTF16)
    .optional(),
  /** Optional incoming transition for video-clip reel assembly (not still Ken Burns). */
  transition_in: sceneTransitionInSchema.optional(),
});

export type Scene = z.infer<typeof sceneSchema>;
export type SceneTransitionIn = z.infer<typeof sceneTransitionInSchema>;
