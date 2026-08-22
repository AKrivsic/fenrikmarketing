/**
 * Creative Core v2 — single creative authority contract for still + T2V.
 * Platform texts, social-image prompts, Runway prompts, and render status
 * are intentionally OUT of this contract (downstream steps).
 */

import {
  CREATIVE_CORE_V2_CONTRACT_VERSION,
  CREATIVE_CORE_V2_FINGERPRINT_VERSION,
  CREATIVE_CORE_V2_MEMORY_VERSION,
} from "@/lib/content-creative-core-v2/config";

export const CREATIVE_CORE_V2_SCREEN_POLICIES = [
  "no_screen",
  "generic_unreadable_ui",
  "provided_asset_overlay",
] as const;

export type CreativeCoreV2ScreenPolicy =
  (typeof CREATIVE_CORE_V2_SCREEN_POLICIES)[number];

export type CreativeMemorySourceStatus =
  | "published"
  | "approved"
  | "ready"
  | "rejected"
  | "cancelled"
  | "draft";

/** Compact structured fingerprint used for originality (not embeddings). */
export interface CreativeFingerprintV2 {
  version: typeof CREATIVE_CORE_V2_FINGERPRINT_VERSION;
  pain_key: string;
  topic_key: string;
  scenario_key: string;
  pov_key: string;
  opening_mechanism: string;
  narrative_mechanism: string;
  setting_key: string;
  visual_motif_key: string;
  prop_keys: string[];
  emotional_arc_key: string;
  conflict_key: string;
  reveal_key: string;
  payoff_key: string;
  cta_mechanism: string;
}

export interface CreativeMemoryRecordV2 {
  package_id: string;
  created_at: string | null;
  source_status: CreativeMemorySourceStatus;
  rejected: boolean;
  rejection_reason: string | null;
  pain_point: string | null;
  central_topic: string;
  scenario_family: string;
  pov: string;
  opening_mechanism: string;
  narrative_mechanism: string;
  setting: string;
  dominant_visual_motif: string;
  dominant_props: string[];
  emotional_arc: string;
  conflict: string;
  reveal_or_surprise: string;
  payoff: string;
  cta_mechanism: string;
  fingerprint: CreativeFingerprintV2;
  /** Effective protection weight after time-decay + rejection boost (0–1+). */
  protection_weight: number;
}

export interface CreativeMemoryV2 {
  version: typeof CREATIVE_CORE_V2_MEMORY_VERSION;
  now_iso: string;
  records: CreativeMemoryRecordV2[];
}

export interface CreativeCoreV2Scene {
  scene_id: string;
  order: number;
  voiceover_excerpt: string;
  visual_event: string;
  environment: string;
  subjects: string;
  action: string;
  motion_or_change: string;
  emotion: string;
  camera_intent: string;
  sound_intent: string;
  screen_policy: CreativeCoreV2ScreenPolicy;
  continuity_hints: string;
}

/**
 * Autoritativní kreativní jádro Content Package (still + T2V).
 * Nesmí obsahovat platformní texty, hashtagy, social-image prompt,
 * Runway prompt, TTS config ani render status.
 */
export interface ContentCreativeCoreV2 {
  contract_version: typeof CREATIVE_CORE_V2_CONTRACT_VERSION;
  strategy_item_id: string | null;
  creative_fingerprint: CreativeFingerprintV2;
  core_idea: string;
  hook: string;
  voiceover: string;
  main_emotion: string;
  conflict: string;
  reveal_or_surprise: string;
  visible_change: string;
  payoff: string;
  cta_intent: string;
  /** Empty for true text-only packages that need no visual scenes. */
  scenes: CreativeCoreV2Scene[];
}

export type CreativeCorePackageKind = "video" | "text_only";

export interface StrategyCandidateV2 {
  topic: string;
  angle: string;
  pain_point: string;
  funnel_stage?: string | null;
  /** Structured fingerprint claimed by the strategy candidate. */
  creative_fingerprint: CreativeFingerprintV2;
}

export type StrategyOriginalityReasonV2 =
  | "same_situation_paraphrase"
  | "same_situation_different_character"
  | "same_opening_mechanism_and_conflict"
  | "same_setting_and_props"
  | "same_conflict_and_payoff"
  | "pain_not_rotated"
  | "rejected_recent_hard_conflict"
  | "fingerprint_hard_conflict";

export interface StrategyOriginalityIssueV2 {
  reason: StrategyOriginalityReasonV2;
  detail: string;
  against_package_id?: string;
  match_score?: number;
  protection_weight?: number;
  /** match_score × protection_weight when both are present. */
  weighted_score?: number;
}

export interface StrategyOriginalityDiagnosticsV2 {
  attempts: number;
  max_attempts: number;
  issues: StrategyOriginalityIssueV2[];
  exhausted: boolean;
}

export interface StrategyOriginalityCandidateSummaryV2 {
  topic: string;
  angle: string;
  pain_point: string;
  topic_key?: string;
  angle_key?: string;
  pain_key?: string;
  situation_key?: string;
}

export interface StrategyOriginalityAttemptRecordV2 {
  attempt: number;
  candidate_summaries: StrategyOriginalityCandidateSummaryV2[];
  issues: StrategyOriginalityIssueV2[];
  repair_feedback?: string | null;
  history_record_count: number;
  history_package_ids: string[];
  hard_block_threshold: number;
}

export interface StrategyOriginalityFailureBundleV2 {
  version: "strategy-originality-failure@2";
  exhausted: true;
  attempts: StrategyOriginalityAttemptRecordV2[];
  history_telemetry: {
    history_record_count: number;
    originality_block_chars: number;
    estimated_prompt_tokens: number;
    package_ids: string[];
  };
  /** From pipeline telemetry when the strategy provider returns a request id. */
  provider_request_id?: string | null;
}

export const STRATEGY_ORIGINALITY_EXHAUSTED_V2 =
  "strategy_originality_exhausted_v2" as const;

export const CREATIVE_CORE_VALIDATION_FAILED_V2 =
  "creative_core_validation_failed_v2" as const;

export interface CreativeCoreValidationIssue {
  path: string;
  message: string;
}

export interface CreativeCoreValidationResult {
  ok: boolean;
  issues: CreativeCoreValidationIssue[];
}
