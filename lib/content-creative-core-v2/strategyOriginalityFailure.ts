/**
 * Bounded strategy originality failure payloads + operator-facing messages.
 */

import type { PipelineTelemetryStep } from "@/lib/ai/telemetry/types";
import { CREATIVE_CORE_V2_MEMORY_CONFIG } from "@/lib/content-creative-core-v2/config";
import { keyFromText } from "@/lib/content-creative-core-v2/fingerprint";
import type {
  StrategyOriginalityAttemptRecordV2,
  StrategyOriginalityCandidateSummaryV2,
  StrategyOriginalityFailureBundleV2,
  StrategyOriginalityIssueV2,
} from "@/lib/content-creative-core-v2/types";
import type { StrategyOriginalityHistorySnapshot } from "@/lib/content-creative-core-v2/strategyOriginalityHistory";

const MAX_FIELD = 200;
const MAX_IDS = 50;
const MAX_ISSUES = 40;
const MAX_ATTEMPTS = 2;

function clip(text: string, max = MAX_FIELD): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function summarizeStrategyPlanItems(
  items: Array<{ topic?: string; angle?: string; pain_point?: string }>,
): StrategyOriginalityCandidateSummaryV2[] {
  return items.map((item) => ({
    topic: clip(item.topic ?? "", 160),
    angle: clip(item.angle ?? "", 160),
    pain_point: clip(item.pain_point ?? "", 120),
    topic_key: keyFromText(item.topic ?? "", 8) || undefined,
    pain_key: keyFromText(item.pain_point ?? "", 6) || undefined,
    situation_key: keyFromText(
      [item.topic, item.angle].filter(Boolean).join(" "),
      10,
    ) || undefined,
  }));
}

export function buildStrategyOriginalityAttemptRecord(args: {
  attempt: number;
  items: Array<{ topic?: string; angle?: string; pain_point?: string }>;
  issues: StrategyOriginalityIssueV2[];
  repairFeedback?: string | null;
  history: StrategyOriginalityHistorySnapshot;
}): StrategyOriginalityAttemptRecordV2 {
  const issues = args.issues.slice(0, MAX_ISSUES).map((issue) => {
    if (
      issue.weighted_score != null ||
      issue.match_score == null ||
      issue.protection_weight == null
    ) {
      return issue;
    }
    return {
      ...issue,
      weighted_score: issue.match_score * issue.protection_weight,
    };
  });
  return {
    attempt: args.attempt,
    candidate_summaries: summarizeStrategyPlanItems(args.items),
    issues,
    repair_feedback: args.repairFeedback
      ? clip(args.repairFeedback, 800)
      : null,
    history_record_count: args.history.telemetry.history_record_count,
    history_package_ids: args.history.packageIds.slice(0, MAX_IDS),
    hard_block_threshold: CREATIVE_CORE_V2_MEMORY_CONFIG.hardBlockThreshold,
  };
}

export function resolveStrategyProviderRequestIdFromTelemetry(
  steps: readonly PipelineTelemetryStep[],
): string | null {
  for (let i = steps.length - 1; i >= 0; i -= 1) {
    const step = steps[i];
    if (
      step?.step_name === "Content Strategy" &&
      typeof step.provider_request_id === "string" &&
      step.provider_request_id.trim()
    ) {
      return step.provider_request_id.trim();
    }
  }
  return null;
}

export function buildStrategyOriginalityFailureBundle(args: {
  attempts: StrategyOriginalityAttemptRecordV2[];
  history: StrategyOriginalityHistorySnapshot;
  providerRequestId?: string | null;
}): StrategyOriginalityFailureBundleV2 {
  return {
    version: "strategy-originality-failure@2",
    exhausted: true,
    attempts: args.attempts.slice(0, MAX_ATTEMPTS),
    history_telemetry: {
      history_record_count: args.history.telemetry.history_record_count,
      originality_block_chars: args.history.telemetry.originality_block_chars,
      estimated_prompt_tokens: args.history.telemetry.estimated_prompt_tokens,
      package_ids: args.history.packageIds.slice(0, MAX_IDS),
    },
    provider_request_id: args.providerRequestId ?? null,
  };
}

function primaryHardIssue(
  issues: StrategyOriginalityIssueV2[],
): StrategyOriginalityIssueV2 | null {
  const hard = issues.filter((i) => i.reason !== "pain_not_rotated");
  return hard[0] ?? issues[0] ?? null;
}

/** Operator-facing message (Czech) without stack traces. */
export function formatStrategyOriginalityOperatorMessage(
  bundle: StrategyOriginalityFailureBundleV2,
): string {
  const last = bundle.attempts[bundle.attempts.length - 1];
  const issue = last ? primaryHardIssue(last.issues) : null;
  const parts = [
    "Originalita strategie selhala po dvou pokusech.",
  ];
  if (issue) {
    parts.push(`Hlavní důvod: ${issue.reason} — ${clip(issue.detail, 180)}.`);
    if (issue.against_package_id) {
      parts.push(
        `Konflikt s balíčkem ${issue.against_package_id.slice(0, 8)}…`,
      );
    }
    if (issue.match_score != null && issue.protection_weight != null) {
      const weighted = issue.match_score * issue.protection_weight;
      parts.push(
        `Skóre ${weighted.toFixed(2)} (práh ${last?.hard_block_threshold ?? CREATIVE_CORE_V2_MEMORY_CONFIG.hardBlockThreshold}).`,
      );
    }
  }
  return parts.join(" ");
}

/** Admin detail appended to validation errors / telemetry views. */
export function formatStrategyOriginalityAdminDetail(
  bundle: StrategyOriginalityFailureBundleV2,
): string {
  const last = bundle.attempts[bundle.attempts.length - 1];
  const issue = last ? primaryHardIssue(last.issues) : null;
  if (!issue) return "strategy_originality_exhausted_v2";
  const weighted =
    issue.match_score != null && issue.protection_weight != null
      ? (issue.match_score * issue.protection_weight).toFixed(3)
      : "?";
  return [
    `strategy_originality_exhausted_v2`,
    `reason=${issue.reason}`,
    `against=${issue.against_package_id?.slice(0, 8) ?? "?"}`,
    `weighted=${weighted}`,
    `threshold=${last?.hard_block_threshold ?? CREATIVE_CORE_V2_MEMORY_CONFIG.hardBlockThreshold}`,
    `history_count=${bundle.history_telemetry.history_record_count}`,
  ].join(" | ");
}
