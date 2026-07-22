import { getCopywritingProvider } from "@/lib/ai/index";
import { generateValidatedJson } from "@/lib/ai/runWithRepair";
import type { TextProvider } from "@/lib/ai/types";
import {
  buildDirectionEvaluationPrompt,
  CREATIVE_DIRECTION_CRITIC_SYSTEM,
} from "@/lib/creative-engine-v3/directionEvalPrompt";
import {
  DIRECTION_EVAL_EXPECTED_SHAPE,
  directionEvaluationValidator,
  validateDirectionEvaluation,
} from "@/lib/creative-engine-v3/directionEvalSchema";
import { deterministicEvaluateDirections } from "@/lib/creative-engine-v3/deterministicDirectionFallback";
import { directionMemoryCollides } from "@/lib/creative-engine-v3/conceptFingerprint";
import type {
  CreativeBrief,
  CreativeDirection,
  CreativeDirectionEvaluationResult,
  DirectionMemoryFilterPassTelemetry,
  DirectionMemoryFilterRejection,
} from "@/lib/creative-engine-v3/types";

export const CREATIVE_DIRECTION_EVAL_MAX_TRANSPORT_ATTEMPTS = 3;

export interface DirectionMemoryFilterResult {
  survivors: CreativeDirection[];
  rejected: DirectionMemoryFilterRejection[];
  telemetry: Omit<DirectionMemoryFilterPassTelemetry, "pass" | "fallback_used">;
}

/**
 * Drop directions that collide with recent memory before evaluation.
 * Uses conservative directionMemoryCollides (not creativeDirectionsCollide).
 */
export function filterDirectionsAgainstMemory(
  directions: readonly CreativeDirection[],
  brief: CreativeBrief,
): DirectionMemoryFilterResult {
  const rejected: DirectionMemoryFilterRejection[] = [];
  const survivors: CreativeDirection[] = [];
  const seenLabels = new Set<string>();

  for (const d of directions) {
    const reasons: string[] = [];
    let matchedMemory: string | null = null;
    let sharedTokens: string[] = [];
    let similarity: number | null = null;
    let collisionKind: DirectionMemoryFilterRejection["collision_kind"] = null;

    const labelKey = d.label.trim().toLowerCase();
    if (seenLabels.has(labelKey)) reasons.push("duplicate_label_in_batch");

    for (const recent of brief.memory.recent_directions) {
      const hit = directionMemoryCollides({
        label: d.label,
        mechanism: d.mechanism,
        memoryItem: recent,
      });
      if (hit.collides) {
        reasons.push("direction_collision_recent_memory");
        matchedMemory = hit.matched_memory_item;
        sharedTokens = hit.shared_tokens;
        similarity = hit.similarity;
        collisionKind = hit.kind;
        break;
      }
    }

    // Story/hook leakage into direction (must stay abstract)
    if (
      /\b(hook|scene|storyboard|voiceover|first frame|opening shot)\b/i.test(
        `${d.label} ${d.mechanism}`,
      )
    ) {
      reasons.push("direction_contains_story_or_hook_language");
    }

    if (reasons.length) {
      rejected.push({
        direction_id: d.direction_id,
        reasons,
        matched_memory_item: matchedMemory,
        shared_tokens: sharedTokens,
        similarity,
        collision_kind: collisionKind,
      });
      continue;
    }
    seenLabels.add(labelKey);
    survivors.push(d);
  }

  return {
    survivors,
    rejected,
    telemetry: {
      generated_count: directions.length,
      survivor_count: survivors.length,
      rejected_count: rejected.length,
      rejected,
    },
  };
}

export async function runCreativeDirectionEvaluation(args: {
  brief: CreativeBrief;
  directions: readonly CreativeDirection[];
  textProvider?: TextProvider;
}): Promise<{
  evaluation: CreativeDirectionEvaluationResult;
  attempts: number;
  usedFallback: boolean;
}> {
  if (args.directions.length === 0) {
    return {
      evaluation: deterministicEvaluateDirections({
        directions: [],
        brief: args.brief,
      }),
      attempts: 0,
      usedFallback: true,
    };
  }

  if (args.directions.length <= 2) {
    return {
      evaluation: {
        version: "creative-direction-eval@1",
        evaluations: args.directions.map((d) => ({
          direction_id: d.direction_id,
          scores: {
            strategy_fit: 7,
            funnel_fit: 7,
            originality: 7,
            diversity_vs_peers: 7,
            anti_repetition: 7,
            concept_potential: 7,
            emotional_range: 7,
            production_feasibility: 7,
          },
          vetoes: [],
          critic_notes: "small pool — keep all survivors",
        })),
        ranking: args.directions.map((d) => d.direction_id),
        selected_direction_ids: args.directions.map((d) => d.direction_id),
        selection_reason: "All surviving directions kept (pool ≤ 2).",
        source: "deterministic_fallback",
      },
      attempts: 0,
      usedFallback: true,
    };
  }

  const provider = args.textProvider ?? getCopywritingProvider();
  const allowedIds = args.directions.map((d) => d.direction_id);
  const prompt = buildDirectionEvaluationPrompt({
    brief: args.brief,
    directions: args.directions,
  });

  let attempts = 0;
  const first = await generateValidatedJson({
    textProvider: provider,
    system: CREATIVE_DIRECTION_CRITIC_SYSTEM,
    prompt,
    validator: directionEvaluationValidator,
    expectedShape: DIRECTION_EVAL_EXPECTED_SHAPE,
    maxAttempts: 2,
    temperature: 0.3,
    maxTokens: 3072,
    timeoutMs: 90_000,
    maxTransportAttempts: CREATIVE_DIRECTION_EVAL_MAX_TRANSPORT_ATTEMPTS,
    telemetry: {
      stepName: "Creative Direction Evaluation",
      inputSummary: `directions=${args.directions.length}`,
    },
  });
  attempts += first.attempts;

  if (first.ok) {
    const checked = validateDirectionEvaluation(first.value, allowedIds);
    if (checked.ok) {
      return { evaluation: checked.value, attempts, usedFallback: false };
    }
  }

  const retry = await generateValidatedJson({
    textProvider: provider,
    system: CREATIVE_DIRECTION_CRITIC_SYSTEM,
    prompt:
      prompt +
      "\n\nPREVIOUS OUTPUT FAILED VALIDATION. selected_direction_ids must be 2–4 ids from: " +
      allowedIds.join(", "),
    validator: directionEvaluationValidator,
    expectedShape: DIRECTION_EVAL_EXPECTED_SHAPE,
    maxAttempts: 2,
    temperature: 0.2,
    maxTokens: 3072,
    timeoutMs: 90_000,
    maxTransportAttempts: CREATIVE_DIRECTION_EVAL_MAX_TRANSPORT_ATTEMPTS,
    telemetry: {
      stepName: "Creative Direction Evaluation Retry",
      repair: true,
      inputSummary: `directions=${args.directions.length}`,
    },
  });
  attempts += retry.attempts;

  if (retry.ok) {
    const checked = validateDirectionEvaluation(retry.value, allowedIds);
    if (checked.ok) {
      return { evaluation: checked.value, attempts, usedFallback: false };
    }
  }

  return {
    evaluation: deterministicEvaluateDirections({
      directions: args.directions,
      brief: args.brief,
    }),
    attempts,
    usedFallback: true,
  };
}
