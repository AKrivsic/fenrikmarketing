import {
  buildCreativeCandidatePromptBlock,
  buildCreativeDnaPromptBlockFromPlan,
  creativeCandidateFieldsForPersistence,
} from "@/lib/creative-candidates/promptBlocks";
import type { CreativeCandidatePlan } from "@/lib/creative-candidates/types";
import type { CreativeDnaDiagnostics } from "@/lib/creative-candidates/creativeDNA";
import {
  CREATIVE_ENGINE_V3_VERSION,
  type CreativeEngineV3Telemetry,
} from "@/lib/creative-engine-v3/types";

export function creativeEngineV3FieldsForPersistence(args: {
  telemetry: CreativeEngineV3Telemetry;
  plan: CreativeCandidatePlan | null;
  dnaDiagnostics?: CreativeDnaDiagnostics | null;
}): Record<string, unknown> {
  const engineDoc = {
    version: CREATIVE_ENGINE_V3_VERSION,
    brief_digest: args.telemetry.brief_digest,
    direction_attempts: args.telemetry.direction_attempts,
    direction_eval_attempts: args.telemetry.direction_eval_attempts,
    ideation_attempts: args.telemetry.ideation_attempts,
    critic_attempts: args.telemetry.critic_attempts,
    dna_repair_attempts: args.telemetry.dna_repair_attempts,
    directions_generated: args.telemetry.directions_generated,
    directions_selected: args.telemetry.directions_selected,
    direction_evaluation: args.telemetry.direction_evaluation,
    direction_memory_filter_passes:
      args.telemetry.direction_memory_filter_passes,
    memory_filter_fallback_all_rejected:
      args.telemetry.memory_filter_fallback_all_rejected,
    concepts_generated: args.telemetry.concepts_generated,
    rejected: args.telemetry.rejected,
    evaluation: args.telemetry.evaluation,
    winner_concept_id: args.telemetry.winner_concept_id,
    fingerprint: args.telemetry.fingerprint,
    models: args.telemetry.models,
    errors: args.telemetry.errors,
  };

  const candidateFields = args.plan
    ? creativeCandidateFieldsForPersistence(args.plan, args.dnaDiagnostics)
    : {};

  return {
    ...candidateFields,
    creative_engine: engineDoc,
  };
}

export function buildV3PromptBlocks(plan: CreativeCandidatePlan): {
  promptBlock: string;
  dnaPromptBlock: string;
} {
  return {
    promptBlock: buildCreativeCandidatePromptBlock(plan),
    dnaPromptBlock: buildCreativeDnaPromptBlockFromPlan(plan),
  };
}
