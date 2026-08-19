import { z } from "zod";

export const TEXT_TO_VIDEO_SCENE_SOUND_MODES = ["auto", "none", "custom"] as const;
export type TextToVideoSceneSoundMode =
  (typeof TEXT_TO_VIDEO_SCENE_SOUND_MODES)[number];

export const TEXT_TO_VIDEO_SFX_ANCHORS = [
  "scene_start",
  "scene_beginning",
  "scene_middle",
  "scene_end",
  "voice_phrase",
] as const;
export type TextToVideoSfxAnchor = (typeof TEXT_TO_VIDEO_SFX_ANCHORS)[number];

export const textToVideoSceneSoundSchema = z.object({
  mode: z.enum(TEXT_TO_VIDEO_SCENE_SOUND_MODES).default("auto"),
  custom_effect_description: z.string().max(300).optional(),
  anchor: z.enum(TEXT_TO_VIDEO_SFX_ANCHORS).optional(),
  voice_phrase: z.string().max(200).optional(),
});

export type TextToVideoSceneSound = z.infer<typeof textToVideoSceneSoundSchema>;

export const TEXT_TO_VIDEO_MUSIC_MODES = [
  "auto",
  "none",
  "existing_asset",
  "eleven_generated",
] as const;
export type TextToVideoMusicMode = (typeof TEXT_TO_VIDEO_MUSIC_MODES)[number];

export const textToVideoMusicPlanSchema = z.object({
  mode: z.enum(TEXT_TO_VIDEO_MUSIC_MODES).default("auto"),
  mood: z.string().max(200).optional(),
  existing_asset_bucket: z.string().optional(),
  existing_asset_path: z.string().optional(),
});

export type TextToVideoMusicPlan = z.infer<typeof textToVideoMusicPlanSchema>;

export const TEXT_TO_VIDEO_SOUND_PLAN_SCHEMA_VERSION = 1 as const;

export const textToVideoSoundPlanSchema = z.object({
  schema_version: z.literal(TEXT_TO_VIDEO_SOUND_PLAN_SCHEMA_VERSION),
  revision: z.number().int().nonnegative().default(0),
  music: textToVideoMusicPlanSchema.default({ mode: "auto" }),
  scene_sound: z.record(z.string(), textToVideoSceneSoundSchema).default({}),
});

export type TextToVideoSoundPlan = z.infer<typeof textToVideoSoundPlanSchema>;

export function defaultTextToVideoSoundPlan(): TextToVideoSoundPlan {
  return textToVideoSoundPlanSchema.parse({});
}

export const VIDEO_TEXT_TO_VIDEO_SOUND_PLAN_KEY =
  "video_text_to_video_sound_plan" as const;

export function proposeAutoSoundPlanFromCreativePlan(
  plan: import("@/lib/content-package/textToVideoCreativePlan").TextToVideoCreativePlan,
): TextToVideoSoundPlan {
  const scene_sound: Record<string, TextToVideoSceneSound> = {};
  let effects = 0;
  for (const scene of plan.scenes) {
    if (effects >= 3) break;
    const intent = scene.sound_intent?.trim();
    if (!intent) continue;
    scene_sound[scene.scene_id] = {
      mode: "custom",
      custom_effect_description: intent.slice(0, 300),
      anchor: "scene_beginning",
    };
    effects += 1;
  }
  return textToVideoSoundPlanSchema.parse({
    schema_version: TEXT_TO_VIDEO_SOUND_PLAN_SCHEMA_VERSION,
    revision: 0,
    music: { mode: effects > 0 ? "auto" : "none" },
    scene_sound,
  });
}

export function bumpSoundPlanRevision(plan: TextToVideoSoundPlan): TextToVideoSoundPlan {
  return { ...plan, revision: plan.revision + 1 };
}

export function parseTextToVideoSoundPlan(raw: unknown): TextToVideoSoundPlan | null {
  if (raw === undefined || raw === null) return null;
  const parsed = textToVideoSoundPlanSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
