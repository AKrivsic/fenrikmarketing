/**
 * Restore a technical T2V draft from the stored Claude storyboard.
 * No provider calls. Does not auto-run on remote.
 */

import type { CreativeReview, CreativeReviewScene } from "@/lib/creative-review/types";
import {
  extractCanonicalVideoScenesFromBrief,
  readVisualScenesFromBrief,
  stampCanonicalIdsOnVisualScenes,
  CANONICAL_VIDEO_PLAN_ORIGIN,
} from "@/lib/content-package/canonicalVideoPlan";
import {
  applyRepetitionResultToPlan,
  checkTextToVideoRepetition,
  isLegacySentenceFallbackPlan,
  readTextToVideoCreativePlan,
  serializeTextToVideoCreativePlan,
  VIDEO_TEXT_TO_VIDEO_CREATIVE_PLAN_KEY,
  voiceDirectionFromBriefOrDefault,
} from "@/lib/content-package/textToVideoCreativePlan";
import { buildTextToVideoRenderPlanFromCanonical } from "@/lib/content-package/textToVideoRenderAdapter";
import {
  proposeAutoSoundPlanFromCreativePlan,
  parseTextToVideoSoundPlan,
  VIDEO_TEXT_TO_VIDEO_SOUND_PLAN_KEY,
} from "@/lib/content-package/textToVideoSoundPlan";
import {
  serializeVideoCreativeIntegrity,
  syncVideoCreativeIntegrityFromSources,
  VIDEO_CREATIVE_INTEGRITY_KEY,
} from "@/lib/content-package/videoCreativeIntegrity";
import { EMPTY_MEMORY } from "@/lib/ai/workflows/antiRepetitionMemory";
import { readCreativeReviewFromBrief } from "@/lib/creative-review/read";
import { computeCreativeReviewStatus } from "@/lib/creative-review/lifecycle";
import { TEXT_TO_VIDEO_PROVIDER_PROMPT_CONTRACT_VERSION } from "@/lib/text-to-video/runwayProductionConfig";
import { syncCanonicalTextToVideoRenderPlanOnSave } from "@/lib/content-package/textToVideoManualReview";

const PENDING_SCENE_INTENT = "Creative intent pending.";

export const T2V_CANONICAL_RESTORE_NOT_NEEDED =
  "t2v_canonical_restore_not_needed" as const;
export const T2V_CANONICAL_STORYBOARD_MISSING =
  "t2v_canonical_storyboard_missing" as const;
export const T2V_PROMPT_CONTRACT_REFRESH_NOT_AVAILABLE =
  "t2v_prompt_contract_refresh_not_available" as const;

export function canRestoreCanonicalTextToVideoPlan(
  brief: Record<string, unknown>,
): boolean {
  const canonical = extractCanonicalVideoScenesFromBrief(brief);
  if (canonical.length < 3) return false;
  const plan = readTextToVideoCreativePlan(brief);
  return isLegacySentenceFallbackPlan(plan, canonical.length);
}

export function canRefreshTextToVideoPromptContract(
  brief: Record<string, unknown>,
): boolean {
  const canonical = extractCanonicalVideoScenesFromBrief(brief);
  if (canonical.length < 3) return false;
  const plan = readTextToVideoCreativePlan(brief);
  if (!plan) return false;
  if (isLegacySentenceFallbackPlan(plan, canonical.length)) return false;
  if (plan.origin !== CANONICAL_VIDEO_PLAN_ORIGIN) return false;
  if (plan.scenes.some((scene) => scene.visual_rebuild_status === "rebuild_required")) {
    return false;
  }
  return (
    (plan.prompt_contract_version ?? 0) !==
    TEXT_TO_VIDEO_PROVIDER_PROMPT_CONTRACT_VERSION
  );
}

export function refreshTextToVideoPromptContract(args: {
  packageId: string;
  brief: Record<string, unknown>;
  review: CreativeReview;
  timestamp?: string;
}): Record<string, unknown> {
  if (
    args.review.scenes.some((scene) => {
      const plan = readTextToVideoCreativePlan(args.brief);
      return plan?.scenes.find((item) => item.scene_id === scene.id)
        ?.visual_rebuild_status === "rebuild_required";
    })
  ) {
    throw new Error("t2v_scene_visual_stale");
  }
  if (!canRefreshTextToVideoPromptContract(args.brief)) {
    throw new Error(T2V_PROMPT_CONTRACT_REFRESH_NOT_AVAILABLE);
  }
  const vo =
    typeof args.brief.voiceover_text === "string"
      ? args.brief.voiceover_text.trim()
      : "";
  return syncCanonicalTextToVideoRenderPlanOnSave({
    brief: args.brief,
    packageId: args.packageId,
    productionVoiceover: vo,
    review: args.review,
    memory: EMPTY_MEMORY,
    timestamp: args.timestamp,
    previousProductionVoiceover: vo,
    confirmSceneVoiceoverBinding: true,
    priorReview: args.review,
  });
}

