export type GenerationMode = "production" | "sample";

export const DEFAULT_GENERATION_MODE: GenerationMode = "production";

/** Normalizes API / config input. Unknown values fall back to production. */
export function parseGenerationMode(raw: unknown): GenerationMode {
  if (raw === "sample") return "sample";
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
