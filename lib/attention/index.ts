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
  buildAttentionPromptBlock,
  attentionFieldsForPersistence,
  attentionFieldsForVideoJob,
  ATTENTION_PROMPT_HEADER,
  ATTENTION_MECHANISM_HEADER_LEGACY,
  readAttentionFromBrief,
  readAttentionPlanFromPackagePresentation,
} from "@/lib/attention/promptBlocks";
export {
  matchesOfficeCliche,
  matchesGenericSetupOpener,
  isNotebookVsPaperDilemma,
  isGenericOfficeHumor,
} from "@/lib/attention/cliches";
