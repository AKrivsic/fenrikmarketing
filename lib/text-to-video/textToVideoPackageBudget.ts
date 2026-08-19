import { parseTextToVideoWorkerPaidGate } from "@/lib/text-to-video/textToVideoWorkerPipeline";

export class TextToVideoPackageBudgetError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

/** Budget must come from immutable production run / video job input only. */
export function assertAuthoritativeTextToVideoPackageBudget(
  jobInput: Record<string, unknown>,
): { packageBudgetUsd: number; confirmPaidRun: boolean } {
  const gate = parseTextToVideoWorkerPaidGate(jobInput);
  if (!gate.confirmPaidRun) {
    throw new TextToVideoPackageBudgetError("confirm_paid_run_required");
  }
  if (!Number.isFinite(gate.packageBudgetUsd) || gate.packageBudgetUsd <= 0) {
    throw new TextToVideoPackageBudgetError("package_budget_invalid");
  }
  return {
    packageBudgetUsd: gate.packageBudgetUsd,
    confirmPaidRun: gate.confirmPaidRun,
  };
}

export function assertAssemblyPhasePackageBudget(
  packageBudgetUsd: number | undefined,
): number {
  if (
    packageBudgetUsd === undefined ||
    !Number.isFinite(packageBudgetUsd) ||
    packageBudgetUsd <= 0
  ) {
    throw new TextToVideoPackageBudgetError("package_budget_invalid");
  }
  return packageBudgetUsd;
}
