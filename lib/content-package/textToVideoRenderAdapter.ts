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
  significantVoiceoverChange,
  type CanonicalVideoScene,
} from "@/lib/content-package/canonicalVideoPlan";
import {
  composeTextToVideoProviderPrompt,
  T2V_GEN45_PROMPT_MAX_UTF16,
} from "@/lib/content-package/textToVideoProviderPrompt";
import { parseT2vScreenPolicy } from "@/lib/content-package/t2vScreenPolicy";
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
import { TEXT_TO_VIDEO_PROVIDER_PROMPT_CONTRACT_VERSION } from "@/lib/text-to-video/runwayProductionConfig";

export const T2V_CANONICAL_STORYBOARD_MISSING =
  "t2v_canonical_storyboard_missing" as const;
export const T2V_VISUAL_IS_VOICEOVER_COPY =
  "t2v_visual_is_voiceover_copy" as const;

function englishProductionVisual(args: {
  review: CreativeReview | null;
  canonical: CanonicalVideoScene;
}): string {
  const fromImage = args.canonical.image_prompt?.trim() ?? "";
  if (fromImage) return fromImage.slice(0, 600);
  const scene = args.review?.scenes.find((s) => s.id === args.canonical.id);
  const fromReview = scene?.intent.english_preview?.trim() ?? "";
  if (fromReview) return fromReview.slice(0, 600);
  return "";
}

function humanMeaningFromCanonical(canonical: CanonicalVideoScene): string {
  const image = canonical.image_prompt?.trim() ?? "";
  if (image) return image.slice(0, 600);
  const motion = canonical.motion_prompt?.trim() ?? "";
  if (motion) return motion.slice(0, 600);
  return canonical.voiceover_excerpt.slice(0, 600);
}

function sceneVisualRebuildRequired(args: {
  canonical: CanonicalVideoScene;
  review: CreativeReview | null;
  priorReview: CreativeReview | null | undefined;
  priorPlanScene: TextToVideoPlanScene | undefined;
  clearedVisualRebuildSceneIds?: string[];
}): boolean {
  if (args.clearedVisualRebuildSceneIds?.includes(args.canonical.id)) {
    return false;
  }
  if (args.priorPlanScene?.visual_rebuild_status === "rebuild_required") {
    return true;
  }
  const previousCs =
    args.priorReview?.scenes.find((scene) => scene.id === args.canonical.id)
      ?.intent.localized_edit ?? "";
  const nextCs =
    args.review?.scenes.find((scene) => scene.id === args.canonical.id)?.intent
      .localized_edit ?? "";
  if (!args.priorReview || !previousCs || !nextCs) return false;
  return significantVoiceoverChange(previousCs, nextCs);
}

/**
 * Build a technical T2V draft from Claude's stored storyboard.
 * Scene count and IDs come from visual_scenes. Voiceover sentence count is ignored.
 */
export function buildTextToVideoRenderPlanFromCanonical(args: {
  packageId: string;
  brief: Record<string, unknown>;
  review?: CreativeReview | null;
  priorReview?: CreativeReview | null;
  voiceoverText: string;
  hookText?: string;
  voiceDirection: VoiceDirectionContract;
  existingPlan?: TextToVideoCreativePlan | null;
  sceneVoiceoverBinding?: "confirmed" | "needs_review";
  /** Scene IDs whose still/motion were just rebuilt — treat as current. */
  clearedVisualRebuildSceneIds?: string[];
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
  const existingById = new Map(
    (args.existingPlan?.scenes ?? []).map((scene) => [scene.scene_id, scene]),
  );

  const scenes: TextToVideoPlanScene[] = canonical.map((scene, index) => {
    const prior = existingById.get(scene.id);
    const rebuildRequired = sceneVisualRebuildRequired({
      canonical: scene,
      review: args.review ?? null,
      priorReview: args.priorReview,
      priorPlanScene: prior,
      clearedVisualRebuildSceneIds: args.clearedVisualRebuildSceneIds,
    });
    const reviewPreview =
      args.review?.scenes
        .find((item) => item.id === scene.id)
        ?.intent.english_preview?.trim() ?? "";
    const englishVisual = rebuildRequired
      ? reviewPreview
      : englishProductionVisual({
          review: args.review ?? null,
          canonical: scene,
        });
    if (
      englishVisual &&
      isVisualIntentVoiceoverCopy(englishVisual, scene.voiceover_excerpt)
    ) {
      throw new Error(T2V_VISUAL_IS_VOICEOVER_COPY);
    }
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
    const extras = {
      environment: scene.environment ?? null,
      camera: scene.camera ?? null,
      screen_policy: scene.screen_policy ?? null,
      continuity_hints: scene.continuity_hints ?? null,
    };
    const visualEvent = rebuildRequired ? "" : (scene.image_prompt ?? "").trim();
    const providerPrompt = composeTextToVideoProviderPrompt({
      visualEvent,
      englishVisualIntent: rebuildRequired ? visualIntent : visualEvent || visualIntent,
      motionPrompt: rebuildRequired ? "" : scene.motion_prompt,
      energyMotion: rebuildRequired ? "" : prior?.energy_motion,
      setting: extras.environment ?? undefined,
      sceneCamera: extras.camera ?? undefined,
      screenPolicy: parseT2vScreenPolicy(extras.screen_policy),
      continuityHints: extras.continuity_hints ?? undefined,
      canonicalScene: rebuildRequired ? null : scene,
      omitStaleVisuals: rebuildRequired,
    });
    if (providerPrompt.length > T2V_GEN45_PROMPT_MAX_UTF16) {
      throw new Error("t2v_provider_prompt_too_long");
    }
    return {
      scene_id: scene.id,
      order: index,
      human_meaning: (englishVisual || humanMeaningFromCanonical(scene)).slice(0, 600),
      voiceover_excerpt: scene.voiceover_excerpt.slice(0, 800),
      approximate_start_seconds:
        prior?.approximate_start_seconds ?? Math.round(index * perScene * 10) / 10,
      approximate_duration_seconds:
        prior?.approximate_duration_seconds ?? Math.round(perScene * 10) / 10,
      visual_intent: visualIntent.slice(0, 600),
      energy_motion: rebuildRequired
        ? ""
        : (scene.motion_prompt ?? prior?.energy_motion ?? "").slice(0, 200),
      provider_prompt: providerPrompt,
      human_visual_edit: visualIntent.slice(0, 600),
      canonical_scene_id: scene.id,
      visual_rebuild_status: rebuildRequired ? "rebuild_required" : "current",
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
    prompt_contract_version: TEXT_TO_VIDEO_PROVIDER_PROMPT_CONTRACT_VERSION,
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
    prompt_contract_version: TEXT_TO_VIDEO_PROVIDER_PROMPT_CONTRACT_VERSION,
    repetition: { status: "not_run", blocked_reasons: [] },
  });
}
