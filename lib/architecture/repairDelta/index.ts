export {
  REPAIR_DELTA_VERSION,
  DEFAULT_REPAIR_PRESERVE,
  type RepairValidatorId,
  type RepairSeverity,
  type PreserveRule,
  type RepairPatchTarget,
  type RepairDelta,
  type RepairValidationResults,
  type RepairContext,
} from "@/lib/architecture/repairDelta/types";

export {
  buildFidelityRepairDelta,
  buildStoryIntegrityRepairDelta,
  buildProductDemonstrationRepairDelta,
} from "@/lib/architecture/repairDelta/buildRepairDelta";

export { buildRepairDeltaPrompt } from "@/lib/architecture/repairDelta/buildRepairPrompt";

export {
  mergeRepairedPackage,
  isFieldPreservedByMerge,
} from "@/lib/architecture/repairDelta/mergeRepairPatch";

export {
  repairDeltaToLegacyAppendix,
  buildLegacyRepairPromptViaPresentation,
} from "@/lib/architecture/repairDelta/legacyAdapter";

export {
  renderPreserveBlock,
  renderDeltaHeader,
  renderSceneRepair,
  renderVoiceRepair,
  renderCTARepair,
  renderAssetRepair,
  renderPlatformRepair,
  renderPriorPackageBlock,
  renderRepairTask,
  selectRepairRendererIds,
} from "@/lib/architecture/repairDelta/renderers";
