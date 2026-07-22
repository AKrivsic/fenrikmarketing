/**
 * Creative Engine v3 — AI-invented concepts (no template banks).
 */

import type { FunnelStage } from "@/lib/ai/types";
import type { ValidationIssue } from "@/lib/ai/validateAiOutput";
import type { CreativeDNA } from "@/lib/creative-candidates/creativeDNA";
import type {
  CreativeCandidate,
  CreativeCandidatePlan,
} from "@/lib/creative-candidates/types";
import type { CreativeDnaResolveResult } from "@/lib/creative-candidates/creativeDNA";

export const CREATIVE_ENGINE_V3_VERSION = "creative-engine@3" as const;
export const CREATIVE_BRIEF_VERSION = "creative-brief@1" as const;
export const CREATIVE_DIRECTION_VERSION = "creative-direction@1" as const;
export const CREATIVE_IDEATION_VERSION = "creative-ideation@2" as const;
export const CREATIVE_EVALUATION_VERSION = "creative-evaluation@1" as const;
export const CREATIVE_DIRECTION_EVAL_VERSION =
  "creative-direction-eval@1" as const;

/**
 * Adaptive bounds (not fixed concept counts).
 * Model chooses within these ranges; validators enforce soft min/max only.
 */
export const DIRECTION_GEN_MIN = 4;
export const DIRECTION_GEN_MAX = 10;
export const DIRECTION_SELECT_MIN = 2;
export const DIRECTION_SELECT_MAX = 4;
export const CONCEPTS_PER_DIRECTION_MIN = 2;
export const CONCEPTS_PER_DIRECTION_MAX = 4;
export const TOTAL_CONCEPTS_MIN = 4;
export const TOTAL_CONCEPTS_MAX = 12;

/** @deprecated Fixed-six architecture removed — kept only for import compatibility. */
export const CREATIVE_ENGINE_V3_CONCEPT_COUNT = TOTAL_CONCEPTS_MIN;

/** Structured fingerprint — rejection memory only, never inspiration. */
export interface CreativeConceptFingerprint {
  core_premise: string;
  opening_mechanism: string;
  visual_world: string;
  hero_object: string;
  metaphor: string | null;
  emotional_arc: string;
  product_mechanism: string;
  palette_atmosphere: string;
  ending_mechanism: string;
  /**
   * Abstract communication mechanism / creative direction label.
   * Used for long-run anti-repetition of *how* the message is told.
   */
  creative_direction: string;
}

/**
 * Abstract creative direction — a communication mechanism, NOT a story/hook/template.
 * Invented dynamically; never selected from a hardcoded bank.
 */
export interface CreativeDirection {
  direction_id: string;
  /** Short name of the mechanism (invented). */
  label: string;
  /** What the mechanism does abstractly (no plot, no hook, no scene). */
  mechanism: string;
  why_fits: string;
  diversity_note: string;
  anti_repetition_note: string;
}

export interface CreativeDirectionGenerationResult {
  version: typeof CREATIVE_DIRECTION_VERSION;
  directions: CreativeDirection[];
}

export interface DirectionScoreCard {
  strategy_fit: number;
  funnel_fit: number;
  originality: number;
  diversity_vs_peers: number;
  anti_repetition: number;
  concept_potential: number;
  emotional_range: number;
  production_feasibility: number;
}

export interface DirectionEvaluationEntry {
  direction_id: string;
  scores: DirectionScoreCard;
  vetoes: string[];
  critic_notes: string;
}

export interface CreativeDirectionEvaluationResult {
  version: typeof CREATIVE_DIRECTION_EVAL_VERSION;
  evaluations: DirectionEvaluationEntry[];
  ranking: string[];
  /** Adaptive 2–4 strongest diverse directions. */
  selected_direction_ids: string[];
  selection_reason: string;
  source: "critic" | "deterministic_fallback";
}

export interface CreativeBrief {
  version: typeof CREATIVE_BRIEF_VERSION;
  project: {
    product_is: string[];
    product_is_not: string[];
    pain_points: string[];
    strengths: string[];
    audience: string | null;
    voice_notes: string | null;
  };
  strategy: {
    topic: string;
    angle: string | null;
    funnel_stage: FunnelStage;
    platform: string;
    format: string;
    cta_hint: string | null;
  };
  run: {
    production_run_id: string | null;
    package_index: number | null;
    package_count: number | null;
    angle_lens: string | null;
    pain_point_focus: string | null;
    sibling_angles: string[];
  };
  assets: {
    summary: string;
    ppd_constraints: {
      presentation_class: string | null;
      reveal_ceiling: string | null;
      authentic_asset_available: boolean;
    };
  };
  memory: {
    recent_hooks: string[];
    recent_topics: string[];
    recent_ctas: string[];
    recent_fingerprints: CreativeConceptFingerprint[];
    /** Recent creative-direction mechanisms (rejection only). */
    recent_directions: string[];
    forbidden_atmospheres: string[];
  };
  rules: {
    must_stop_scroll_in_first_2s: true;
    forbid_generic_b2b: true;
    forbid_prewritten_banks: true;
    visual_variety_required: true;
  };
}

