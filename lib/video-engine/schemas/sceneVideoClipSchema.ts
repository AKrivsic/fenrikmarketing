import { z } from "zod";

/**
 * Provider-agnostic durable object identity (Supabase Storage or equivalent).
 * Canonical identity is bucket + path — never signed URLs or local paths.
 */
export const durableStorageRefSchema = z.object({
  bucket: z.string().min(1),
  path: z.string().min(1),
});

export type DurableStorageRef = z.infer<typeof durableStorageRefSchema>;

/**
 * Optional stored video clip for a scene. Not Runway-specific: any provider
 * may populate provider/model metadata. Image still fields remain the primary
 * still-render path when this object is absent.
 */
export const sceneVideoClipSchema = z.object({
  bucket: z.string().min(1),
  path: z.string().min(1),
  /** Originating generation provider id (optional, opaque). */
  provider: z.string().min(1).optional(),
  /** Model id used to produce the clip (optional, opaque). */
  model: z.string().min(1).optional(),
  /** Declared clip length in seconds (optional hint; always re-probed). */
  duration_seconds: z.number().positive().optional(),
  /** Declared audio presence (optional hint; always re-probed). */
  has_audio: z.boolean().optional(),
  /** Optional opaque generation attempt / task correlation id. */
  generation_attempt_id: z.string().min(1).optional(),
});

export type SceneVideoClip = z.infer<typeof sceneVideoClipSchema>;

/** Normalize unknown JSON into SceneVideoClip or null (invalid → null). */
export function normalizeSceneVideoClip(value: unknown): SceneVideoClip | null {
  const parsed = sceneVideoClipSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
