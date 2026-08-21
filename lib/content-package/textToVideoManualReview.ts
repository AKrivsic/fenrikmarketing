/**
 * Manual Review helpers exclusive to text_to_video packages.
 * Still packages must not import these for spoken-field rebuild.
 */

import type { AntiRepetitionMemory } from "@/lib/ai/types";
import type { CreativeReview } from "@/lib/creative-review/types";
import { productionSpokenVoiceoverFromReview } from "@/lib/creative-review/productionSpokenVoiceover";
import {
  applyRepetitionResultToPlan,
  approveTextToVideoCreativePlan,
  checkTextToVideoRepetition,
  deriveHookFromVoiceover,
  isLegacySentenceFallbackPlan,
  readTextToVideoCreativePlan,
  serializeTextToVideoCreativePlan,
  textToVideoPlanLockedForContinue,
  VIDEO_TEXT_TO_VIDEO_CREATIVE_PLAN_KEY,
  voiceDirectionFromBriefOrDefault,
  type TextToVideoCreativePlan,
} from "@/lib/content-package/textToVideoCreativePlan";
import { buildTextToVideoRenderPlanFromCanonical } from "@/lib/content-package/textToVideoRenderAdapter";
import {
  extractCanonicalVideoScenesFromBrief,
  significantVoiceoverChange,
} from "@/lib/content-package/canonicalVideoPlan";
import { assertTextToVideoPlanApprovable } from "@/lib/content-package/textToVideoPlanApprovalGate";
import {
  parseTextToVideoSoundPlan,
  VIDEO_TEXT_TO_VIDEO_SOUND_PLAN_KEY,
} from "@/lib/content-package/textToVideoSoundPlan";
import {
  serializeVideoCreativeIntegrity,
  syncVideoCreativeIntegrityFromSources,
  VIDEO_CREATIVE_INTEGRITY_KEY,
} from "@/lib/content-package/videoCreativeIntegrity";
import { PACKAGE_VIDEO_MODE_TEXT_TO_VIDEO } from "@/lib/content-package/packageVideoProductionMode";
import { validateSceneSoundForApproval } from "@/lib/text-to-video/textToVideoSfxAnchoring";

export const T2V_PRODUCTION_TRANSLATION_MISSING =
  "t2v_production_translation_missing" as const;
export const T2V_PLAN_NOT_LOCKED_FOR_CONTINUE =
  "t2v_plan_not_locked_for_continue" as const;
export const T2V_WORKING_COPY_MUST_NOT_BE_SPOKEN =
  "t2v_working_copy_must_not_be_spoken" as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/** Missing or auto SFX/music is stored as explicit none — UI must not imply generated audio. */
export function coerceOperatorSoundPlanToExplicitNone(
  brief: Record<string, unknown>,
): Record<string, unknown> {
  const sound = parseTextToVideoSoundPlan(
    brief[VIDEO_TEXT_TO_VIDEO_SOUND_PLAN_KEY],
  );
  if (!sound) return brief;
  const scene_sound: typeof sound.scene_sound = {};
  for (const [sceneId, entry] of Object.entries(sound.scene_sound)) {
    scene_sound[sceneId] =
      entry.mode === "auto" ? { ...entry, mode: "none" } : entry;
  }
  const music =
    sound.music.mode === "auto" ? { ...sound.music, mode: "none" as const } : sound.music;
  return {
    ...brief,
    [VIDEO_TEXT_TO_VIDEO_SOUND_PLAN_KEY]: {
      ...sound,
      music,
      scene_sound,
    },
  };
}

export type TextToVideoOperatorApprovalState =
  | "in_progress"
  | "waiting_for_translation"
  | "ready_to_approve"
  | "approved"
  | "stale_after_change";