export function restoreCanonicalTextToVideoDraft(args: {
  packageId: string;
  brief: Record<string, unknown>;
  review?: CreativeReview | null;
  timestamp?: string;
}): Record<string, unknown> {
  const visualScenes = readVisualScenesFromBrief(args.brief);
  if (visualScenes.length < 3) {
    throw new Error(T2V_CANONICAL_STORYBOARD_MISSING);
  }

  const stampedScenes = stampCanonicalIdsOnVisualScenes(visualScenes);
  const excerpts = extractCanonicalVideoScenesFromBrief({
    ...args.brief,
    visual_scenes: stampedScenes,
  });
  const visualWithExcerpts = stampedScenes.map((entry, index) => {
    if (!entry || typeof entry !== "object") return entry;
    const excerpt = excerpts[index]?.voiceover_excerpt;
    return excerpt
      ? { ...(entry as Record<string, unknown>), voiceover_excerpt: excerpt }
      : entry;
  });

  const video = args.brief.video;
  const preservedVideo =
    video && typeof video === "object" && !Array.isArray(video)
      ? { ...video }
      : video;

  let next: Record<string, unknown> = {
    ...args.brief,
    visual_scenes: visualWithExcerpts,
    video: preservedVideo,
  };

  const reviewRead = args.review
    ? { ok: true as const, value: args.review }
    : readCreativeReviewFromBrief(next);
  const review = reviewRead.ok ? reviewRead.value : null;
  const vo =
    typeof next.voiceover_text === "string" ? next.voiceover_text.trim() : "";
  const direction = voiceDirectionFromBriefOrDefault(next);
  let plan = buildTextToVideoRenderPlanFromCanonical({
    packageId: args.packageId,
    brief: next,
    review,
    voiceoverText: vo,
    hookText: typeof next.hook === "string" ? next.hook : undefined,
    voiceDirection: direction,
    existingPlan: null,
    sceneVoiceoverBinding: "needs_review",
  });

  const timestamp = args.timestamp ?? new Date().toISOString();
  const repetition = checkTextToVideoRepetition({
    plan,
    memory: EMPTY_MEMORY,
  });
  plan = applyRepetitionResultToPlan(plan, repetition, timestamp);

  const existingSound = parseTextToVideoSoundPlan(
    next[VIDEO_TEXT_TO_VIDEO_SOUND_PLAN_KEY],
  );
  const proposed = proposeAutoSoundPlanFromCreativePlan(plan);
  const remappedSound = {
    ...proposed,
    music: existingSound?.music ?? proposed.music,
    scene_sound: Object.fromEntries(
      plan.scenes.map((scene) => {
        const prior =
          existingSound?.scene_sound?.[scene.scene_id] ??
          existingSound?.scene_sound?.[String(scene.order)];
        return [scene.scene_id, prior ?? { mode: "none" as const }];
      }),
    ),
  };

  next = {
    ...next,
    [VIDEO_TEXT_TO_VIDEO_CREATIVE_PLAN_KEY]:
      serializeTextToVideoCreativePlan(plan),
    [VIDEO_TEXT_TO_VIDEO_SOUND_PLAN_KEY]: remappedSound,
    [VIDEO_CREATIVE_INTEGRITY_KEY]: serializeVideoCreativeIntegrity(
      syncVideoCreativeIntegrityFromSources({
        voiceoverText: vo,
        hookText: plan.approved_hook,
        voiceDirection: direction,
        plan,
        packageVideoMode: "text_to_video",
      }),
    ),
  };

  return next;
}

function sceneIntentIsUsable(scene: CreativeReviewScene | undefined): boolean {
  const localized = scene?.intent.localized_edit.trim() ?? "";
  return Boolean(localized) && localized !== PENDING_SCENE_INTENT;
}

/**
 * Align Creative Review scenes to the stored Claude storyboard.
 * Copies existing operator intent when IDs match. Does not call a provider.
 */
export function hydrateCreativeReviewScenesFromCanonical(args: {
  review: CreativeReview;
  brief: Record<string, unknown>;
}): CreativeReview {
  const canonical = extractCanonicalVideoScenesFromBrief(args.brief);
  if (canonical.length < 3) return args.review;

  const existingById = new Map(
    args.review.scenes.map((scene) => [scene.id, scene]),
  );
  const idsAlreadyMatch =
    args.review.scenes.length === canonical.length &&
    args.review.scenes.every((scene, index) => scene.id === canonical[index]?.id) &&
    args.review.scenes.every((scene) => sceneIntentIsUsable(scene));
  if (idsAlreadyMatch) return args.review;

  const scenes: CreativeReviewScene[] = canonical.map((scene, index) => {
    const existing = existingById.get(scene.id);
    const storedVisual = [scene.image_prompt, scene.motion_prompt]
      .map((part) => part?.trim() ?? "")
      .filter(Boolean)
      .join(" — ");
    if (!storedVisual && !(existing && sceneIntentIsUsable(existing))) {
      throw new Error("t2v_visual_is_voiceover_copy");
    }
    if (existing && sceneIntentIsUsable(existing)) {
      return { ...existing, index };
    }
    const english = (scene.image_prompt ?? storedVisual).trim();
    return {
      id: scene.id,
      index,
      director_notes: existing?.director_notes ?? "",
      intent: {
        original: storedVisual,
        localized_edit: storedVisual,
        english_preview: english,
        english_preview_outdated: false,
        presentation_type: scene.presentation_type ?? "IMAGE",
        visual_source: "generated",
        asset_id: null,
        used_as: null,
      },
    };
  });

  return {
    ...args.review,
    approved: false,
    scenes,
    status: computeCreativeReviewStatus({
      approved: false,
      voiceover: args.review.voiceover,
      scenes,
    }),
  };
}
