/**
 * Creative Core v2 — public surface (Step 1 foundation + Step 2 wiring helpers).
 */

export {
  CREATIVE_CORE_V2_BRIEF_KEY,
  CREATIVE_CORE_V2_CONTRACT_VERSION,
  CREATIVE_CORE_V2_FINGERPRINT_VERSION,
  CREATIVE_CORE_V2_MEMORY_CONFIG,
  CREATIVE_CORE_V2_MEMORY_VERSION,
} from "@/lib/content-creative-core-v2/config";

export {
  packageUsesCreativeCoreV2,
  shouldGenerateWithCreativeCoreV2,
} from "@/lib/content-creative-core-v2/packageRouting";

export {
  classifyCtaMechanism,
  classifyNarrativeMechanism,
  classifyOpeningMechanism,
  classifyPovKey,
  classifySituationMechanism,
  computeCreativeFingerprint,
  emptyFingerprint,
  fingerprintFromCreativeCore,
  fingerprintFromStrategyCandidate,
  fingerprintsStructurallyEqual,
  isParaphraseText,
  keyFromText,
  normalizeCreativeText,
  significantTokens,
  tokenOverlapRatio,
} from "@/lib/content-creative-core-v2/fingerprint";

export {
  assembleCreativeMemory,
  buildCreativeMemory,
  buildMemoryRecord,
  computeProtectionWeight,
  creativeMemoryPromptBlockV2,
  isCreativeRejection,
  lastUsedPainKey,
  memoryInputFromPackageBrief,
  resolveSourceStatus,
  unusedPainPoints,
} from "@/lib/content-creative-core-v2/memory";

export {
  createStrategyCandidateWithOriginality,
  evaluateStrategyCandidateOriginality,
  executionIsMeaningfullyDifferent,
  formatStrategyOriginalityRetryAppend,
  originalityDiagnosticsForBrief,
} from "@/lib/content-creative-core-v2/strategyOriginality";

export {
  buildCreativeCoreMessages,
  createCreativeCore,
  ensureStrategyFingerprint,
  parseCreativeCoreResponse,
  applyDeterministicCreativeFingerprint,
  applySoftVoiceoverClamp,
  buildCreativeCoreFailureDiagnostics,
  buildCreativeCoreFailureLastRaw,
  fingerprintInputFieldsFromCore,
  type CreativeCoreMessages,
  type CreativeCoreRequestContext,
  type CreativeCoreFailureDiagnostics,
  type TextProviderLike,
} from "@/lib/content-creative-core-v2/createCreativeCore";

export {
  softClampVoiceoverWordCount,
  countVoiceoverWords,
} from "@/lib/content-creative-core-v2/softClampVoiceover";

export { validateCreativeCore } from "@/lib/content-creative-core-v2/validate";

export {
  redistributeVoiceoverAcrossScenes,
  voiceoverCoveredExactlyOnce,
} from "@/lib/content-creative-core-v2/redistributeVoiceover";

export {
  applyCreativeCoreSceneEdit,
  applyCreativeCoreVoiceoverEdit,
} from "@/lib/content-creative-core-v2/applyCoreEdits";

export {
  briefUsesCreativeCoreV2,
  CREATIVE_CORE_V2_LEGACY_PROJECTION_FAILED,
  CREATIVE_CORE_V2_PROVENANCE_KEY,
  projectCreativeCoreToLegacyPackage,
  readCreativeCoreV2FromBrief,
  stampCreativeCoreV2Provenance,
} from "@/lib/content-creative-core-v2/legacyProjection";

export {
  buildApprovedCreativeCoreSnapshot,
  CREATIVE_CORE_V2_APPROVED_SNAPSHOT_KEY,
  readApprovedCreativeCoreSnapshot,
} from "@/lib/content-creative-core-v2/approvedSnapshot";

export {
  autoAcceptCreativeCoreV2,
  CREATIVE_CORE_V2_AUTO_ACCEPTED_KEY,
} from "@/lib/content-creative-core-v2/autoAccept";

export {
  buildManualReviewCreativeReviewFromCore,
  seedCreativeReviewScenesFromCore,
} from "@/lib/content-creative-core-v2/seedCreativeReview";

export { runCreativeCoreV2Pipeline } from "@/lib/content-creative-core-v2/runPipeline";

export { regenerateCreativeCoreV2Concept } from "@/lib/content-creative-core-v2/regenerateCore";