export function textToVideoOperatorApprovalState(args: {
  review: CreativeReview;
  planStatus: string | null;
  repetitionStatus: string | null;
  origin?: string | null;
  sceneVoiceoverBinding?: string | null;
  canRestoreCanonicalPlan?: boolean;
  sceneVisualRebuildRequired?: boolean;
}): TextToVideoOperatorApprovalState {
  const production = productionSpokenVoiceoverFromReview(args.review);
  if (!production) return "waiting_for_translation";
  if (args.canRestoreCanonicalPlan || args.origin === "sentence_fallback") {
    return "in_progress";
  }
  if (args.sceneVoiceoverBinding === "needs_review") return "in_progress";
  if (args.sceneVisualRebuildRequired) return "stale_after_change";
  if (args.review.approved && args.planStatus === "approved") return "approved";
  if (args.review.approved && args.planStatus !== "approved") {
    return "stale_after_change";
  }
  if (args.planStatus === "stale") return "stale_after_change";
  if (
    production &&
    args.planStatus &&
    args.planStatus !== "repetition_blocked" &&
    args.repetitionStatus === "passed"
  ) {
    return "ready_to_approve";
  }
  return "in_progress";
}

export function syncSpokenFieldsFromProductionVoiceover(
  brief: Record<string, unknown>,
  productionVoiceover: string,
  hook: string,
): Record<string, unknown> {
  const vo = productionVoiceover.trim();
  const hookText = hook.trim();
  return {
    ...brief,
    voiceover_text: vo,
    subtitles: vo,
    hook: hookText,
  };
}

function persistCanonicalPlanOnBrief(args: {
  brief: Record<string, unknown>;
  plan: TextToVideoCreativePlan;
  productionVoiceover: string;
  hook: string;
  direction: ReturnType<typeof voiceDirectionFromBriefOrDefault>;
}): Record<string, unknown> {
  return {
    ...args.brief,
    [VIDEO_TEXT_TO_VIDEO_CREATIVE_PLAN_KEY]:
      serializeTextToVideoCreativePlan(args.plan),
    [VIDEO_CREATIVE_INTEGRITY_KEY]: serializeVideoCreativeIntegrity(
      syncVideoCreativeIntegrityFromSources({
        voiceoverText: args.productionVoiceover,
        hookText: args.hook,
        voiceDirection: args.direction,
        plan: args.plan,
        packageVideoMode: PACKAGE_VIDEO_MODE_TEXT_TO_VIDEO,
      }),
    ),
    video_paid_preflight: {
      ...(asRecord(args.brief.video_paid_preflight) ?? {}),
      similarity_check_status:
        args.plan.repetition.status === "passed"
          ? "passed"
          : args.plan.repetition.status === "blocked"
            ? "failed"
            : "not_run",
    },
  };
}

/**
 * Save-time mechanical projection: rebuild Runway prompts from canonical scenes.
 * Does not split voiceover. Does not overwrite video.script.
 */
