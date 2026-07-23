/**
 * Phase 2A Decision Ownership — public exports.
 */
export {
  DECISION_OWNERSHIP,
  REQUIRED_DECISION_IDS,
  ILLEGAL_DUPLICATE_WRITER_PATTERNS,
  dangerousConflicts,
  safeFutureRemovals,
  decisionOwnershipCsv,
  getDecisionOwnership,
  type ConflictClass,
  type DecisionId,
  type DecisionOwnershipRecord,
} from "@/lib/architecture/decisionOwnership";

export {
  buildTypedDecisionPacks,
  TYPED_DECISION_PACKS_VERSION,
  PACK_KEY_TO_DECISION_IDS,
  DEFERRED_DECISION_IDS,
  DEFERRED_DECISION_REASONS,
  type TypedDecisionPacks,
} from "@/lib/architecture/typedDecisionPacks";