export {
  CREATIVE_CORE_V2_DERIVED_OUTPUTS_KEY,
  CREATIVE_CORE_V2_DERIVED_CONTRACT_VERSION,
  PLATFORM_DEPENDENCY_FINGERPRINT_VERSION,
  PENDING_STEP_3_PLACEHOLDER_PREFIX,
} from "@/lib/content-creative-core-v2/derivedOutputsTypes";

export type {
  ContentDerivedOutputsV2,
  DerivedOperatorPhase,
  DerivedOutputsStatus,
} from "@/lib/content-creative-core-v2/derivedOutputsTypes";

export {
  computePlatformDependencyFingerprint,
  platformDependencyFieldsFromCore,
  approvedCoreSourceFingerprint,
  buildDerivedIdempotencyKey,
} from "@/lib/content-creative-core-v2/platformDependencyFingerprint";

export {
  isPendingStep3Placeholder,
  textContainsPendingPlaceholder,
  platformOutputsContainPlaceholders,
  assertNoPlaceholdersInPersistableCaptions,
} from "@/lib/content-creative-core-v2/placeholderGuard";

export {
  readDerivedOutputs,
  writeDerivedOutputs,
  emptyPendingDerivedOutputs,
  markDerivedOutputsStale,
  invalidateDerivedOutputsForPlatformDependencyChange,
  resolveDerivedOperatorPhase,
  derivedOutputsMatchCurrentDependency,
  packageHasPublishableDerivedContent,
  statusLabelForOperatorPhase,
} from "@/lib/content-creative-core-v2/derivedOutputsState";

export {
  buildDerivePlatformOutputsMessages,
  parseDerivePlatformOutputsResponse,
  derivePlatformOutputsWithProvider,
} from "@/lib/content-creative-core-v2/derivePlatformOutputs";

export {
  enqueueDerivedOutputsPending,
  runDerivePlatformOutputsForPackage,
  processNextDerivedOutputsJob,
} from "@/lib/content-creative-core-v2/runDeriveOutputs";

export { triggerCreativeCoreV2DeriveProcessor } from "@/lib/content-creative-core-v2/triggerDeriveProcessor";

export {
  applyApprovedCoreToPackageBriefForVideo,
  briefUsesApprovedCreativeCoreV2,
  projectApprovedCoreScenesToVisualScenes,
  CREATIVE_CORE_V2_VIDEO_PROJECTION_KEY,
  CREATIVE_CORE_V2_AWAITING_PAID_VIDEO_KEY,
  CREATIVE_CORE_V2_MEDIA_BLOCKED_KEY,
} from "@/lib/content-creative-core-v2/projectApprovedCoreForVideo";

export { assertCreativeCoreV2ReadyForVideoJob } from "@/lib/content-creative-core-v2/videoGates";

export {
  packageNeedsDeriveRecovery,
  packageDeriveIsComplete,
  recoverCreativeCoreV2DeriveForPackage,
  recoverPendingCreativeCoreV2DeriveJobs,
  shouldMarkDeriveStuckForOperatorRetry,
  markStuckDeriveOutputsForOperatorRetry,
  CREATIVE_CORE_V2_DERIVE_STUCK_MS,
} from "@/lib/content-creative-core-v2/recoverDerive";

export { startVideoFromApprovedCreativeCore } from "@/lib/content-creative-core-v2/startVideoFromApprovedCore";

export {
  isCreativeCoreV2TextOnlyPackage,
  isCreativeCoreV2VideoPackageComplete,
  isCreativeCoreV2TextOnlyPackageComplete,
} from "@/lib/content-creative-core-v2/completeness";

export type {
  ContentCreativeCoreV2,
  CreativeCorePackageKind,
  CreativeCoreValidationIssue,
  CreativeCoreValidationResult,
  CreativeCoreV2Scene,
  CreativeCoreV2ScreenPolicy,
  CreativeFingerprintV2,
  CreativeMemoryRecordV2,
  CreativeMemorySourceStatus,
  CreativeMemoryV2,
  StrategyCandidateV2,
  StrategyOriginalityDiagnosticsV2,
  StrategyOriginalityIssueV2,
  StrategyOriginalityReasonV2,
} from "@/lib/content-creative-core-v2/types";

export {
  CREATIVE_CORE_VALIDATION_FAILED_V2,
  CREATIVE_CORE_V2_SCREEN_POLICIES,
  STRATEGY_ORIGINALITY_EXHAUSTED_V2,
} from "@/lib/content-creative-core-v2/types";