export interface InventedAtmosphere {
  time_of_day: string;
  palette_intent: string;
  lighting_intent: string;
}

export interface InventedCreativeConcept {
  concept_id: string;
  direction_id: string;
  direction_label: string;
  title: string;
  central_idea: string;
  opening_two_seconds: string;
  hook_line: string;
  story_progression: string;
  visual_world: string;
  emotional_mechanism: string;
  emotional_tone: string;
  pacing: string;
  viewpoint: string;
  characters_or_hero_objects: string[];
  product_role: string;
  ending_payoff: string;
  why_stops_scroll: string;
  funnel_fit_note: string;
  production_risks: string[];
  atmosphere: InventedAtmosphere;
  fingerprint: CreativeConceptFingerprint;
  creative_dna: CreativeDNA;
}

export interface CreativeIdeationResult {
  version: typeof CREATIVE_IDEATION_VERSION;
  concepts: InventedCreativeConcept[];
}

export interface ConceptScoreCard {
  stop_scroll: number;
  originality: number;
  memorability: number;
  strategy_fit: number;
  funnel_fit: number;
  product_relevance: number;
  natural_product_integration: number;
  narrative_coherence: number;
  visual_distinctness: number;
  emotional_strength: number;
  production_feasibility: number;
  anti_repetition: number;
  atmosphere_freshness: number;
}

export interface ConceptEvaluationEntry {
  concept_id: string;
  scores: ConceptScoreCard;
  vetoes: string[];
  critic_notes: string;
}

export interface ConceptEvaluationResult {
  version: typeof CREATIVE_EVALUATION_VERSION;
  evaluations: ConceptEvaluationEntry[];
  ranking: string[];
  winner_id: string;
  winner_reason: string;
  source: "critic" | "deterministic_fallback";
}

export interface ConceptVeto {
  concept_id: string;
  reasons: string[];
}

/** One rejected direction from a memory-filter pass (no raw prompts). */
export interface DirectionMemoryFilterRejection {
  direction_id: string;
  reasons: string[];
  matched_memory_item: string | null;
  shared_tokens: string[];
  similarity: number | null;
  collision_kind:
    | "label_exact"
    | "label_containment"
    | "mechanism_similarity"
    | null;
}

/** Telemetry for one filterDirectionsAgainstMemory invocation. */
export interface DirectionMemoryFilterPassTelemetry {
  pass: number;
  generated_count: number;
  survivor_count: number;
  rejected_count: number;
  rejected: DirectionMemoryFilterRejection[];
  fallback_used: boolean;
}

export interface CreativeEngineV3Telemetry {
  version: typeof CREATIVE_ENGINE_V3_VERSION;
  brief_digest: {
    topic: string;
    funnel_stage: FunnelStage;
    package_index: number | null;
    fingerprint_memory_count: number;
    hook_memory_count: number;
  };
  direction_attempts: number;
  direction_eval_attempts: number;
  ideation_attempts: number;
  critic_attempts: number;
  dna_repair_attempts: number;
  directions_generated: CreativeDirection[];
  directions_selected: CreativeDirection[];
  direction_evaluation: CreativeDirectionEvaluationResult | null;
  /** Per-pass memory filter stats (anti-repetition only; not a quality gate). */
  direction_memory_filter_passes: DirectionMemoryFilterPassTelemetry[];
  /** True when survivors===0 after re-filter and original directions were forwarded to eval. */
  memory_filter_fallback_all_rejected: boolean;
  concepts_generated: InventedCreativeConcept[];
  rejected: ConceptVeto[];
  evaluation: ConceptEvaluationResult | null;
  winner_concept_id: string | null;
  fingerprint: CreativeConceptFingerprint | null;
  models: {
    directions: string;
    ideation: string;
    critic: string;
    dna_repair: string | null;
  };
  errors: string[];
}

export type CreativeEngineV3PlanSuccess = {
  ok: true;
  plan: CreativeCandidatePlan;
  selectedCandidate: CreativeCandidate;
  telemetry: CreativeEngineV3Telemetry;
  promptBlock: string;
  dnaPromptBlock: string;
  persistenceFields: Record<string, unknown>;
  dnaResolve: CreativeDnaResolveResult | null;
};

export type CreativeEngineV3PlanFailure = {
  ok: false;
  error: "generation_failed";
  validationErrors: ValidationIssue[];
  attempts: number;
  telemetry: CreativeEngineV3Telemetry;
  persistenceFields: Record<string, unknown>;
};

export type CreativeEngineV3PlanResult =
  | CreativeEngineV3PlanSuccess
  | CreativeEngineV3PlanFailure;
