export {
  CREATIVE_DIVERGENCE_VERSION,
  type RawVisualSituation,
  type RawSituationCluster,
  type CreativeDivergencePlan,
} from "@/lib/creative-candidates/divergence/types";
export { rejectRawSituation } from "@/lib/creative-candidates/divergence/rawSituationFilter";
export { generateRawVisualSituations } from "@/lib/creative-candidates/divergence/generateRawSituations";
export { clusterRawSituations, pickTopSurvivors } from "@/lib/creative-candidates/divergence/clusterRawSituations";
export { runCreativeDivergence } from "@/lib/creative-candidates/divergence/runCreativeDivergence";
export {
  jaccardSimilarity,
  tokenSet,
  scoreStopScroll,
} from "@/lib/creative-candidates/divergence/scoreRawSituation";
export {
  situationFingerprint,
  areNearDuplicateSituations,
} from "@/lib/creative-candidates/divergence/situationFingerprint";
