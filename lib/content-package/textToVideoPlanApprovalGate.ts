/**
 * Fail-closed gates for T2V Approve / Continue.
 * Stable error codes — documented in PRODUCTION_CANONICAL_VIDEO_PLAN_FIX_REPORT.md.
 */

import type { CreativeReview } from "@/lib/creative-review/types";
import {
  CANONICAL_VIDEO_PLAN_ORIGIN,
  containsCzechDiacritics,
  extractCanonicalVideoScenesFromBrief,
  isVisualIntentVoiceoverCopy,
} from "@/lib/content-package/canonicalVideoPlan";
import {
  isLegacySentenceFallbackPlan,
  type TextToVideoCreativePlan,
} from "@/lib/content-package/textToVideoCreativePlan";
import { isEnglishPreviewCurrent } from "@/lib/creative-review/lifecycle";

export const T2V_PLAN_SENTENCE_FALLBACK = "t2v_plan_sentence_fallback" as const;
export const T2V_SCENE_COUNT_MISMATCH = "t2v_scene_count_mismatch" as const;
export const T2V_VISUAL_IS_VOICEOVER_COPY = "t2v_visual_is_voiceover_copy" as const;
export const T2V_SCENE_CS_MISSING = "t2v_scene_cs_missing" as const;
export const T2V_SCENE_EN_MISSING = "t2v_scene_en_missing" as const;
export const T2V_PROVIDER_PROMPT_MISSING = "t2v_provider_prompt_missing" as const;
export const T2V_PROVIDER_PROMPT_NOT_ENGLISH =
  "t2v_provider_prompt_not_english" as const;
export const T2V_SCENE_VOICEOVER_BINDING_MISSING =
  "t2v_scene_voiceover_binding_missing" as const;
export const T2V_SCENE_VOICEOVER_BINDING_NEEDS_REVIEW =
  "t2v_scene_voiceover_binding_needs_review" as const;
export const T2V_CANONICAL_FINGERPRINT_MISMATCH =
  "t2v_canonical_fingerprint_mismatch" as const;
export const T2V_PLAN_NOT_CANONICAL = "t2v_plan_not_canonical" as const;
export const T2V_SCENE_ID_MISMATCH = "t2v_scene_id_mismatch" as const;

export type TextToVideoPlanApprovalBlocker =
  | typeof T2V_PLAN_SENTENCE_FALLBACK
  | typeof T2V_SCENE_COUNT_MISMATCH
  | typeof T2V_VISUAL_IS_VOICEOVER_COPY
  | typeof T2V_SCENE_CS_MISSING
  | typeof T2V_SCENE_EN_MISSING
  | typeof T2V_PROVIDER_PROMPT_MISSING
  | typeof T2V_PROVIDER_PROMPT_NOT_ENGLISH
  | typeof T2V_SCENE_VOICEOVER_BINDING_MISSING
  | typeof T2V_SCENE_VOICEOVER_BINDING_NEEDS_REVIEW
  | typeof T2V_CANONICAL_FINGERPRINT_MISMATCH
  | typeof T2V_PLAN_NOT_CANONICAL
  | typeof T2V_SCENE_ID_MISMATCH;

export function collectTextToVideoPlanApprovalBlockers(args: {
  plan: TextToVideoCreativePlan | null;
  brief: Record<string, unknown>;
  review: CreativeReview | null;
}): TextToVideoPlanApprovalBlocker[] {
  const blockers: TextToVideoPlanApprovalBlocker[] = [];
  const canonical = extractCanonicalVideoScenesFromBrief(args.brief);
  const plan = args.plan;

  if (!plan) {
    blockers.push(T2V_PLAN_NOT_CANONICAL);
    return blockers;
  }

  if (isLegacySentenceFallbackPlan(plan, canonical.length)) {
    blockers.push(T2V_PLAN_SENTENCE_FALLBACK);
  }
  if (plan.origin !== CANONICAL_VIDEO_PLAN_ORIGIN) {
    blockers.push(T2V_PLAN_NOT_CANONICAL);
  }
  if (canonical.length > 0 && plan.scenes.length !== canonical.length) {
    blockers.push(T2V_SCENE_COUNT_MISMATCH);
  }
  if (plan.scene_voiceover_binding === "needs_review") {
    blockers.push(T2V_SCENE_VOICEOVER_BINDING_NEEDS_REVIEW);
  }

  for (let i = 0; i < plan.scenes.length; i++) {
    const renderScene = plan.scenes[i]!;
    const canonicalScene = canonical[i];
    if (canonicalScene && renderScene.scene_id !== canonicalScene.id) {
      blockers.push(T2V_SCENE_ID_MISMATCH);
    }
    if (!renderScene.voiceover_excerpt.trim()) {
      blockers.push(T2V_SCENE_VOICEOVER_BINDING_MISSING);
    }
    if (
      isVisualIntentVoiceoverCopy(
        renderScene.human_visual_edit ?? renderScene.visual_intent,
        renderScene.voiceover_excerpt,
      )
    ) {
      blockers.push(T2V_VISUAL_IS_VOICEOVER_COPY);
    }
    if (!renderScene.provider_prompt.trim()) {
      blockers.push(T2V_PROVIDER_PROMPT_MISSING);
    }
    if (
      containsCzechDiacritics(renderScene.provider_prompt) ||
      containsCzechDiacritics(renderScene.visual_intent)
    ) {
      blockers.push(T2V_PROVIDER_PROMPT_NOT_ENGLISH);
    }
    const reviewScene = args.review?.scenes.find(
      (scene) => scene.id === renderScene.scene_id,
    );
    if (!reviewScene?.intent.localized_edit.trim()) {
      blockers.push(T2V_SCENE_CS_MISSING);
    }
    if (
      !reviewScene ||
      !isEnglishPreviewCurrent({
        english_preview: reviewScene.intent.english_preview,
        english_preview_outdated: reviewScene.intent.english_preview_outdated,
      })
    ) {
      blockers.push(T2V_SCENE_EN_MISSING);
    }
  }

  return Array.from(new Set(blockers));
}

export function assertTextToVideoPlanApprovable(args: {
  plan: TextToVideoCreativePlan | null;
  brief: Record<string, unknown>;
  review: CreativeReview | null;
}): void {
  const blockers = collectTextToVideoPlanApprovalBlockers(args);
  if (blockers.length > 0) {
    throw new Error(blockers[0]);
  }
}
