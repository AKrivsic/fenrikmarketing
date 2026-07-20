import type {
  CreativeDNA,
  CreativeDnaSource,
} from "@/lib/creative-candidates/creativeDNA";
import type { CreativeDivergencePlan } from "@/lib/creative-candidates/divergence/types";
import type { StoryIntegrityResult } from "@/lib/creative-candidates/storyIntegrity";
import type { ProductDemonstrationIntegrityResult } from "@/lib/creative-candidates/productDemonstrationIntegrity";

/**
 * Selection v3: Creative Score + Commercial Success Score → Final Selection Score.
 * Candidate generation / divergence unchanged; only winner policy + diagnostics.
 */
export const CREATIVE_CANDIDATE_VERSION = "creative-candidates@3.0" as const;

export type { CreativeDNA, CreativeDnaSource };

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
  /**
   * Canonical immutable creative decisions. Optional for backward compatibility
   * with historical packages that predate Creative DNA.
   * For newly generated candidates, authored in the same Divergence pass.
   */
  creativeDNA?: CreativeDNA;
  /**
   * How creativeDNA was obtained for this candidate.
   * `"model"` = authored with the candidate in Divergence generation.
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

/** Deterministic Commercial Success dimensions (Selection v3). */
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
  /** Creative weighted total (legacy name; still the creative score). */
  weightedTotal: number;
  /** Commercial Success weighted total. Optional for pre-v3 persisted rows. */
  commercialScores?: CommercialCandidateScores;
  commercialTotal?: number;
  /** creative weightedTotal + commercialTotal. */
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

/** Developer-facing explainability for the winning selection. */
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
  /** True when a higher creative-score candidate lost on commercial grounds. */
  overturnedCreativeLeader: boolean;
}

export interface ComparativeJudgeResult {
  mostLikelyToStopScrolling: string;
  leastInterchangeable: string;
  clearestMentalImage: string;
  mostMemorableInOneHour: string;
  bestProductTopicFit: string;
  /** Commercial comparative badges (v3). */
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
  /** Opening event/action meaning survives in scene 1 (not only token overlap). */
  openingEventPreservedInScene1: boolean;
  /** Hook / stop-scroll idea survives in first spoken + opening visual. */
  stopScrollIdeaPreserved: boolean;
  hookPreservedInFirstSpoken: boolean;
  coreIdeaRecognizable: boolean;
  productOrTopicImplied: boolean;
  collapsedToGenericOffice: boolean;
  voiceoverEssayCadence: boolean;
  /** First spoken is a sales/CTA pitch (product presence alone is OK). */
  salesPitchOpening: boolean;
  failureReasons: string[];
  /** Structured per-rule evidence for telemetry / debugging (optional). */
  diagnostics?: FidelityRuleDiagnostic[];
}

export interface CreativeCandidatePlan {
  version: typeof CREATIVE_CANDIDATE_VERSION;
  creativeDivergence: CreativeDivergencePlan;
  generatedCandidates: CreativeCandidate[];
  candidateScores: ScoredCreativeCandidate[];
  rejectedCandidates: Array<{ candidateId: string; reasons: string[] }>;
  selectedCandidate: CreativeCandidate;
  comparativeJudge: ComparativeJudgeResult;
  /** Present on v3+ plans; explains Final Selection Score. */
  selectionDiagnostics?: SelectionDiagnostics | null;
  finalScriptFidelity: ConceptFidelityResult | null;
  finalStoryboardFidelity: ConceptFidelityResult | null;
  /** Hard Story Integrity gate (selected world must survive every beat). */
  storyIntegrity?: StoryIntegrityResult | null;
  /** Sprint 4C — visual product demonstration + PRIMARY_ACTOR continuity. */
  productDemonstrationIntegrity?: ProductDemonstrationIntegrityResult | null;
  regenerationReason: string | null;
}
