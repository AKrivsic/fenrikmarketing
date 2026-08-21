/**
 * Mechanical T2V render adapter.
 *
 * Projects approved canonical scenes into a technical Runway plan.
 * Must not change story, scene count, scene IDs, or call an LLM.
 */

import type { CreativeReview } from "@/lib/creative-review/types";
import type { VoiceDirectionContract } from "@/lib/content-package/voiceDirectionContract";
import {
  CANONICAL_VIDEO_PLAN_ORIGIN,
  canonicalVideoPlanFingerprint,
  extractCanonicalVideoScenesFromBrief,
  isVisualIntentVoiceoverCopy,
  readVisualIdentityFromBrief,
  type CanonicalVideoScene,
} from "@/lib/content-package/canonicalVideoPlan";
import {
  composeTextToVideoProviderPrompt,
  continuityBlockFromVisualIdentity,
} from "@/lib/content-package/textToVideoProviderPrompt";
import {
  TEXT_TO_VIDEO_PLAN_SCHEMA_VERSION,
  TEXT_TO_VIDEO_TARGET_MID_SECONDS,
  TEXT_TO_VIDEO_TIMING_ESTIMATED,
  deriveHookFromVoiceover,
  textToVideoCreativePlanSchema,
  type TextToVideoCreativePlan,
  type TextToVideoPlanScene,
} from "@/lib/content-package/textToVideoCreativePlan";
import {
  creativePlanContentFingerprint,
  fingerprintText,
  hookFingerprint,
  voiceoverRevisionId,
} from "@/lib/content-package/videoCreativeRevision";

export const T2V_CANONICAL_STORYBOARD_MISSING =
  "t2v_canonical_storyboard_missing" as const;
export const T2V_VISUAL_IS_VOICEOVER_COPY =
  "t2v_visual_is_voiceover_copy" as const;

function englishProductionVisual(args: {
  review: CreativeReview | null;
  canonical: CanonicalVideoScene;
}): string {
  const scene = args.review?.scenes.find((s) => s.id === args.canonical.id);
  const fromReview = scene?.intent.english_preview?.trim() ?? "";
  if (fromReview) return fromReview.slice(0, 600);
  const fromImage = args.canonical.image_prompt?.trim() ?? "";
  if (fromImage) return fromImage.slice(0, 600);
  return "";
}

function humanMeaningFromCanonical(canonical: CanonicalVideoScene): string {
  const image = canonical.image_prompt?.trim() ?? "";
  if (image) return image.slice(0, 600);
  const motion = canonical.motion_prompt?.trim() ?? "";
  if (motion) return motion.slice(0, 600);
  return canonical.voiceover_excerpt.slice(0, 600);
}

/**
 * Build a technical T2V draft from Claude's stored storyboard.
 * Scene count and IDs come from visual_scenes. Voiceover sentence count is ignored.
 */
