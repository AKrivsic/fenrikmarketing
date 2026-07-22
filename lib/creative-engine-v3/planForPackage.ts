/**
 * Creative Engine v3 orchestrator.
 * Brief → Directions → Direction eval → Concepts (adaptive) → vetoes → Critic → DNA
 * Never falls back to Divergence / template banks.
 */

import type { TextProvider } from "@/lib/ai/types";
import type { AssetRef } from "@/lib/ai/prompts/generateContentPackage";
import type { AntiRepetitionMemory, FunnelStage } from "@/lib/ai/types";
import type { Project } from "@/lib/supabase/types";
import { buildCreativeDnaDiagnostics } from "@/lib/creative-candidates/planForPackage";
import {
  buildCreativeBrief,
  creativeBriefDigest,
} from "@/lib/creative-engine-v3/buildCreativeBrief";
import { repairWinnerCreativeDna } from "@/lib/creative-engine-v3/dnaRepair";
import {
  buildV3PromptBlocks,
  creativeEngineV3FieldsForPersistence,
} from "@/lib/creative-engine-v3/persistence";
import { runCreativeCritic } from "@/lib/creative-engine-v3/runCritic";
import { runCreativeIdeation } from "@/lib/creative-engine-v3/runIdeation";
import { runCreativeDirectionGeneration } from "@/lib/creative-engine-v3/runDirections";
import {
  filterDirectionsAgainstMemory,
  runCreativeDirectionEvaluation,
} from "@/lib/creative-engine-v3/runDirectionEvaluation";
import {
  buildCandidatePlanFromV3,
  mapInventedConceptToCandidate,
  pickWinnerConcept,
  resolveModelDnaForConcept,
} from "@/lib/creative-engine-v3/mapToCandidate";
import {
  CREATIVE_ENGINE_V3_VERSION,
  type CreativeDirection,
  type CreativeEngineV3PlanResult,
  type CreativeEngineV3Telemetry,
  type InventedCreativeConcept,
} from "@/lib/creative-engine-v3/types";
import {
  formatRejectionAppendix,
  vetoInventedConcepts,
} from "@/lib/creative-engine-v3/vetoes";

export interface PlanCreativeEngineV3Input {
  project: Project;
  projectId: string;
  topic: string;
  angle?: string | null;
  funnelStage: FunnelStage;
  platform: string;
  format: string;
  ctaHint?: string | null;
  productionRunId?: string | null;
  packageIndex?: number | null;
  packageCount?: number | null;
  painPointFocus?: string | null;
  siblingAngles?: readonly string[];
  assets: readonly AssetRef[];
  ppd?: {
    presentationClass?: string | null;
    revealCeiling?: string | null;
    authenticAssetAvailable?: boolean;
  };
  memory: AntiRepetitionMemory;
  textProvider?: TextProvider;
  modelName?: string;
}

function emptyTelemetry(
  digest: CreativeEngineV3Telemetry["brief_digest"],
  model: string,
): CreativeEngineV3Telemetry {
  return {
    version: CREATIVE_ENGINE_V3_VERSION,
    brief_digest: digest,
    direction_attempts: 0,
    direction_eval_attempts: 0,
    ideation_attempts: 0,
    critic_attempts: 0,
    dna_repair_attempts: 0,
    directions_generated: [],
    directions_selected: [],
    direction_evaluation: null,
    direction_memory_filter_passes: [],
    memory_filter_fallback_all_rejected: false,
    concepts_generated: [],
    rejected: [],
    evaluation: null,
    winner_concept_id: null,
    fingerprint: null,
    models: {
      directions: model,
      ideation: model,
      critic: model,
      dna_repair: null,
    },
    errors: [],
  };
}

