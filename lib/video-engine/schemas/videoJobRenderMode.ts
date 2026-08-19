import { z } from "zod";

export const VIDEO_RENDER_MODE_STILL = "still" as const;
export const VIDEO_RENDER_MODE_AI_VIDEO_CLIPS = "ai_video_clips" as const;

export const videoRenderModeSchema = z.enum([
  VIDEO_RENDER_MODE_STILL,
  VIDEO_RENDER_MODE_AI_VIDEO_CLIPS,
]);

export type VideoRenderMode = z.infer<typeof videoRenderModeSchema>;

const videoJobRenderOptionsInputSchema = z
  .object({
    video_render_mode: videoRenderModeSchema.optional(),
    ai_scene_video_max_budget_usd: z.number().finite().optional(),
    ai_scene_video_confirm_paid_run: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    const mode = value.video_render_mode ?? VIDEO_RENDER_MODE_STILL;
    if (mode !== VIDEO_RENDER_MODE_AI_VIDEO_CLIPS) return;
    const budget = value.ai_scene_video_max_budget_usd;
    if (
      budget === undefined ||
      !Number.isFinite(budget) ||
      budget <= 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ai_scene_video_budget_required",
        path: ["ai_scene_video_max_budget_usd"],
      });
    }
    if (value.ai_scene_video_confirm_paid_run !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ai_scene_video_confirm_paid_run_required",
        path: ["ai_scene_video_confirm_paid_run"],
      });
    }
  });

export type VideoJobRenderOptions =
  | {
      ok: true;
      mode: typeof VIDEO_RENDER_MODE_STILL;
    }
  | {
      ok: true;
      mode: typeof VIDEO_RENDER_MODE_AI_VIDEO_CLIPS;
      maxBudgetUsd: number;
      confirmPaidRun: true;
    }
  | { ok: false; reason: string };

/**
 * Parses worker job input render mode. Missing mode ⇒ still (legacy jobs unchanged).
 */
export function parseVideoJobRenderOptions(
  input: Record<string, unknown>,
): VideoJobRenderOptions {
  const rawMode = input["video_render_mode"];
  if (rawMode === undefined || rawMode === null || rawMode === "") {
    return { ok: true, mode: VIDEO_RENDER_MODE_STILL };
  }
  if (typeof rawMode !== "string") {
    return { ok: false, reason: "video_render_mode_invalid" };
  }
  const parsed = videoJobRenderOptionsInputSchema.safeParse({
    video_render_mode: rawMode,
    ai_scene_video_max_budget_usd: input["ai_scene_video_max_budget_usd"],
    ai_scene_video_confirm_paid_run: input["ai_scene_video_confirm_paid_run"],
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "video_render_mode_invalid";
    return { ok: false, reason: first };
  }
  const mode = parsed.data.video_render_mode ?? VIDEO_RENDER_MODE_STILL;
  if (mode === VIDEO_RENDER_MODE_STILL) {
    return { ok: true, mode: VIDEO_RENDER_MODE_STILL };
  }
  return {
    ok: true,
    mode: VIDEO_RENDER_MODE_AI_VIDEO_CLIPS,
    maxBudgetUsd: parsed.data.ai_scene_video_max_budget_usd!,
    confirmPaidRun: true,
  };
}
