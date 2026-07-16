export { ATTENTION_VERSION, ATTENTION_MECHANISMS } from "@/lib/attention/types";
export type {
  AttentionMechanism,
  AttentionPlan,
  OpeningContract,
  SfxPlan,
  DeliveryArc,
} from "@/lib/attention/types";
export { ATTENTION_CATALOG, attentionSpec } from "@/lib/attention/catalog";
export {
  resolveAttentionMechanism,
  buildAttentionSeed,
} from "@/lib/attention/resolveAttention";
export { runOriginalityPass } from "@/lib/attention/originalityPass";
export { planAttentionForPackage } from "@/lib/attention/planForPackage";
export {
  buildAttentionPromptBlock,
  attentionFieldsForPersistence,
  attentionFieldsForVideoJob,
  ATTENTION_PROMPT_HEADER,
  readAttentionFromBrief,
  readAttentionPlanFromPackagePresentation,
} from "@/lib/attention/promptBlocks";
export { alignHookWithFirstSpoken } from "@/lib/attention/alignHookVoiceover";
export {
  matchesOfficeCliche,
  matchesGenericSetupOpener,
  isNotebookVsPaperDilemma,
  isGenericOfficeHumor,
} from "@/lib/attention/cliches";