export function syncCanonicalTextToVideoRenderPlanOnSave(args: {
  brief: Record<string, unknown>;
  packageId: string;
  productionVoiceover: string;
  review: CreativeReview;
  memory: AntiRepetitionMemory;
  priorPlanFingerprints?: string[];
  timestamp?: string;
  previousProductionVoiceover?: string;
  confirmSceneVoiceoverBinding?: boolean;
  priorReview?: CreativeReview | null;
  clearedVisualRebuildSceneIds?: string[];
}): Record<string, unknown> {
  const productionVo = args.productionVoiceover.trim();
  if (!productionVo) {
    throw new Error(T2V_PRODUCTION_TRANSLATION_MISSING);
  }
  const canonical = extractCanonicalVideoScenesFromBrief(args.brief);
  if (canonical.length < 3) {
    throw new Error("t2v_canonical_storyboard_missing");
  }
  const existing = readTextToVideoCreativePlan(args.brief);
  if (existing && isLegacySentenceFallbackPlan(existing, canonical.length)) {
    throw new Error("t2v_plan_sentence_fallback");
  }
  const previousVo =
    args.previousProductionVoiceover ??
    (typeof args.brief.voiceover_text === "string"
      ? args.brief.voiceover_text
      : "");
  const voChanged = significantVoiceoverChange(previousVo, productionVo);
  const binding = args.confirmSceneVoiceoverBinding
    ? "confirmed"
    : voChanged
      ? "needs_review"
      : existing?.scene_voiceover_binding ?? "confirmed";
  const direction = voiceDirectionFromBriefOrDefault(args.brief);
  const hook =
    typeof args.brief.hook === "string" && args.brief.hook.trim() && !voChanged
      ? args.brief.hook.trim()
      : deriveHookFromVoiceover(productionVo);
  let plan = buildTextToVideoRenderPlanFromCanonical({
    packageId: args.packageId,
    brief: args.brief,
    review: args.review,
    priorReview: args.priorReview,
    voiceoverText: productionVo,
    hookText: hook,
    voiceDirection: direction,
    existingPlan: existing,
    sceneVoiceoverBinding: binding,
    clearedVisualRebuildSceneIds: args.clearedVisualRebuildSceneIds,
  });
  const timestamp = args.timestamp ?? new Date().toISOString();
  const repetition = checkTextToVideoRepetition({
    plan,
    memory: args.memory,
    priorPlanFingerprints: args.priorPlanFingerprints,
  });
  plan = applyRepetitionResultToPlan(plan, repetition, timestamp);
  let next = syncSpokenFieldsFromProductionVoiceover(args.brief, productionVo, hook);
  next = coerceOperatorSoundPlanToExplicitNone(next);
  return persistCanonicalPlanOnBrief({
    brief: next,
    plan,
    productionVoiceover: productionVo,
    hook,
    direction,
  });
}

/**
 * @deprecated Name kept for call-site compatibility. Save uses canonical
 * projection; Approve must not rebuild the storyboard.
 */
export function applyProductionVoiceoverToTextToVideoBrief(args: {
  brief: Record<string, unknown>;
  packageId: string;
  productionVoiceover: string;
  memory: AntiRepetitionMemory;
  review?: CreativeReview | null;
  priorPlanFingerprints?: string[];
  approvePlan?: boolean;
  timestamp?: string;
  previousProductionVoiceover?: string;
  confirmSceneVoiceoverBinding?: boolean;
  priorReview?: CreativeReview | null;
  clearedVisualRebuildSceneIds?: string[];
}): Record<string, unknown> {
  if (args.approvePlan) {
    throw new Error("t2v_approve_must_not_rebuild_plan");
  }
  if (!args.review) {
    throw new Error("t2v_canonical_storyboard_missing");
  }
  return syncCanonicalTextToVideoRenderPlanOnSave({
    brief: args.brief,
    packageId: args.packageId,
    productionVoiceover: args.productionVoiceover,
    review: args.review,
    memory: args.memory,
    priorPlanFingerprints: args.priorPlanFingerprints,
    timestamp: args.timestamp,
    previousProductionVoiceover: args.previousProductionVoiceover,
    confirmSceneVoiceoverBinding: args.confirmSceneVoiceoverBinding,
    priorReview: args.priorReview,
    clearedVisualRebuildSceneIds: args.clearedVisualRebuildSceneIds,
  });
}

/** Approve locks the current canonical plan. Does not rebuild scenes. */
export function lockApprovedCanonicalTextToVideoPlan(args: {
  brief: Record<string, unknown>;
  review: CreativeReview;
  timestamp?: string;
}): Record<string, unknown> {
  const plan = readTextToVideoCreativePlan(args.brief);
  assertTextToVideoPlanApprovable({
    plan,
    brief: args.brief,
    review: args.review,
  });
  if (!plan) {
    throw new Error("t2v_plan_not_canonical");
  }
  const timestamp = args.timestamp ?? new Date().toISOString();
  const approved = approveTextToVideoCreativePlan(plan, timestamp);
  const direction = voiceDirectionFromBriefOrDefault(args.brief);
  const vo =
    typeof args.brief.voiceover_text === "string"
      ? args.brief.voiceover_text.trim()
      : "";
  const next = coerceOperatorSoundPlanToExplicitNone(args.brief);
  return persistCanonicalPlanOnBrief({
    brief: next,
    plan: approved,
    productionVoiceover: vo,
    hook: approved.approved_hook,
    direction,
  });
}

