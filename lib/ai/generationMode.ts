export type GenerationMode = "production" | "sample" | "manual_review";

export const DEFAULT_GENERATION_MODE: GenerationMode = "production";

/** Persisted on production_runs.requested_config.config after Continue Generation. */
export const CONTINUED_AFTER_CREATIVE_REVIEW_KEY =
  "continued_after_creative_review" as const;

/** Set on production run when automatic T2V hits repetition_blocked (Step 2C). */
export const AWAITING_TEXT_TO_VIDEO_CREATIVE_REVIEW_KEY =
  "awaiting_text_to_video_creative_review" as const;

const KNOWN_GENERATION_MODES = new Set<GenerationMode>([
  "production",
  "sample",
  "manual_review",
]);

/** Normalizes API / config input. Unknown values fall back to production. */
export function parseGenerationMode(raw: unknown): GenerationMode {
  if (typeof raw === "string" && KNOWN_GENERATION_MODES.has(raw as GenerationMode)) {
    return raw as GenerationMode;
  }
  return DEFAULT_GENERATION_MODE;
}

/** Returns undefined when the field is absent (caller resolves default). */
export function optionalGenerationModeFromBody(
  body: Record<string, unknown>,
): GenerationMode | undefined {
  if (!Object.prototype.hasOwnProperty.call(body, "generation_mode")) {
    return undefined;
  }
  return parseGenerationMode(body.generation_mode);
}

/** Explicit request body wins, then production-run config, then production default. */
export function resolveGenerationMode(
  explicit: unknown | undefined,
  fromRun: unknown | undefined,
): GenerationMode {
  if (explicit !== undefined && explicit !== null) {
    return parseGenerationMode(explicit);
  }
  if (fromRun !== undefined && fromRun !== null) {
    return parseGenerationMode(fromRun);
  }
  return DEFAULT_GENERATION_MODE;
}

/**
 * When a package is generated inside a production run, the run's stored mode
 * is authoritative (n8n may omit generation_mode in the webhook body).
 */
export function resolveGenerationModeForProductionRun(
  runMode: unknown | undefined,
  requestMode: unknown | undefined,
): GenerationMode {
  if (runMode !== undefined && runMode !== null) {
    return parseGenerationMode(runMode);
  }
  return resolveGenerationMode(requestMode, undefined);
}

/**
 * Manual Review defers video job creation until after creative review.
 * Mode-only check — use {@link shouldDeferVideoUntilCreativeReview} when the
 * run config may already carry a Continue Generation flag.
 */
export function defersVideoUntilCreativeReview(mode: GenerationMode): boolean {
  return mode === "manual_review";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/**
 * True when Continue Generation has already left waiting_for_creative_review
 * for this run (flag stamped onto requested_config.config).
 */
export function hasContinuedAfterCreativeReview(
  configOrStored: unknown,
): boolean {
  const root = asRecord(configOrStored);
  if (!root) return false;
  // Accept either the nested config object or the full requested_config blob.
  const config = asRecord(root.config) ?? root;
  const flag = config[CONTINUED_AFTER_CREATIVE_REVIEW_KEY];
  return flag === true;
}

/**
 * Whether video job creation / video-required reconcile should still wait for
 * Creative Review. False after Continue Generation stamps the continue flag.
 */
export function shouldDeferVideoUntilCreativeReview(
  mode: GenerationMode,
  configOrStored?: unknown,
): boolean {
  if (!defersVideoUntilCreativeReview(mode)) return false;
  if (hasContinuedAfterCreativeReview(configOrStored)) return false;
  return true;
}

/**
 * Stamp Continue Generation onto a requested_config blob (immutable copy).
 * Preserves plan + other config fields.
 */
export function markContinuedAfterCreativeReview(
  requestedConfig: unknown,
  args: { at: string; by?: string },
): Record<string, unknown> {
  const root = asRecord(requestedConfig) ?? {};
  const prevConfig = asRecord(root.config) ?? {};
  const nextConfig = { ...prevConfig };
  delete nextConfig[AWAITING_TEXT_TO_VIDEO_CREATIVE_REVIEW_KEY];
  return {
    ...root,
    config: {
      ...nextConfig,
      [CONTINUED_AFTER_CREATIVE_REVIEW_KEY]: true,
      continued_after_creative_review_at: args.at,
      ...(args.by ? { continued_after_creative_review_by: args.by } : {}),
    },
  };
}

/**
 * Clear the Continue flag (rollback when Continue fails before dispatch setup).
 */
export function clearContinuedAfterCreativeReview(
  requestedConfig: unknown,
): Record<string, unknown> {
  const root = asRecord(requestedConfig) ?? {};
  const prevConfig = asRecord(root.config) ?? {};
  const nextConfig = { ...prevConfig };
  delete nextConfig[CONTINUED_AFTER_CREATIVE_REVIEW_KEY];
  delete nextConfig.continued_after_creative_review_at;
  delete nextConfig.continued_after_creative_review_by;
  delete nextConfig[AWAITING_TEXT_TO_VIDEO_CREATIVE_REVIEW_KEY];
  return {
    ...root,
    config: nextConfig,
  };
}
