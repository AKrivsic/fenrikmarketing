/**
 * Strategy originality gate for Creative Core v2.
 * Max one repair; second failure stops before Creative Core.
 */

import { CREATIVE_CORE_V2_MEMORY_CONFIG } from "@/lib/content-creative-core-v2/config";
import {
  fingerprintFromStrategyCandidate,
  isParaphraseText,
  keyFromText,
  tokenOverlapRatio,
} from "@/lib/content-creative-core-v2/fingerprint";
import {
  lastUsedPainKey,
  unusedPainPoints,
} from "@/lib/content-creative-core-v2/memory";
import type {
  CreativeFingerprintV2,
  CreativeMemoryRecordV2,
  CreativeMemoryV2,
  StrategyCandidateV2,
  StrategyOriginalityDiagnosticsV2,
  StrategyOriginalityIssueV2,
} from "@/lib/content-creative-core-v2/types";
import { STRATEGY_ORIGINALITY_EXHAUSTED_V2 } from "@/lib/content-creative-core-v2/types";

/**
 * Same pain is allowed when execution differs on enough creative dimensions.
 * Block pain reuse only when the new candidate is still essentially the same piece.
 */
export function executionIsMeaningfullyDifferent(
  fp: CreativeFingerprintV2,
  record: CreativeMemoryRecordV2,
): boolean {
  const prior = record.fingerprint;
  let diffs = 0;
  if (
    fp.scenario_key &&
    prior.scenario_key &&
    fp.scenario_key !== prior.scenario_key
  ) {
    diffs += 1;
  }
  if (
    fp.opening_mechanism !== "other" &&
    prior.opening_mechanism !== "other" &&
    fp.opening_mechanism !== prior.opening_mechanism
  ) {
    diffs += 1;
  }
  if (fp.setting_key && prior.setting_key && fp.setting_key !== prior.setting_key) {
    diffs += 1;
  }
  if (
    fp.visual_motif_key &&
    prior.visual_motif_key &&
    fp.visual_motif_key !== prior.visual_motif_key
  ) {
    diffs += 1;
  }
  if (fp.conflict_key && prior.conflict_key && fp.conflict_key !== prior.conflict_key) {
    diffs += 1;
  }
  if (fp.reveal_key && prior.reveal_key && fp.reveal_key !== prior.reveal_key) {
    diffs += 1;
  }
  if (fp.payoff_key && prior.payoff_key && fp.payoff_key !== prior.payoff_key) {
    diffs += 1;
  }
  if (
    fp.pov_key !== "other" &&
    prior.pov_key !== "other" &&
    fp.pov_key !== prior.pov_key
  ) {
    diffs += 1;
  }
  if (
    fp.topic_key &&
    prior.topic_key &&
    fp.topic_key !== prior.topic_key
  ) {
    diffs += 1;
  }
  return diffs >= 3;
}

function situationText(candidate: StrategyCandidateV2): string {
  return [candidate.topic, candidate.angle, candidate.pain_point].join("\n");
}

function recordSituationText(record: CreativeMemoryRecordV2): string {
  return [
    record.central_topic,
    record.conflict,
    record.reveal_or_surprise,
    record.pain_point ?? "",
  ].join("\n");
}

