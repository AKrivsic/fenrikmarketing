/**
 * Repair hard/soft policy (Invariant 4).
 * After one material repair, only unrecoverable invariant violations hard-fail.
 * Heuristic residues become soft warnings so Creative Engine work is not discarded.
 */

import type { ConceptFidelityResult } from "@/lib/creative-candidates/types";
import { classifyFidelityFailuresForRepair } from "@/lib/creative-candidates/fidelityCheck";
import type {
  StoryIntegrityResult,
  StoryIntegrityViolationCode,
} from "@/lib/creative-candidates/storyIntegrity";
import { STORY_INTEGRITY_SOFT_CODES } from "@/lib/creative-candidates/storyIntegrity";

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
