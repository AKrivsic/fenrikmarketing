import { getCopywritingProvider } from "@/lib/ai/index";
import { generateValidatedJson } from "@/lib/ai/runWithRepair";
import type { TextProvider } from "@/lib/ai/types";
import {
  buildCreativeCriticPrompt,
  CREATIVE_CRITIC_SYSTEM,
} from "@/lib/creative-engine-v3/criticPrompt";
import {
  conceptEvaluationResultValidator,
  CREATIVE_EVALUATION_EXPECTED_SHAPE,
  validateConceptEvaluationResult,
} from "@/lib/creative-engine-v3/criticSchema";
import { deterministicEvaluateConcepts } from "@/lib/creative-engine-v3/deterministicCriticFallback";
import type {
  ConceptEvaluationResult,
  CreativeBrief,
  InventedCreativeConcept,
} from "@/lib/creative-engine-v3/types";

export const CREATIVE_CRITIC_MAX_TRANSPORT_ATTEMPTS = 3;
export const CREATIVE_CRITIC_TIMEOUT_MS = 90_000;

export async function runCreativeCritic(args: {
  brief: CreativeBrief;
  concepts: readonly InventedCreativeConcept[];
  textProvider?: TextProvider;
}): Promise<{
  evaluation: ConceptEvaluationResult;
  attempts: number;
  usedFallback: boolean;
}> {
  if (args.concepts.length === 0) {
    return {
      evaluation: deterministicEvaluateConcepts({
        concepts: [],
        brief: args.brief,
      }),
      attempts: 0,
      usedFallback: true,
    };
  }

  if (args.concepts.length === 1) {
    const only = args.concepts[0]!;
    return {
      evaluation: {
        version: "creative-evaluation@1",
        evaluations: [
          {
            concept_id: only.concept_id,
            scores: {
              stop_scroll: 7,
              originality: 7,
              memorability: 7,
              strategy_fit: 7,
              funnel_fit: 7,
              product_relevance: 7,
              natural_product_integration: 7,
              narrative_coherence: 7,
              visual_distinctness: 7,
              emotional_strength: 7,
              production_feasibility: 7,
              anti_repetition: 7,
              atmosphere_freshness: 7,
            },
            vetoes: [],
            critic_notes: "sole survivor after vetoes",
          },
        ],
        ranking: [only.concept_id],
        winner_id: only.concept_id,
        winner_reason: "Only surviving concept after deterministic vetoes.",
        source: "deterministic_fallback",
      },
      attempts: 0,
      usedFallback: true,
    };
  }

  const provider = args.textProvider ?? getCopywritingProvider();
  const allowedIds = args.concepts.map((c) => c.concept_id);
  const prompt = buildCreativeCriticPrompt({
    brief: args.brief,
    concepts: args.concepts,
  });

  // First attempt
  let attempts = 0;
  const first = await generateValidatedJson({
    textProvider: provider,
    system: CREATIVE_CRITIC_SYSTEM,
    prompt,
    validator: conceptEvaluationResultValidator,
    expectedShape: CREATIVE_EVALUATION_EXPECTED_SHAPE,
    maxAttempts: 2,
    temperature: 0.3,
    maxTokens: 4096,
    timeoutMs: CREATIVE_CRITIC_TIMEOUT_MS,
    maxTransportAttempts: CREATIVE_CRITIC_MAX_TRANSPORT_ATTEMPTS,
    telemetry: {
      stepName: "Creative Evaluation",
      inputSummary: `concepts=${args.concepts.length}`,
    },
  });
  attempts += first.attempts;

  if (first.ok) {
    const checked = validateConceptEvaluationResult(first.value, allowedIds);
    if (checked.ok) {
      return { evaluation: checked.value, attempts, usedFallback: false };
    }
  }

  // One critic retry
  const retry = await generateValidatedJson({
    textProvider: provider,
    system: CREATIVE_CRITIC_SYSTEM,
    prompt:
      prompt +
      "\n\nPREVIOUS CRITIC OUTPUT FAILED VALIDATION. Re-score carefully; winner_id must be one of: " +
      allowedIds.join(", "),
    validator: conceptEvaluationResultValidator,
    expectedShape: CREATIVE_EVALUATION_EXPECTED_SHAPE,
    maxAttempts: 2,
    temperature: 0.2,
    maxTokens: 4096,
    timeoutMs: CREATIVE_CRITIC_TIMEOUT_MS,
    maxTransportAttempts: CREATIVE_CRITIC_MAX_TRANSPORT_ATTEMPTS,
    telemetry: {
      stepName: "Creative Evaluation Retry",
      repair: true,
      inputSummary: `concepts=${args.concepts.length}`,
    },
  });
  attempts += retry.attempts;

  if (retry.ok) {
    const checked = validateConceptEvaluationResult(retry.value, allowedIds);
    if (checked.ok) {
      return { evaluation: checked.value, attempts, usedFallback: false };
    }
  }

  return {
    evaluation: deterministicEvaluateConcepts({
      concepts: args.concepts,
      brief: args.brief,
    }),
    attempts,
    usedFallback: true,
  };
}
