import { PRICING_VERSION } from "@/lib/ai/telemetry/cost";
import {
  PIPELINE_TELEMETRY_VERSION,
  type GenerationTelemetryDocument,
  type PipelineTelemetryStep,
} from "@/lib/ai/telemetry/types";

/**
 * Merge detailed steps into generation_telemetry while preserving legacy fields
 * (phases, fidelity counters, etc.).
 */
export function buildGenerationTelemetryDocument(args: {
  legacy?: Record<string, unknown>;
  steps: readonly PipelineTelemetryStep[];
}): GenerationTelemetryDocument & Record<string, unknown> {
  const legacy = args.legacy ?? {};
  const phases = Array.isArray(legacy.phases)
    ? (legacy.phases as Array<Record<string, unknown>>)
    : [];

  return {
    ...legacy,
    version: PIPELINE_TELEMETRY_VERSION,
    pricing_version:
      typeof legacy.pricing_version === "string"
        ? legacy.pricing_version
        : PRICING_VERSION,
    phases,
    steps: [...args.steps],
  };
}
