import type { DurationValidationDiagnostics } from "@/lib/narrative-beats/types";
import { weightForNarrativeRole } from "@/lib/narrative-beats/durationWeights";

/** Ending (RESOLUTION/CTA) must not dominate the video. */
export const MAX_ENDING_SHARE = 0.32;

/** Hook must stay short — curiosity, not lecture. */
export const MAX_HOOK_SHARE = 0.28;

/**
 * Escalation should not be shorter than setup without a clear reason
 * (e.g. setup VO word share much higher).
 */
export const MIN_ESCALATION_VS_SETUP_RATIO = 0.85;

/**
 * Validate a planned duration distribution.
 * Diagnostics only — does not reshape the timeline here (planner already caps).
 */
export function validateDurationPlan(args: {
  roles: readonly string[];
  durationsSeconds: readonly number[];
  segmentWordCounts?: readonly number[];
  justifiedOverMax?: readonly boolean[];
}): DurationValidationDiagnostics {
  const total = args.durationsSeconds.reduce((a, b) => a + b, 0);
  const warnings: string[] = [];
  const summary: string[] = [];
  const shares =
    total > 0
      ? args.durationsSeconds.map((d) => d / total)
      : args.durationsSeconds.map(() => 0);

  if (total <= 0 || args.roles.length === 0) {
    return {
      version: "duration-validation@1",
      passed: true,
      warnings: [],
      summary: [],
      shares,
    };
  }

  const totalWords = (args.segmentWordCounts ?? []).reduce((a, b) => a + b, 0);

  for (let i = 0; i < args.roles.length; i++) {
    const role = (args.roles[i] ?? "").trim();
    const share = shares[i] ?? 0;
    const upper = role.toUpperCase();
    const isHook =
      upper === "HOOK" ||
      /^(hook|unexpected_fact|observation|myth|mistake|common_belief|situation|before)$/i.test(
        role,
      );
    const isEnding =
      upper === "RESOLUTION" ||
      /^(resolution|cta|after|recommendation|payoff|close)$/i.test(role);

    if (isHook && share > MAX_HOOK_SHARE) {
      const words = args.segmentWordCounts?.[i] ?? 0;
      const wordShare = totalWords > 0 ? words / totalWords : 0;
      if (wordShare < 0.4 && !args.justifiedOverMax?.[i]) {
        warnings.push(
          `hook_excessively_long:share=${share.toFixed(2)}_role=${role}`,
        );
      }
    }

    if (isEnding && share > MAX_ENDING_SHARE) {
      const words = args.segmentWordCounts?.[i] ?? 0;
      const wordShare = totalWords > 0 ? words / totalWords : 0;
      if (wordShare < 0.4 && !args.justifiedOverMax?.[i]) {
        warnings.push(
          `ending_dominates_video:share=${share.toFixed(2)}_role=${role}`,
        );
      }
    }
  }

  // Escalation shorter than setup without reason
  let setupIdx = -1;
  let escIdx = -1;
  for (let i = 0; i < args.roles.length; i++) {
    const role = args.roles[i] ?? "";
    const upper = role.toUpperCase();
    if (
      setupIdx < 0 &&
      (upper === "SETUP" ||
        /^(setup|insight|implication|why_wrong|why_believed|why_backfires|meaning|change)$/i.test(
          role,
        ))
    ) {
      setupIdx = i;
    }
    if (
      escIdx < 0 &&
      (upper === "ESCALATION" ||
        /^(conflict|twist|escalation|unexpected_turn|punchline|tradeoffs|in_action|proof|reality|correct_approach|reveal)$/i.test(
          role,
        ))
    ) {
      escIdx = i;
    }
  }

  if (setupIdx >= 0 && escIdx >= 0 && setupIdx !== escIdx) {
    const setupDur = args.durationsSeconds[setupIdx] ?? 0;
    const escDur = args.durationsSeconds[escIdx] ?? 0;
    if (setupDur > 0 && escDur / setupDur < MIN_ESCALATION_VS_SETUP_RATIO) {
      const setupWords = args.segmentWordCounts?.[setupIdx] ?? 0;
      const escWords = args.segmentWordCounts?.[escIdx] ?? 0;
      const setupWeight = weightForNarrativeRole(args.roles[setupIdx] ?? "SETUP");
      const escWeight = weightForNarrativeRole(args.roles[escIdx] ?? "ESCALATION");
      // Reasonable if setup VO is much longer, or escalation weight already lower
      const voJustifies =
        totalWords > 0 && setupWords > 0 && escWords / Math.max(setupWords, 1) < 0.7;
      if (!voJustifies && escWeight >= setupWeight) {
        warnings.push(
          `escalation_shorter_than_setup:esc=${escDur.toFixed(2)}s_setup=${setupDur.toFixed(2)}s`,
        );
      }
    }
  }

  for (const w of warnings) summary.push(w);

  return {
    version: "duration-validation@1",
    passed: warnings.length === 0,
    warnings,
    summary,
    shares: shares.map((s) => Math.round(s * 1000) / 1000),
  };
}
