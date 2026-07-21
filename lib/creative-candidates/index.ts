export { CREATIVE_CANDIDATE_VERSION } from "@/lib/creative-candidates/types";
export type {
  CreativeCandidate,
  CreativeCandidatePlan,
  ConceptFidelityResult,
  FidelityRuleDiagnostic,
  CreativeDNA,
  CreativeDnaSource,
  CommercialCandidateScores,
  SelectionDiagnostics,
  SelectionLoserPenalty,
} from "@/lib/creative-candidates/types";
export {
  attachFidelityToPlan,
  attachStoryIntegrityToPlan,
  attachProductDemonstrationIntegrityToPlan,
  buildCreativeDnaDiagnostics,
  ensureCandidateCreativeDNA,
} from "@/lib/creative-candidates/planForPackage";
export {
  checkConceptFidelity,
  classifyFidelityFailuresForRepair,
  fidelityRepairAppendix,
  openingSituationFaithfulToScene1,
  stripNoTextImpossibleClauses,
  stripCosmeticOpeningPrefixes,
  stripVisualStyleBoilerplate,
  isAffirmativeGenericOfficeCollapse,
} from "@/lib/creative-candidates/fidelityCheck";
export { enforceCandidateHook } from "@/lib/creative-candidates/enforceCandidateHook";
export { validateAndRepairCandidate } from "@/lib/creative-candidates/candidateValidation";
export {
  buildCreativeCandidatePromptBlock,
  buildCreativeDnaPromptBlockFromPlan,
  creativeCandidateFieldsForPersistence,
} from "@/lib/creative-candidates/promptBlocks";
export {
  authorCreativeDNA,
  deriveCreativeDNA,
  withCreativeDNA,
  isValidCreativeDNA,
  normalizeCreativeDNA,
  resolveCandidateCreativeDNA,
  validateCandidateDnaConsistency,
  buildCreativeDnaPromptBlock,
  validateCreativeDnaAgainstPackage,
  identityEnvironmentConflictsWithDna,
  neutralizeIdentityEnvironmentForDna,
  neutralizeIdentityEnvironmentForOpening,
  CREATIVE_DNA_PROMPT_HEADER,
  CREATIVE_DNA_PROMPT_VERSION,
  CREATIVE_DNA_AUTHORING_INSTRUCTIONS,
} from "@/lib/creative-candidates/creativeDNA";
export type {
  CreativeDnaValidationResult,
  CreativeDnaDiagnostics,
  CreativeDnaViolation,
  CreativeDnaConsistencyResult,
  CreativeDnaResolveResult,
} from "@/lib/creative-candidates/creativeDNA";
export {
  extractTopicConcreteSignals,
  deriveShortIndustryCue,
} from "@/lib/creative-candidates/topicSignals";
export {
  STORY_INTEGRITY_VERSION,
  STORY_INTEGRITY_PROMPT_HEADER,
  STORY_INTEGRITY_SOFT_CODES,
  deriveAllowedWorldTokens,
  detectProductDemonstration,
  validateStoryIntegrity,
  buildStoryIntegrityPromptBlock,
  storyIntegrityRepairAppendix,
  storyIntegrityValidationIssues,
  storyIntegrityWarningIssues,
  isHardStoryIntegrityViolation,
} from "@/lib/creative-candidates/storyIntegrity";
export type {
  StoryIntegrityResult,
  StoryIntegrityViolation,
  StoryIntegrityViolationCode,
  StoryIntegrityCtaMatch,
  ProductDemonstrationCheck,
} from "@/lib/creative-candidates/storyIntegrity";
export {
  PRODUCT_DEMONSTRATION_INTEGRITY_VERSION,
  PRODUCT_DEMONSTRATION_INTEGRITY_PROMPT_HEADER,
  derivePrimaryActor,
  detectSemanticProductDemonstration,
  validateProductDemonstrationIntegrity,
  buildProductDemonstrationPromptBlock,
  productDemonstrationRepairAppendix,
  productDemonstrationValidationIssues,
} from "@/lib/creative-candidates/productDemonstrationIntegrity";
export type {
  ProductDemonstrationIntegrityResult,
  ProductDemoIntegrityViolation,
  ProductDemoIntegrityViolationCode,
  PrimaryActorSpec,
  SemanticProductDemonstrationCheck,
} from "@/lib/creative-candidates/productDemonstrationIntegrity";
