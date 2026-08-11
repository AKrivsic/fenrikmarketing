export type {
  CreativeReview,
  CreativeReviewActor,
  CreativeReviewActorType,
  CreativeReviewHistoryEntry,
  CreativeReviewHistoryEvent,
  CreativeReviewScene,
  CreativeReviewStatus,
  CreativeReviewVoiceover,
  SceneCreativeIntent,
  SceneIntentVisualSource,
} from "@/lib/creative-review/types";

export {
  CREATIVE_REVIEW_ACTOR_TYPES,
  CREATIVE_REVIEW_HISTORY_EVENTS,
  CREATIVE_REVIEW_STATUSES,
  CREATIVE_REVIEW_SYSTEM_ACTOR,
  SCENE_INTENT_VISUAL_SOURCES,
} from "@/lib/creative-review/types";

export {
  assertCreativeReview,
  creativeReviewValidator,
  parseCreativeReview,
} from "@/lib/creative-review/validate";

export {
  seedCreativeReviewFromPackage,
  type SeedCreativeReviewOptions,
} from "@/lib/creative-review/seed";

export {
  hasCreativeReviewKey,
  readCreativeReviewFromBrief,
  requireCreativeReviewFromBrief,
} from "@/lib/creative-review/read";

export {
  seedSceneIntentsForCreativeReview,
  seedSceneIntentsFromPackage,
  type SceneIntentSeedInput,
} from "@/lib/creative-review/sceneIntent/seedFromPackageScenes";

export {
  applyCreativeReviewEdits,
  type CreativeReviewPackageEdits,
  type CreativeReviewSceneEdit,
} from "@/lib/creative-review/applyEdits";

export {
  appendCreativeReviewHistory,
  cloneHistoryEntry,
  cloneScenes,
  cloneVoiceover,
  computeCreativeReviewStatus,
  invalidateTranslationAfterEdit,
  scenesHaveCompleteIntent,
  validateCreativeReviewApproval,
} from "@/lib/creative-review/lifecycle";

export {
  commitCreativeReviewApprove,
  commitCreativeReviewConfirmTranslation,
  commitCreativeReviewSave,
  commitCreativeReviewTranslate,
  commitCreativeReviewUnapprove,
  type CreativeReviewMutationResult,
} from "@/lib/creative-review/mutations";

export {
  computeCreativeReviewRunProgress,
  canContinueCreativeReviewGeneration,
  type CreativeReviewRunProgress,
} from "@/lib/creative-review/progress";

export { normalizeLegacyCreativeReview } from "@/lib/creative-review/legacy";

export {
  translateVoiceoverToEnglish,
  type TranslateVoiceoverToEnglishDeps,
  type TranslateVoiceoverToEnglishResult,
} from "@/lib/creative-review/translateVoiceover";

export {
  rebuildCreativePackageForVideo,
  composeRebuiltImagePrompt,
  type CreativeRebuildAnchors,
  type CreativeRebuildResult,
} from "@/lib/creative-review/rebuildCreativePackage";