export async function planCreativeEngineV3ForPackage(
  input: PlanCreativeEngineV3Input,
): Promise<CreativeEngineV3PlanResult> {
  const model =
    input.modelName ?? process.env.ANTHROPIC_MODEL?.trim() ?? "claude-sonnet-4-6";

  const brief = buildCreativeBrief({
    project: input.project,
    topic: input.topic,
    angle: input.angle,
    funnelStage: input.funnelStage,
    platform: input.platform,
    format: input.format,
    ctaHint: input.ctaHint,
    productionRunId: input.productionRunId,
    packageIndex: input.packageIndex,
    packageCount: input.packageCount,
    painPointFocus: input.painPointFocus,
    siblingAngles: input.siblingAngles,
    assets: input.assets,
    ppd: input.ppd,
    memory: input.memory,
    recentFingerprints: input.memory.fingerprints ?? [],
    recentAtmospheres: input.memory.atmospheres ?? [],
  });

  const digest = creativeBriefDigest(brief);
  const telemetry = emptyTelemetry(
    {
      topic: digest.topic,
      funnel_stage: digest.funnel_stage,
      package_index: digest.package_index,
      fingerprint_memory_count: digest.fingerprint_memory_count,
      hook_memory_count: digest.hook_memory_count,
    },
    model,
  );

  const fail = (
    message: string,
    attempts: number,
    extra?: Partial<CreativeEngineV3Telemetry>,
  ): CreativeEngineV3PlanResult => {
    const tel: CreativeEngineV3Telemetry = {
      ...telemetry,
      ...extra,
      errors: [...telemetry.errors, ...(extra?.errors ?? []), message],
    };
    return {
      ok: false,
      error: "generation_failed",
      attempts,
      validationErrors: [{ path: "creative_engine_v3", message }],
      telemetry: tel,
      persistenceFields: creativeEngineV3FieldsForPersistence({
        telemetry: tel,
        plan: null,
      }),
    };
  };

  // --- Directions ---
  let directionGen = await runCreativeDirectionGeneration({
    brief,
    textProvider: input.textProvider,
  });
  telemetry.direction_attempts += directionGen.ok
    ? directionGen.attempts
    : directionGen.attempts;

  if (!directionGen.ok) {
    return fail(
      `direction_generation_failed: ${directionGen.validationErrors.map((e) => e.message).join("; ")}`,
      directionGen.attempts,
      { errors: directionGen.validationErrors.map((e) => e.message) },
    );
  }

  let directionsGenerated = directionGen.value.directions;
  telemetry.directions_generated = directionsGenerated;
  const originalDirections: CreativeDirection[] = [...directionsGenerated];

  let filtered = filterDirectionsAgainstMemory(directionsGenerated, brief);
  telemetry.direction_memory_filter_passes.push({
    pass: 1,
    ...filtered.telemetry,
    fallback_used: false,
  });

  if (filtered.survivors.length < 2) {
    const appendix = filtered.rejected
      .map((r) => `- ${r.direction_id}: ${r.reasons.join(", ")}`)
      .join("\n");
    const second = await runCreativeDirectionGeneration({
      brief,
      rejectionAppendix: appendix || "All prior directions collided with memory.",
      textProvider: input.textProvider,
    });
    telemetry.direction_attempts += second.ok ? second.attempts : second.attempts;
    if (!second.ok) {
      return fail(
        `direction_re_generation_failed: ${second.validationErrors.map((e) => e.message).join("; ")}`,
        telemetry.direction_attempts,
      );
    }
    directionsGenerated = second.value.directions;
    telemetry.directions_generated = directionsGenerated;
    filtered = filterDirectionsAgainstMemory(directionsGenerated, brief);
    telemetry.direction_memory_filter_passes.push({
      pass: 2,
      ...filtered.telemetry,
      fallback_used: false,
    });
  }

  // Memory filter is anti-repetition protection, not a fatal quality gate.
  // If the second pass still yields zero survivors, forward the original
  // generated batch into Direction Evaluation with an explicit warning.
  let directionsForEval = filtered.survivors;
  if (directionsForEval.length === 0) {
    directionsForEval = originalDirections;
    telemetry.memory_filter_fallback_all_rejected = true;
    telemetry.errors.push("memory_filter_fallback_all_rejected");
    const lastPass = telemetry.direction_memory_filter_passes.at(-1);
    if (lastPass) lastPass.fallback_used = true;
  }

  const directionEval = await runCreativeDirectionEvaluation({
    brief,
    directions: directionsForEval,
    textProvider: input.textProvider,
  });
  telemetry.direction_eval_attempts = directionEval.attempts;
  telemetry.direction_evaluation = directionEval.evaluation;

  const selectedIds = directionEval.evaluation.selected_direction_ids;
  const selectedDirections: CreativeDirection[] = selectedIds
    .map((id) => directionsForEval.find((d) => d.direction_id === id))
    .filter((d): d is CreativeDirection => Boolean(d));
  if (selectedDirections.length === 0) {
    return fail(
      "no_directions_selected",
      telemetry.direction_attempts + telemetry.direction_eval_attempts,
      { direction_evaluation: directionEval.evaluation },
    );
  }
  telemetry.directions_selected = selectedDirections;

  // --- Concept ideation under selected directions ---
  let ideation = await runCreativeIdeation({
    brief,
    selectedDirections,
    textProvider: input.textProvider,
    model,
  });
  telemetry.ideation_attempts += ideation.ok ? ideation.attempts : ideation.attempts;

  if (!ideation.ok) {
    return fail(
      `ideation_failed: ${ideation.validationErrors.map((e) => e.message).join("; ")}`,
      telemetry.direction_attempts +
        telemetry.direction_eval_attempts +
        ideation.attempts,
      { errors: ideation.validationErrors.map((e) => e.message) },
    );
  }

  let allConcepts: InventedCreativeConcept[] = ideation.value.concepts;
  telemetry.concepts_generated = allConcepts;

  let { survivors, rejected } = vetoInventedConcepts({
    concepts: allConcepts,
    brief,
  });
  telemetry.rejected = [...rejected];

  if (survivors.length === 0) {
    const appendix = formatRejectionAppendix(rejected);
    const second = await runCreativeIdeation({
      brief,
      selectedDirections,
      rejectionAppendix: appendix,
      textProvider: input.textProvider,
      model,
    });
    telemetry.ideation_attempts += second.ok ? second.attempts : second.attempts;

    if (!second.ok) {
      return fail(
        `re_ideation_failed: ${second.validationErrors.map((e) => e.message).join("; ")}`,
        telemetry.direction_attempts +
          telemetry.direction_eval_attempts +
          telemetry.ideation_attempts,
        {
          concepts_generated: allConcepts,
          rejected,
          errors: second.validationErrors.map((e) => e.message),
        },
      );
    }

    allConcepts = second.value.concepts;
    telemetry.concepts_generated = allConcepts;
    const secondPass = vetoInventedConcepts({ concepts: allConcepts, brief });
    survivors = secondPass.survivors;
    rejected = [...rejected, ...secondPass.rejected];
    telemetry.rejected = rejected;
  }

  if (survivors.length === 0) {
    return fail(
      "all_concepts_vetoed_after_re_ideation",
      telemetry.direction_attempts +
        telemetry.direction_eval_attempts +
        telemetry.ideation_attempts,
      { concepts_generated: allConcepts, rejected },
    );
  }

  // --- Critic ---
  const critic = await runCreativeCritic({
    brief,
    concepts: survivors,
    textProvider: input.textProvider,
  });
  telemetry.critic_attempts = critic.attempts;
  telemetry.evaluation = critic.evaluation;

  if (!critic.evaluation.winner_id) {
    return fail(
      "critic_produced_no_winner",
      telemetry.direction_attempts +
        telemetry.direction_eval_attempts +
        telemetry.ideation_attempts +
        telemetry.critic_attempts,
      {
        concepts_generated: allConcepts,
        rejected,
        evaluation: critic.evaluation,
      },
    );
  }

  const winnerConcept = pickWinnerConcept(survivors, critic.evaluation);
  if (!winnerConcept) {
    return fail(
      "winner_concept_missing",
      telemetry.direction_attempts +
        telemetry.direction_eval_attempts +
        telemetry.ideation_attempts +
        telemetry.critic_attempts,
      { evaluation: critic.evaluation },
    );
  }

  // --- DNA ---
  let dnaResult = resolveModelDnaForConcept(
    winnerConcept,
    input.project.product_is,
  );
  let dna = dnaResult.dna;
  if (!dna || !dnaResult.accept) {
    const repaired = await repairWinnerCreativeDna({
      concept: winnerConcept,
      failureReasons: dnaResult.reasons,
      productIs: input.project.product_is,
      textProvider: input.textProvider,
    });
    telemetry.dna_repair_attempts = repaired.ok
      ? repaired.attempts
      : repaired.attempts;
    telemetry.models.dna_repair = model;
    if (!repaired.ok) {
      return fail(
        `dna_repair_failed: ${dnaResult.reasons.join("; ") || "invalid_dna"}`,
        telemetry.direction_attempts +
          telemetry.direction_eval_attempts +
          telemetry.ideation_attempts +
          telemetry.critic_attempts +
          telemetry.dna_repair_attempts,
        {
          evaluation: critic.evaluation,
          winner_concept_id: winnerConcept.concept_id,
        },
      );
    }
    dna = repaired.dna;
    const recheck = resolveModelDnaForConcept(
      { ...winnerConcept, creative_dna: dna },
      input.project.product_is,
    );
    if (!recheck.accept || !recheck.dna) {
      return fail(
        `dna_inconsistent_after_repair: ${recheck.reasons.join("; ")}`,
        telemetry.direction_attempts +
          telemetry.direction_eval_attempts +
          telemetry.ideation_attempts +
          telemetry.critic_attempts +
          telemetry.dna_repair_attempts,
        { winner_concept_id: winnerConcept.concept_id },
      );
    }
    dna = recheck.dna;
    if (recheck.reasons.length) {
      telemetry.errors.push(`dna_soft_warnings:${recheck.reasons.join("|")}`);
    }
  } else if (dnaResult.reasons.length) {
    telemetry.errors.push(`dna_soft_warnings:${dnaResult.reasons.join("|")}`);
  }

  const selectedCandidate = mapInventedConceptToCandidate(winnerConcept, dna);
  selectedCandidate.conceptFingerprint = winnerConcept.fingerprint;

  const generatedCandidates = survivors.map((c) => {
    const d =
      c.concept_id === winnerConcept.concept_id ? dna! : c.creative_dna;
    const mapped = mapInventedConceptToCandidate(c, d);
    mapped.conceptFingerprint = c.fingerprint;
    return mapped;
  });

  const plan = buildCandidatePlanFromV3({
    winner: selectedCandidate,
    generated: generatedCandidates,
    evaluation: critic.evaluation,
  });

  telemetry.winner_concept_id = winnerConcept.concept_id;
  telemetry.fingerprint = winnerConcept.fingerprint;

  const dnaResolve = {
    dna,
    source: "model" as const,
    fallbackUsed: false,
    fallbackReason: null,
    consistency: { passed: true, violations: [] },
  };

  const dnaDiagnostics = buildCreativeDnaDiagnostics({
    plan,
    identityEnvironmentSuppressed: false,
    validation: { passed: true, violations: [] },
    dnaResolve,
  });

  const blocks = buildV3PromptBlocks(plan);
  const persistenceFields = creativeEngineV3FieldsForPersistence({
    telemetry,
    plan,
    dnaDiagnostics,
  });

  return {
    ok: true,
    plan,
    selectedCandidate,
    telemetry,
    promptBlock: blocks.promptBlock,
    dnaPromptBlock: blocks.dnaPromptBlock,
    persistenceFields,
    dnaResolve,
  };
}
