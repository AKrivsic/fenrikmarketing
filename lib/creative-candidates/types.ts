import type {
  CreativeDNA,
  CreativeDnaSource,
} from "@/lib/creative-candidates/creativeDNA";
import type { StoryIntegrityResult } from "@/lib/creative-candidates/storyIntegrity";
import type { ProductDemonstrationIntegrityResult } from "@/lib/creative-candidates/productDemonstrationIntegrity";

/**
 * Creative candidate plan shape shared by Creative Engine v3 and downstream
 * gates (Narrative Beats, fidelity, Story Integrity, Product Demo Integrity).
 */
export const CREATIVE_CANDIDATE_VERSION = "creative-candidates@3.0" as const;

export type { CreativeDNA, CreativeDnaSource };

/** Historical template families may still appear on persisted packages. */
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

/** Live production family is always `"invented"` (Creative Engine v3). */
export type CreativeCandidateFamily = CreativeConceptFamily | "invented";

export interface CreativeCandidate {
  candidateId: string;
  /** Always `"invented"` for new packages; historical rows may use template families. */
  family: CreativeCandidateFamily;
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
  /** Structured fingerprint for anti-repetition (v3). Rejection memory only. */
  conceptFingerprint?: import("@/lib/creative-engine-v3/types").CreativeConceptFingerprint;
  /**
   * Canonical immutable creative decisions. Optional for backward compatibility
   * with historical packages that predate Creative DNA.
   */
  creativeDNA?: CreativeDNA;
  /**
   * How creativeDNA was obtained for this candidate.
   * `"model"` = authored with the concept in Creative Engine v3.
   * `"deterministic_fallback"` = deriveCreativeDNA after missing/invalid authored DNA.
   * `"missing"` = historical / unresolved.
   */
  creativeDnaSource?: CreativeDnaSource;
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

export interface CommercialCandidateScores {
  renderability: number;
  firstFrameClarity: number;
  productDemonstrability: number;
  humanProblemVisibility: number;
  narrativeSurvivability: number;
  commercialSurvivability: number;
}

export interface ScoredCreativeCandidate {
  candidate: CreativeCandidate;
  scores: CreativeCandidateScores;
  weightedTotal: number;
  commercialScores?: CommercialCandidateScores;
  commercialTotal?: number;
  finalSelectionScore?: number;
  rejected: boolean;
  rejectReasons: string[];
}

export interface SelectionLoserPenalty {
  candidateId: string;
  family: string;
  creativeScore: number;
  commercialScore: number;
  finalSelectionScore: number;
  primaryPenalties: string[];
  lostBy: number;
}

export interface SelectionDiagnostics {
  version: "commercial-success@1";
  winnerId: string;
  creativeScore: number;
  commercialScore: number;
  finalSelectionScore: number;
  commercialDimensions: CommercialCandidateScores;
  commercialDimensionContributions: Record<
    keyof CommercialCandidateScores,
    number
  >;
  creativeScoresSnapshot: CreativeCandidateScores;
  whyWon: string;
  losersPenalized: SelectionLoserPenalty[];
  overturnedCreativeLeader: boolean;
}

export interface ComparativeJudgeResult {
  mostLikelyToStopScrolling: string;
  leastInterchangeable: string;
  clearestMentalImage: string;
  mostMemorableInOneHour: string;
  bestProductTopicFit: string;
  mostRenderable?: string;
  clearestFirstFrame?: string;
  bestProductDemonstrability?: string;
  strongestHumanProblem?: string;
  bestCommercialSurvivability?: string;
  winnerId: string;
  winnerReason: string;
}

export interface FidelityRuleDiagnostic {
  rule: string;
  passed: boolean;
  candidateValue: string;
  generatedValue: string;
  matchedAliases: string[];
  reason: string | null;
}

export interface ConceptFidelityResult {
  passed: boolean;
  openingSituationVisibleInScene1: boolean;
  openingEventPreservedInScene1: boolean;
  stopScrollIdeaPreserved: boolean;
  hookPreservedInFirstSpoken: boolean;
  coreIdeaRecognizable: boolean;
  productOrTopicImplied: boolean;
  collapsedToGenericOffice: boolean;
  voiceoverEssayCadence: boolean;
  salesPitchOpening: boolean;
  failureReasons: string[];
  diagnostics?: FidelityRuleDiagnostic[];
}

export interface CreativeCandidatePlan {
  version: typeof CREATIVE_CANDIDATE_VERSION;
  generatedCandidates: CreativeCandidate[];
  candidateScores: ScoredCreativeCandidate[];
  rejectedCandidates: Array<{ candidateId: string; reasons: string[] }>;
  selectedCandidate: CreativeCandidate;
  comparativeJudge: ComparativeJudgeResult;
  selectionDiagnostics?: SelectionDiagnostics | null;
  finalScriptFidelity: ConceptFidelityResult | null;
  finalStoryboardFidelity: ConceptFidelityResult | null;
  storyIntegrity?: StoryIntegrityResult | null;
  productDemonstrationIntegrity?: ProductDemonstrationIntegrityResult | null;
  regenerationReason: string | null;
}
