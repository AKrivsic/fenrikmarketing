import type { CreativeDivergencePlan } from "@/lib/creative-candidates/divergence/types";

export const CREATIVE_CANDIDATE_VERSION = "creative-candidates@2" as const;

export const CREATIVE_CONCEPT_FAMILIES = [
  "human_conflict",
  "absurd_understandable",
  "visual_exaggeration",
  "consequence_first",
  "role_reversal",
  "social_observation",
  "unexpected_comparison",
  "direct_product_world",
] as const;

export type CreativeConceptFamily = (typeof CREATIVE_CONCEPT_FAMILIES)[number];

export interface CreativeCandidate {
  candidateId: string;
  family: CreativeConceptFamily;
  coreIdea: string;
  emotionalReaction: string;
  hookLine: string;
  openingSituation: string;
  visualPromise: string;
  storyProgression: string;
  productConnection: string;
  ending: string;
  expectedViewerQuestion: string;
  familiarityRisk: "low" | "medium" | "high";
  memorabilityReason: string;
}

export interface CreativeCandidateScores {
  stopPower: number;
  immediateComprehension: number;
  memorability: number;
  emotionalCharge: number;
  productRelevance: number;
  visualSpecificity: number;
  storyPotential: number;
  originality: number;
  AI_Generic_Risk: number;
  productionFeasibility: number;
}

export interface ScoredCreativeCandidate {
  candidate: CreativeCandidate;
  scores: CreativeCandidateScores;
  weightedTotal: number;
  rejected: boolean;
  rejectReasons: string[];
}

export interface ComparativeJudgeResult {
  mostLikelyToStopScrolling: string;
  leastInterchangeable: string;
  clearestMentalImage: string;
  mostMemorableInOneHour: string;
  bestProductTopicFit: string;
  winnerId: string;
  winnerReason: string;
}

export interface ConceptFidelityResult {
  passed: boolean;
  openingSituationVisibleInScene1: boolean;
  hookPreservedInFirstSpoken: boolean;
  coreIdeaRecognizable: boolean;
  productOrTopicImplied: boolean;
  collapsedToGenericOffice: boolean;
  voiceoverEssayCadence: boolean;
  failureReasons: string[];
}

export interface CreativeCandidatePlan {
  version: typeof CREATIVE_CANDIDATE_VERSION;
  creativeDivergence: CreativeDivergencePlan;
  generatedCandidates: CreativeCandidate[];
  candidateScores: ScoredCreativeCandidate[];
  rejectedCandidates: Array<{ candidateId: string; reasons: string[] }>;
  selectedCandidate: CreativeCandidate;
  comparativeJudge: ComparativeJudgeResult;
  finalScriptFidelity: ConceptFidelityResult | null;
  finalStoryboardFidelity: ConceptFidelityResult | null;
  regenerationReason: string | null;
}