export function assertTextToVideoPlanLockedForContinue(args: {
  brief: Record<string, unknown>;
  review: CreativeReview;
}): {
  productionVoiceover: string;
  plan: TextToVideoCreativePlan;
  hook: string;
} {
  const productionVoiceover = productionSpokenVoiceoverFromReview(args.review);
  if (!productionVoiceover) {
    throw new Error(T2V_PRODUCTION_TRANSLATION_MISSING);
  }
  const briefVo =
    typeof args.brief.voiceover_text === "string"
      ? args.brief.voiceover_text.trim()
      : "";
  if (briefVo !== productionVoiceover) {
    throw new Error(T2V_PLAN_NOT_LOCKED_FOR_CONTINUE);
  }
  const localized = args.review.voiceover.localized_edit.trim();
  if (localized && localized === productionVoiceover) {
    const language =
      typeof args.brief.language === "string" ? args.brief.language : "";
    if (language.toLowerCase().startsWith("en")) {
      const editorLooksNonEnglish = /[áčďéěíňóřšťúůýž]/i.test(localized);
      if (editorLooksNonEnglish) {
        throw new Error(T2V_WORKING_COPY_MUST_NOT_BE_SPOKEN);
      }
    }
  }
  const plan = readTextToVideoCreativePlan(args.brief);
  if (!plan) {
    throw new Error(T2V_PLAN_NOT_LOCKED_FOR_CONTINUE);
  }
  const hook =
    typeof args.brief.hook === "string" && args.brief.hook.trim()
      ? args.brief.hook.trim()
      : plan.approved_hook;
  const direction = voiceDirectionFromBriefOrDefault(args.brief);
  if (
    !textToVideoPlanLockedForContinue({
      plan,
      productionVoiceover,
      hookText: hook,
      voiceDirectionRevision: direction.revision ?? 0,
    })
  ) {
    throw new Error(T2V_PLAN_NOT_LOCKED_FOR_CONTINUE);
  }
  if (plan.approved_hook.trim() !== hook.trim()) {
    throw new Error(T2V_PLAN_NOT_LOCKED_FOR_CONTINUE);
  }
  if (isLegacySentenceFallbackPlan(plan)) {
    throw new Error("t2v_plan_sentence_fallback");
  }
  if (plan.origin !== "canonical_storyboard") {
    throw new Error("t2v_plan_not_canonical");
  }
  assertTextToVideoPlanApprovable({
    plan,
    brief: args.brief,
    review: args.review,
  });
  const sound = parseTextToVideoSoundPlan(
    args.brief[VIDEO_TEXT_TO_VIDEO_SOUND_PLAN_KEY],
  );
  if (sound) {
    for (const entry of Object.values(sound.scene_sound)) {
      validateSceneSoundForApproval(entry, productionVoiceover);
    }
  }
  return { productionVoiceover, plan, hook };
}

export function snapshotTextToVideoPlanForContinueGuard(
  plan: TextToVideoCreativePlan,
): {
  planFingerprint: string;
  sceneIds: string[];
  providerPrompts: string[];
  orders: number[];
} {
  const scenes = [...plan.scenes].sort((a, b) => a.order - b.order);
  return {
    planFingerprint: plan.plan_fingerprint,
    sceneIds: scenes.map((s) => s.scene_id),
    providerPrompts: scenes.map((s) => s.provider_prompt),
    orders: scenes.map((s) => s.order),
  };
}

export function textToVideoPlanSnapshotEquals(
  a: ReturnType<typeof snapshotTextToVideoPlanForContinueGuard>,
  b: ReturnType<typeof snapshotTextToVideoPlanForContinueGuard>,
): boolean {
  return (
    a.planFingerprint === b.planFingerprint &&
    a.sceneIds.join("|") === b.sceneIds.join("|") &&
    a.providerPrompts.join("\n") === b.providerPrompts.join("\n") &&
    a.orders.join(",") === b.orders.join(",")
  );
}