export function buildTextToVideoRenderPlanFromCanonical(args: {
  packageId: string;
  brief: Record<string, unknown>;
  review?: CreativeReview | null;
  voiceoverText: string;
  hookText?: string;
  voiceDirection: VoiceDirectionContract;
  existingPlan?: TextToVideoCreativePlan | null;
  sceneVoiceoverBinding?: "confirmed" | "needs_review";
}): TextToVideoCreativePlan {
  const canonical = extractCanonicalVideoScenesFromBrief(args.brief);
  if (canonical.length < 3) {
    throw new Error(T2V_CANONICAL_STORYBOARD_MISSING);
  }

  const vo = args.voiceoverText.trim();
  const hook =
    args.hookText?.trim() ||
    (typeof args.brief.hook === "string" && args.brief.hook.trim()
      ? args.brief.hook.trim()
      : deriveHookFromVoiceover(vo));
  const voRevision = voiceoverRevisionId(vo);
  const voFingerprint = fingerprintText(vo);
  const hookFp = hookFingerprint(hook);
  const totalDuration = TEXT_TO_VIDEO_TARGET_MID_SECONDS;
  const perScene = totalDuration / canonical.length;
  const identity = readVisualIdentityFromBrief(args.brief);
  const continuity = continuityBlockFromVisualIdentity(identity);
  const existingById = new Map(
    (args.existingPlan?.scenes ?? []).map((scene) => [scene.scene_id, scene]),
  );

  const scenes: TextToVideoPlanScene[] = canonical.map((scene, index) => {
    const englishVisual = englishProductionVisual({
      review: args.review ?? null,
      canonical: scene,
    });
    if (
      englishVisual &&
      isVisualIntentVoiceoverCopy(englishVisual, scene.voiceover_excerpt)
    ) {
      throw new Error(T2V_VISUAL_IS_VOICEOVER_COPY);
    }
    const prior = existingById.get(scene.id);
    const visualIntent =
      englishVisual ||
      (prior && !isVisualIntentVoiceoverCopy(prior.visual_intent, scene.voiceover_excerpt)
        ? prior.visual_intent
        : humanMeaningFromCanonical(scene));
    if (!visualIntent.trim()) {
      throw new Error(T2V_VISUAL_IS_VOICEOVER_COPY);
    }
    if (isVisualIntentVoiceoverCopy(visualIntent, scene.voiceover_excerpt)) {
      throw new Error(T2V_VISUAL_IS_VOICEOVER_COPY);
    }
    const providerPrompt = composeTextToVideoProviderPrompt({
      englishVisualIntent: visualIntent,
      motionPrompt: scene.motion_prompt,
      energyMotion: prior?.energy_motion,
      continuity,
      canonicalScene: scene,
    });
    return {
      scene_id: scene.id,
      order: index,
      human_meaning: humanMeaningFromCanonical(scene),
      voiceover_excerpt: scene.voiceover_excerpt.slice(0, 800),
      approximate_start_seconds:
        prior?.approximate_start_seconds ?? Math.round(index * perScene * 10) / 10,
      approximate_duration_seconds:
        prior?.approximate_duration_seconds ?? Math.round(perScene * 10) / 10,
      visual_intent: visualIntent.slice(0, 600),
      energy_motion: (scene.motion_prompt ?? prior?.energy_motion ?? "").slice(0, 200),
      provider_prompt: providerPrompt.slice(0, 4000),
      human_visual_edit: visualIntent.slice(0, 600),
      canonical_scene_id: scene.id,
    };
  });

  const canonicalFp = canonicalVideoPlanFingerprint(canonical);
  const planFp = creativePlanContentFingerprint({
    schema_version: TEXT_TO_VIDEO_PLAN_SCHEMA_VERSION,
    voiceover_revision_id: voRevision,
    hook_fingerprint: hookFp,
    voice_direction_revision: args.voiceDirection.revision ?? 0,
    target_duration_seconds: totalDuration,
    origin: CANONICAL_VIDEO_PLAN_ORIGIN,
    canonical_plan_fingerprint: canonicalFp,
    scenes: scenes.map((s) => ({
      scene_id: s.scene_id,
      order: s.order,
      human_meaning: s.human_meaning,
      provider_prompt: s.provider_prompt,
    })),
  });

  return textToVideoCreativePlanSchema.parse({
    schema_version: TEXT_TO_VIDEO_PLAN_SCHEMA_VERSION,
    status: "draft",
    origin: CANONICAL_VIDEO_PLAN_ORIGIN,
    canonical_plan_fingerprint: canonicalFp,
    scene_voiceover_binding:
      args.sceneVoiceoverBinding ??
      args.existingPlan?.scene_voiceover_binding ??
      "confirmed",
    voiceover_revision_id: voRevision,
    voiceover_fingerprint: voFingerprint,
    approved_hook: hook,
    hook_fingerprint: hookFp,
    voice_direction_revision: args.voiceDirection.revision ?? 0,
    target_duration_seconds: totalDuration,
    scenes,
    plan_fingerprint: planFp,
    timing_status:
      args.existingPlan?.timing_status === "measured"
        ? TEXT_TO_VIDEO_TIMING_ESTIMATED
        : args.existingPlan?.timing_status ?? TEXT_TO_VIDEO_TIMING_ESTIMATED,
    measured_audio_revision_id: null,
    repetition: { status: "not_run", blocked_reasons: [] },
  });
}
