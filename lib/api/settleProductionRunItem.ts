/**
 * Sprint 5.3.1 — production-run settlement that must not be swallowed.
 */

import {
  markProductionRunItemGenerationFailed,
  type GenerationFailedDiagnostics,
} from "@/lib/api/production-run-admin";

export class SettlementFailedError extends Error {
  readonly code = "operational_failure" as const;
  readonly causeError: unknown;

  constructor(message: string, causeError?: unknown) {
    super(message);
    this.name = "SettlementFailedError";
    this.causeError = causeError;
  }
}

const SETTLE_MAX_ATTEMPTS = 3;

/**
 * Mark the production run item failed. Retries transient DB errors.
 * Throws SettlementFailedError if settlement cannot complete — callers must
 * surface operational_failure (never pretend generation settled).
 */
export async function settleProductionRunItemOrThrow(args: {
  projectId: string;
  strategyItemId: string;
  diagnostics: GenerationFailedDiagnostics;
}): Promise<{
  runId: string | null;
  itemId: string | null;
  runStatus: string | null;
}> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= SETTLE_MAX_ATTEMPTS; attempt++) {
    try {
      return await markProductionRunItemGenerationFailed(args);
    } catch (err) {
      lastErr = err;
      console.error(
        "[settlement] markProductionRunItemGenerationFailed failed",
        JSON.stringify({
          attempt,
          projectId: args.projectId,
          strategyItemId: args.strategyItemId,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  }
  throw new SettlementFailedError(
    `operational_failure: production_run_item settlement failed after ${SETTLE_MAX_ATTEMPTS} attempts`,
    lastErr,
  );
}
