/**
 * Single configuration surface for Creative Core v2 memory + originality.
 * Do not scatter magic numbers across call sites.
 */

export const CREATIVE_CORE_V2_CONTRACT_VERSION = 2 as const;

export const CREATIVE_CORE_V2_BRIEF_KEY = "content_creative_core_v2" as const;

export const CREATIVE_CORE_V2_MEMORY_VERSION =
  "content-creative-memory@2" as const;

export const CREATIVE_CORE_V2_FINGERPRINT_VERSION =
  "creative-fingerprint@2" as const;

/**
 * Time-decay and originality thresholds for cross-run creative memory.
 *
 * Weight model (higher = stronger protection against reuse):
 * - very recent packages by count: full hard protection
 * - recent by age: strong
 * - medium / old: progressively weaker
 * - ancient: soft preference only (may return with different scenario/POV/execution)
 * - rejected/cancelled within rejectedBoostDays: boosted weight
 *
 * A hard conflict fires when matchScore * effectiveWeight >= hardBlockThreshold.
 */
export const CREATIVE_CORE_V2_MEMORY_CONFIG = {
  /** How many recent packages to scan when building memory. */
  packageScanLimit: 60,
  /** How many compact records to inject into prompts. */
  promptRecordLimit: 16,

  /** Last N packages (any age) get maximum protection weight. */
  veryRecentCount: 3,
  veryRecentWeight: 1,

  /** Age buckets (days since created_at). */
  recentDays: 14,
  recentWeight: 0.85,
  mediumDays: 45,
  mediumWeight: 0.55,
  oldDays: 90,
  oldWeight: 0.3,
  ancientWeight: 0.12,

  /** Rejected / cancelled drafts keep a rejection boost for this many days. */
  rejectedBoostDays: 21,
  rejectedWeightBoost: 0.35,

  /** matchScore * weight thresholds. */
  hardBlockThreshold: 0.7,
  softBlockThreshold: 0.45,

  /**
   * packageCount=1 still rotates: if unused project pains exist, repeating the
   * most recent pain is a hard conflict when that record's weight is strong.
   */
  painRotationMinWeight: 0.55,

  /** Strategy: 1 initial + 1 repair only. */
  maxStrategyAttempts: 2,

  /**
   * Creative Core: exactly one Claude creative request per attempt.
   * No creative repair loop (validation fail = stable error).
   */
  maxCreativeCoreAttempts: 1,

  /** Video package scene + VO bounds. */
  videoSceneMin: 4,
  videoSceneMax: 5,
  voiceoverWordMin: 40,
  voiceoverWordMax: 90,
  targetDurationSecondsMin: 20,
  targetDurationSecondsMax: 30,
} as const;

export type CreativeCoreV2MemoryConfig =
  typeof CREATIVE_CORE_V2_MEMORY_CONFIG;
