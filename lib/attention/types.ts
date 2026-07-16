/** Attention & Engagement v1 — types. */

export const ATTENTION_VERSION = "attention@1" as const;

export const ATTENTION_MECHANISMS = [
  "DILEMMA",
  "HUMOR",
  "IRONY",
  "ABSURD_ASSOCIATION",
  "VISUAL_METAPHOR",
  "ROLE_REVERSAL",
  "PROVOCATIVE_OPINION",
  "CURIOSITY_GAP",
  "FRUSTRATION",
  "RELIEF",
  "WISH_FULFILMENT",
  "UNEXPECTED_COMPARISON",
  "HUMAN_CONFLICT",
  "SURPRISE",
  "SATISFACTION",
  "CONTRAST",
] as const;

export type AttentionMechanism = (typeof ATTENTION_MECHANISMS)[number];

export type AttentionSource =
  | "deterministic_v1"
  | "legacy_absent"
  | "regeneration";

export type OpeningEmotionalEffect =
  | "curiosity"
  | "dilemma"
  | "surprise"
  | "humor"
  | "tension"
  | "recognition"
  | "strong_opinion"
  | "unexpected_association"
  | "relief"
  | "frustration"
  | "aspiration";

export type OpeningStructure =
  | "immediate_reaction"
  | "split_choice"
  | "frozen_consequence"
  | "confession"
  | "bold_claim"
  | "visual_first_question"
  | "held_then_punch"
  | "whispered_intimate"
  | "sudden_reveal";

export type OpeningDeliveryStyle =
  | "curious"
  | "urgent"
  | "whispered"
  | "deadpan"
  | "playful"
  | "frustrated"
  | "confident"
  | "warm";

export type SfxCategory =
  | "impact"
  | "click"
  | "notification"
  | "swipe"
  | "paper_rip"
  | "glass_clink"
  | "typing_stop"
  | "error_tone"
  | "whoosh"
  | "comedic_pop"
  | "silence_drop"
  | "door_close"
  | "cash_accent";

export interface OpeningConceptCandidate {
  id: "obvious" | "less_obvious" | "unexpected";
  label: string;
  visual_concept: string;
  narrative_seed: string;
  emotional_effect: OpeningEmotionalEffect;
  scores: {
    recognisability: number;
    emotional_reaction: number;
    novelty: number;
    relevance: number;
    visual_clarity: number;
    what_happens_next: number;
  };
  rejected: boolean;
  reject_reasons: string[];
}

export interface OriginalityPass {
  candidates: OpeningConceptCandidate[];
  selected_candidate_id: OpeningConceptCandidate["id"];
  selected_visual_concept: string;
  selected_narrative_seed: string;
  selected_emotional_effect: OpeningEmotionalEffect;
  reject_summary: string[];
}

export interface OpeningContract {
  first_spoken_guidance: string;
  first_subtitle_guidance: string;
  first_visual_guidance: string;
  first_motion_intent: "ATTENTION" | "HOLD" | "REVEAL" | "EMPHASIS";
  opening_delivery: OpeningDeliveryStyle;
  opening_structure: OpeningStructure;
  emotional_effect: OpeningEmotionalEffect;
  land_within_seconds: [number, number];
  align_hook_with_first_spoken: true;
}

export interface DeliveryArcPhase {
  phase: "opening" | "body" | "emphasis" | "pause_before_reveal" | "payoff" | "close";
  delivery: string;
}

export interface DeliveryArc {
  version: "delivery-arc@1";
  phases: DeliveryArcPhase[];
  tts_instruction_fragment: string;
  reasons: string[];
}

export interface SfxPlan {
  sfx_selected: boolean;
  sfx_category: SfxCategory | null;
  sfx_timing_ms: number | null;
  sfx_reason: string | null;
  sfx_source: "none" | "programmatic_v1" | "omitted_no_fit";
  /** Relative gain vs voice (0–1). Always keep well below voice. */
  sfx_gain: number;
  render_supported: boolean;
}

export interface AttentionPlan {
  version: typeof ATTENTION_VERSION;
  attention_mechanism: AttentionMechanism;
  attention_source: AttentionSource;
  attention_reasons: string[];
  originality: OriginalityPass;
  opening: OpeningContract;
  delivery_arc: DeliveryArc;
  sfx: SfxPlan;
  opening_visual_motif: string;
  opening_emotional_effect: OpeningEmotionalEffect;
  opening_structure: OpeningStructure;
}
