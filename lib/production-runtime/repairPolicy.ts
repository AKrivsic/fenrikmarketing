/**
 * Repair hard/soft policy (Invariant 4).
 * After one material repair, only unrecoverable invariant violations hard-fail.
 * Heuristic residues become soft warnings so Creative Engine work is not discarded.
 */

import type { ConceptFidelityResult } from "@/lib/creative-candidates/types";
import type { CreativeCandidate } from "@/lib/creative-candidates/types";
import { classifyFidelityFailuresForRepair } from "@/lib/creative-candidates/fidelityCheck";
import type {
  StoryIntegrityResult,
  StoryIntegrityViolationCode,
} from "@/lib/creative-candidates/storyIntegrity";
import {
  STORY_INTEGRITY_SOFT_CODES,
  sceneSatisfiesHandsOrPropOpening,
} from "@/lib/creative-candidates/storyIntegrity";

/**
 * Codes that remain hard after one repair attempt (true story breakage).
 * Heuristic actor/location mismatches soft-continue after repair.
 */
export const STORY_INTEGRITY_SOFT_AFTER_REPAIR_CODES: ReadonlySet<StoryIntegrityViolationCode> =
  new Set([
    "primary_actor_changed",
    "location_changed_without_reason",
    "cta_mismatch",
  ]);

/**
 * Codes that must never trigger an expensive Story Integrity Repair when the
 * selected concept already uses an intentional hands/prop opening that the
 * package opening scene satisfies.
 */
export const STORY_INTEGRITY_SKIP_REPAIR_WHEN_HANDS_PROP_CODES: ReadonlySet<StoryIntegrityViolationCode> =
  new Set(["primary_actor_changed"]);

export function classifyStoryIntegrityForHardFail(
  integrity: StoryIntegrityResult,
  opts: { afterRepairAttempt: boolean },
): {
  hardViolations: StoryIntegrityResult["violations"];
  softViolations: StoryIntegrityResult["violations"];
  shouldHardFail: boolean;
} {
  const softSet = opts.afterRepairAttempt
    ? new Set<StoryIntegrityViolationCode>([
        ...STORY_INTEGRITY_SOFT_CODES,
        ...STORY_INTEGRITY_SOFT_AFTER_REPAIR_CODES,
      ])
    : STORY_INTEGRITY_SOFT_CODES;

  const hardViolations = integrity.violations.filter((v) => !softSet.has(v.code));
  const softViolations = [
    ...integrity.warnings,
    ...integrity.violations.filter((v) => softSet.has(v.code)),
  ];
  return {
    hardViolations,
    softViolations,
    shouldHardFail: hardViolations.length > 0,
  };
}

/** Hard-fail fidelity only when material reasons remain. */
export function shouldHardFailFidelityAfterRepair(
  fidelity: ConceptFidelityResult,
): boolean {
  if (fidelity.passed) return false;
  const classification = classifyFidelityFailuresForRepair(fidelity);
  return classification.material;
}

export function shouldHardFailStoryIntegrityAfterRepair(
  integrity: StoryIntegrityResult,
): boolean {
  if (integrity.passed) return false;
  return classifyStoryIntegrityForHardFail(integrity, {
    afterRepairAttempt: true,
  }).shouldHardFail;
}

/**
 * Whether Story Integrity Repair (full Claude regenerate) should run.
 * Skip when the only hard codes are false-positive actor mismatches on an
 * intentional hands/prop opening that already matches the concept.
 */
export function shouldInvokeStoryIntegrityRepair(args: {
  integrity: StoryIntegrityResult;
  winner: CreativeCandidate;
  openingSceneText: string;
}): boolean {
  if (args.integrity.passed) return false;

  const handsPropOk = sceneSatisfiesHandsOrPropOpening(
    args.openingSceneText,
    args.winner,
  );
  if (!handsPropOk) return true;

  const remainingHard = args.integrity.violations.filter(
    (v) =>
      !STORY_INTEGRITY_SOFT_CODES.has(v.code) &&
      !STORY_INTEGRITY_SKIP_REPAIR_WHEN_HANDS_PROP_CODES.has(v.code),
  );
  return remainingHard.length > 0;
}

/** Soft-continue path when repair is skipped for hands/prop openings. */
export function storyIntegrityAfterSkippedRepair(
  integrity: StoryIntegrityResult,
): StoryIntegrityResult {
  if (integrity.passed) return integrity;
  const softCodes = new Set<StoryIntegrityViolationCode>([
    ...STORY_INTEGRITY_SOFT_CODES,
    ...STORY_INTEGRITY_SKIP_REPAIR_WHEN_HANDS_PROP_CODES,
  ]);
  const hard = integrity.violations.filter((v) => !softCodes.has(v.code));
  const softFromHard = integrity.violations.filter((v) => softCodes.has(v.code));
  if (hard.length > 0) return integrity;
  return {
    ...integrity,
    passed: true,
    violations: [],
    warnings: [...integrity.warnings, ...softFromHard],
    summary:
      softFromHard.length > 0
        ? `soft_skip_repair:${softFromHard.map((v) => v.code).join(",")}`
        : integrity.summary,
  };
}