function scoreAgainstRecord(
  candidate: StrategyCandidateV2,
  fp: CreativeFingerprintV2,
  record: CreativeMemoryRecordV2,
): { score: number; issues: StrategyOriginalityIssueV2[] } {
  const issues: StrategyOriginalityIssueV2[] = [];
  let score = 0;
  const candSit = situationText(candidate);
  const recSit = recordSituationText(record);
  const paraphrase =
    isParaphraseText(candidate.topic, record.central_topic) ||
    tokenOverlapRatio(candSit, recSit) >= 0.55 ||
    (fp.scenario_key !== "other" &&
      fp.scenario_key === record.fingerprint.scenario_key &&
      fp.scenario_key.length > 0);

  if (paraphrase) {
    score = Math.max(score, 0.9);
    if (
      fp.pov_key !== record.fingerprint.pov_key &&
      fp.pov_key !== "other" &&
      record.fingerprint.pov_key !== "other"
    ) {
      issues.push({
        reason: "same_situation_different_character",
        detail: `Different POV (${fp.pov_key} vs ${record.fingerprint.pov_key}) in the same situation`,
        against_package_id: record.package_id,
        match_score: 0.9,
        protection_weight: record.protection_weight,
      });
    } else {
      issues.push({
        reason: "same_situation_paraphrase",
        detail: `Paraphrase / same situation as package ${record.package_id}`,
        against_package_id: record.package_id,
        match_score: 0.9,
        protection_weight: record.protection_weight,
      });
    }
  }

  if (
    fp.opening_mechanism !== "other" &&
    fp.opening_mechanism === record.fingerprint.opening_mechanism &&
    fp.conflict_key &&
    fp.conflict_key === record.fingerprint.conflict_key
  ) {
    score = Math.max(score, 0.8);
    issues.push({
      reason: "same_opening_mechanism_and_conflict",
      detail: `Same opening (${fp.opening_mechanism}) and conflict key`,
      against_package_id: record.package_id,
      match_score: 0.8,
      protection_weight: record.protection_weight,
    });
  }

  if (
    fp.setting_key &&
    fp.setting_key === record.fingerprint.setting_key &&
    fp.prop_keys.some((p) => record.fingerprint.prop_keys.includes(p)) &&
    fp.prop_keys.length > 0
  ) {
    score = Math.max(score, 0.75);
    issues.push({
      reason: "same_setting_and_props",
      detail: `Same setting and dominant props as ${record.package_id}`,
      against_package_id: record.package_id,
      match_score: 0.75,
      protection_weight: record.protection_weight,
    });
  }

  if (
    fp.conflict_key &&
    fp.payoff_key &&
    fp.conflict_key === record.fingerprint.conflict_key &&
    fp.payoff_key === record.fingerprint.payoff_key
  ) {
    score = Math.max(score, 0.85);
    issues.push({
      reason: "same_conflict_and_payoff",
      detail: `Same conflict and payoff as ${record.package_id}`,
      against_package_id: record.package_id,
      match_score: 0.85,
      protection_weight: record.protection_weight,
    });
  }

  if (
    fp.scenario_key &&
    fp.scenario_key === record.fingerprint.scenario_key &&
    fp.scenario_key.length > 0
  ) {
    score = Math.max(score, 0.88);
    if (!issues.some((i) => i.reason === "same_situation_paraphrase")) {
      issues.push({
        reason: "fingerprint_hard_conflict",
        detail: `Same scenario_key as ${record.package_id}`,
        against_package_id: record.package_id,
        match_score: 0.88,
        protection_weight: record.protection_weight,
      });
    }
  }

  return { score, issues };
}

export function evaluateStrategyCandidateOriginality(args: {
  candidate: StrategyCandidateV2;
  memory: CreativeMemoryV2;
  projectPains: readonly string[];
  /** packageCount is accepted for API stability; gate always applies (incl. 1). */
  packageCount: number;
}): { ok: boolean; issues: StrategyOriginalityIssueV2[] } {
  const cfg = CREATIVE_CORE_V2_MEMORY_CONFIG;
  const fp = fingerprintFromStrategyCandidate(args.candidate);
  const issues: StrategyOriginalityIssueV2[] = [];

  for (const record of args.memory.records) {
    const { score, issues: recordIssues } = scoreAgainstRecord(
      args.candidate,
      fp,
      record,
    );
    const weighted = score * record.protection_weight;
    if (weighted >= cfg.hardBlockThreshold) {
      for (const issue of recordIssues) {
        issues.push({
          ...issue,
          match_score: score,
          protection_weight: record.protection_weight,
        });
        if (record.rejected && record.protection_weight >= cfg.recentWeight) {
          issues.push({
            reason: "rejected_recent_hard_conflict",
            detail: `Conflicts with recent creatively rejected package ${record.package_id}`,
            against_package_id: record.package_id,
            match_score: score,
            protection_weight: record.protection_weight,
          });
        }
      }
    }
  }

  const unused = unusedPainPoints(args.projectPains, args.memory);
  const lastPain = lastUsedPainKey(args.memory);
  const painKey = keyFromText(args.candidate.pain_point, 6);
  const lastRecord = args.memory.records[0];
  if (
    unused.length > 0 &&
    lastPain &&
    painKey &&
    painKey === lastPain &&
    lastRecord &&
    (lastRecord.protection_weight ?? 0) >= cfg.painRotationMinWeight &&
    !executionIsMeaningfullyDifferent(fp, lastRecord)
  ) {
    issues.push({
      reason: "pain_not_rotated",
      detail: `Same recent pain with similar execution (packageCount=${args.packageCount})`,
      against_package_id: lastRecord.package_id,
      protection_weight: lastRecord.protection_weight,
    });
  }

  const unique = new Map<string, StrategyOriginalityIssueV2>();
  for (const issue of issues) {
    const key = `${issue.reason}:${issue.against_package_id ?? ""}`;
    if (!unique.has(key)) unique.set(key, issue);
  }
  const deduped = [...unique.values()];
  return { ok: deduped.length === 0, issues: deduped };
}

