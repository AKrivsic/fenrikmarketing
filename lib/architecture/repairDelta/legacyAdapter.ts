/**
 * TEMPORARY COMPAT (Phase 4) — adapt RepairDelta back to the legacy
 * Presentation-appendix string used before delta prompts.
 *
 * Prefer buildRepairDeltaPrompt. This adapter exists so callers that still
 * inject into buildGenerateContentPackagePrompt({ creativeCandidateFidelityRepair })
 * can keep working during migration.
 */

import type { RepairDelta } from "@/lib/architecture/repairDelta/types";

/**
 * Legacy appendix = REQUIRED CHANGE body (already contains the historical
 * fidelity / story integrity appendix prose).
 */
export function repairDeltaToLegacyAppendix(delta: RepairDelta): string {
  return delta.requiredChange;
}

/**
 * Build a legacy full-Presentation repair prompt by appending the delta
 * appendix to a Presentation builder. Documented temporary path only.
 */
export function buildLegacyRepairPromptViaPresentation(args: {
  buildPresentationPrompt: (appendix?: string) => string;
  delta: RepairDelta;
}): string {
  return args.buildPresentationPrompt(repairDeltaToLegacyAppendix(args.delta));
}
