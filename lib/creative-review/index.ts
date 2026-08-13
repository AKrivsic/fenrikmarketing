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
  buildManualReviewCreativeReview,
  seedCreativeReviewFromPackage,
  type SeedCreativeReviewOptions,
  type BuildManualReviewCreativeReviewDeps,
} from "@/lib/creative-review/seed";

export {
  hasCreativeReviewKey,
  readCreativeReviewFromBrief,
  requireCreativeReviewFromBrief,
} from "@/lib/creative-review/read";

export {
  seedSceneIntentsForCreativeReview,
  seedSceneIntentsFromPackage,
  collectSceneIntentConversionSources,
  collectSceneIntentConversionSourcesFromPackage,
  type SceneIntentSeedInput,
  type SceneIntentConversionSource,
} from "@/lib/creative-review/sceneIntent/seedFromPackageScenes";

export {
  generateSceneCreativeIntents,
} from "@/lib/creative-review/sceneIntent/generateSceneIntents";

export {
  applyCreativeReviewEdits,
  type CreativeReviewPackageEdits,
  type CreativeReviewSceneEdit,
} from "@/lib/creative-review/applyEdits";

export {
  appendCreativeReviewHistory,
  cloneScenes,
  cloneVoiceover,
  computeCreativeReviewStatus,
  creativeReviewNeedsEnglishPreviewUpdate,
  invalidateVoiceoverTranslationAfterEdit,
  invalidateSceneIntentTranslationAfterEdit,
  isEnglishPreviewCurrent,
  scenesHaveCompleteIntent,
  scenesHaveCurrentEnglishPreview,
  validateCreativeReviewApproval,
} from "@/lib/creative-review/lifecycle";

export {
  commitCreativeReviewApprove,
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

export { canCancelManualReview } from "@/lib/creative-review/cancelGate";

export { normalizeLegacyCreativeReview } from "@/lib/creative-review/legacy";

export {
  translateCreativeReviewEnglishPreviews,
  translateCreativeReviewForEditor,
  type TranslateCreativeReviewTextDeps,
  type TranslateCreativeReviewForEditorDeps,
} from "@/lib/creative-review/translateVoiceover";

export {
  computeCreativeReviewDurationEstimate,
  formatDurationSeconds,
  WORDS_PER_SECOND,
} from "@/lib/creative-review/duration";

export {
  rebuildCreativePackageForVideo,
  composeRebuiltImagePrompt,
  type CreativeRebuildAnchors,
  type CreativeRebuildResult,
} from "@/lib/creative-review/rebuildCreativePackage";