export function formatStrategyOriginalityRetryAppend(
  issues: StrategyOriginalityIssueV2[],
): string {
  return [
    "",
    "RETRY — previous strategy candidate repeated protected creative memory.",
    "This is the ONLY repair attempt. Invent a genuinely new situation.",
    "Rejected because:",
    ...issues.map((i) => `- ${i.reason}: ${i.detail}`),
    "A different character, hook, or wording of the same plot is NOT new.",
    "Change pain (when unused pains exist), scenario, setting, props, conflict, and payoff.",
  ].join("\n");
}

export type StrategyGeneratorFn = (args: {
  attempt: number;
  repairAppend: string | null;
}) => Promise<StrategyCandidateV2> | StrategyCandidateV2;

/**
 * Runs strategy generation with max one originality repair.
 * Does not call Claude itself — inject the generator (offline tests / later wiring).
 */
export async function createStrategyCandidateWithOriginality(args: {
  memory: CreativeMemoryV2;
  projectPains: readonly string[];
  packageCount: number;
  generate: StrategyGeneratorFn;
}): Promise<
  | {
      ok: true;
      candidate: StrategyCandidateV2;
      diagnostics: StrategyOriginalityDiagnosticsV2;
    }
  | {
      ok: false;
      error: typeof STRATEGY_ORIGINALITY_EXHAUSTED_V2;
      diagnostics: StrategyOriginalityDiagnosticsV2;
      lastCandidate: StrategyCandidateV2 | null;
    }
> {
  const max = CREATIVE_CORE_V2_MEMORY_CONFIG.maxStrategyAttempts;
  let lastCandidate: StrategyCandidateV2 | null = null;
  let lastIssues: StrategyOriginalityIssueV2[] = [];
  let repairAppend: string | null = null;

  for (let attempt = 1; attempt <= max; attempt += 1) {
    const candidate = await args.generate({ attempt, repairAppend });
    lastCandidate = candidate;
    // Ensure fingerprint is present / recomputed for gate consistency.
    candidate.creative_fingerprint = fingerprintFromStrategyCandidate(candidate);
    const result = evaluateStrategyCandidateOriginality({
      candidate,
      memory: args.memory,
      projectPains: args.projectPains,
      packageCount: args.packageCount,
    });
    if (result.ok) {
      return {
        ok: true,
        candidate,
        diagnostics: {
          attempts: attempt,
          max_attempts: max,
          issues: [],
          exhausted: false,
        },
      };
    }
    lastIssues = result.issues;
    if (attempt >= max) break;
    repairAppend = formatStrategyOriginalityRetryAppend(result.issues);
  }

  return {
    ok: false,
    error: STRATEGY_ORIGINALITY_EXHAUSTED_V2,
    lastCandidate,
    diagnostics: {
      attempts: max,
      max_attempts: max,
      issues: lastIssues,
      exhausted: true,
    },
  };
}

export function originalityDiagnosticsForBrief(
  diagnostics: StrategyOriginalityDiagnosticsV2,
): Record<string, unknown> {
  return {
    version: "strategy-originality-audit@2",
    attempts: diagnostics.attempts,
    max_attempts: diagnostics.max_attempts,
    exhausted: diagnostics.exhausted,
    issues: diagnostics.issues,
  };
}
