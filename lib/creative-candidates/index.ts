export { CREATIVE_CANDIDATE_VERSION } from "@/lib/creative-candidates/types";
export type {
  CreativeCandidate,
  CreativeCandidatePlan,
  ConceptFidelityResult,
  CreativeDNA,
  CreativeDnaSource,
} from "@/lib/creative-candidates/types";
export {
  planCreativeCandidatesForPackage,
  attachFidelityToPlan,
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
