/**
 * Phase 6G — Production runtime model.
 */

export {
  PRODUCTION_RUNTIME_VERSION,
  PACKAGE_GENERATION_LEASE_SECONDS,
  PACKAGE_GENERATION_HEARTBEAT_INTERVAL_MS,
  PACKAGE_GENERATION_RENEW_MAX_FAILURES,
  VIDEO_JOB_LEASE_SECONDS,
  VIDEO_JOB_HEARTBEAT_INTERVAL_MS,
  VIDEO_JOB_LEGACY_STALE_MINUTES,
  PRODUCTION_RUN_STUCK_WITH_PACKAGES_MS,
  PRODUCTION_RUN_RECOVERY_BATCH_SIZE,
  PRODUCTION_RUN_RECOVERY_MAX_MS,
  STUCK_VIDEO_JOB_MESSAGE,
  TERMINAL_OPEN_ITEM_BACKFILL_MESSAGE,
} from "@/lib/production-runtime/constants";

export {
  claimPackageGeneration,
  releasePackageGenerationClaim,
  renewPackageGenerationClaim,
  newOwnerToken,
  type PackageGenerationClaimResult,
} from "@/lib/production-runtime/packageGenerationClaim";

export {
  startPackageGenerationHeartbeat,
  assertPackageClaimHeartbeatConfig,
  PackageGenerationClaimLostError,
  type PackageClaimHeartbeatHandle,
} from "@/lib/production-runtime/packageClaimHeartbeat";

export {
  claimVideoJobForDispatch,
  renewVideoJobLease,
  persistVideoJobArtifacts,
  promoteVideoJobIfArtifactsReady,
  outputHasDurableMp4,
  type VideoJobClaimResult,
} from "@/lib/production-runtime/videoJobLease";

export {
  shouldSendFailedCallbackAfterUpload,
  buildDurableArtifactOutput,
  type DurableArtifactFields,
} from "@/lib/production-runtime/uploadDurability";

export {
  shouldHardFailFidelityAfterRepair,
  shouldHardFailStoryIntegrityAfterRepair,
  classifyStoryIntegrityForHardFail,
  STORY_INTEGRITY_SOFT_AFTER_REPAIR_CODES,
} from "@/lib/production-runtime/repairPolicy";

export {
  assertNoActivePackageRender,
  findActivePackageVideoJobIds,
} from "@/lib/production-runtime/activeRenderGuard";

export {
  evaluateRunWatchdog,
  type RunWatchdogDecision,
  type RunWatchdogInput,
} from "@/lib/production-runtime/runWatchdog";

export {
  collectContentItemIdsForRunCancel,
  cancelTranslationJobsForPackages,
  mergeProductionRunIdIntoVariantMetadata,
} from "@/lib/production-runtime/cancelPropagation";

export {
  runScheduledProductionRecovery,
  claimProductionRecoveryLease,
  releaseProductionRecoveryLease,
  type RunRecoverySummary,
} from "@/lib/production-runtime/runRecovery";

export {
  settleProductionRunTerminal,
  recomputeProductionRunCounters,
  computeCountersFromItems,
  type SettleTerminalResult,
} from "@/lib/production-runtime/runSettlement";

export {
  persistPackageGenerationFailureTelemetry,
  persistActiveCollectorFailureTelemetry,
  lookupProductionRunItemId,
  type FailureTelemetrySnapshot,
} from "@/lib/production-runtime/failureTelemetry";

export {
  decidePackageCallbackTransition,
  type PackageCallbackDecision,
  type PackageCallbackOutcome,
} from "@/lib/production-runtime/packageCallbackCas";

export { runtimeLog, type RuntimeLogEvent, type RuntimeLogFields } from "@/lib/production-runtime/runtimeLog";

export { getWorkerInstanceId } from "@/lib/production-runtime/workerInstanceId";
