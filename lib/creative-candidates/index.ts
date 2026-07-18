export { CREATIVE_CANDIDATE_VERSION } from "@/lib/creative-candidates/types";
export type {
  CreativeCandidate,
  CreativeCandidatePlan,
  ConceptFidelityResult,
  CreativeDNA,
  CreativeDnaSource,
  CommercialCandidateScores,
  SelectionDiagnostics,
  SelectionLoserPenalty,
} from "@/lib/creative-candidates/types";
export {
  planCreativeCandidatesForPackage,
  attachFidelityToPlan,
  attachStoryIntegrityToPlan,
  attachProductDemonstrationIntegrityToPlan,
  buildCreativeDnaDiagnostics,
  ensureCandidateCreativeDNA,
} from "@/lib/creative-candidates/planForPackage";
export {
  checkConceptFidelity,
  fidelityRepairAppendix,
  openingSituationFaithfulToScene1,
  stripNoTextImpossibleClauses,
} from "@/lib/creative-candidates/fidelityCheck";
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
  generateCreativeCandidates,
  generateCreativeCandidatesWithDivergence,
  generateCreativeCandidatesFromFamilies,
  extractTopicConcreteSignals,
} from "@/lib/creative-candidates/generateCandidates";
export {
  runCreativeDivergence,
  generateRawVisualSituations,
  clusterRawSituations,
  rejectRawSituation,
  CREATIVE_DIVERGENCE_VERSION,
  situationFingerprint,
  areNearDuplicateSituations,
} from "@/lib/creative-candidates/divergence";
export {
  applyGenericityRejections,
  scoreCreativeCandidate,
  weightedTotal,
} from "@/lib/creative-candidates/scoreCandidates";
export { runComparativeJudge, selectWinner } from "@/lib/creative-candidates/comparativeJudge";
export {
  CREATIVE_FAMILY_COMMERCIAL_METADATA,
  familyCommercialMetadata,
} from "@/lib/creative-candidates/familyMetadata";
export type { CreativeFamilyCommercialMetadata } from "@/lib/creative-candidates/familyMetadata";
export {
  COMMERCIAL_SCORE_WEIGHTS,
  COMMERCIAL_SUCCESS_VERSION,
  scoreCommercialSuccess,
  commercialTotal,
  finalSelectionScore,
  attachCommercialScores,
  buildSelectionDiagnostics,
  commercialDimensionContributions,
} from "@/lib/creative-candidates/commercialScore";
export {
  STORY_INTEGRITY_VERSION,
  STORY_INTEGRITY_PROMPT_HEADER,
  deriveAllowedWorldTokens,
  detectProductDemonstration,
  validateStoryIntegrity,
  buildStoryIntegrityPromptBlock,
  storyIntegrityRepairAppendix,
  storyIntegrityValidationIssues,
} from "@/lib/creative-candidates/storyIntegrity";
export type {
  StoryIntegrityResult,
  StoryIntegrityViolation,
  StoryIntegrityViolationCode,
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
