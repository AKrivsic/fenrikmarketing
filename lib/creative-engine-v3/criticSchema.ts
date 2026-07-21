import {
  vArray,
  vNonEmptyString,
  vNumber,
  vObject,
  vString,
  type Validator,
  type ValidationIssue,
} from "@/lib/ai/validateAiOutput";
import {
  CREATIVE_EVALUATION_VERSION,
  type ConceptEvaluationResult,
  type ConceptScoreCard,
} from "@/lib/creative-engine-v3/types";

const scoreCardValidator = vObject({
  stop_scroll: vNumber({ min: 0, max: 10 }),
  originality: vNumber({ min: 0, max: 10 }),
  memorability: vNumber({ min: 0, max: 10 }),
  strategy_fit: vNumber({ min: 0, max: 10 }),
  funnel_fit: vNumber({ min: 0, max: 10 }),
  product_relevance: vNumber({ min: 0, max: 10 }),
  natural_product_integration: vNumber({ min: 0, max: 10 }),
  narrative_coherence: vNumber({ min: 0, max: 10 }),
  visual_distinctness: vNumber({ min: 0, max: 10 }),
  emotional_strength: vNumber({ min: 0, max: 10 }),
  production_feasibility: vNumber({ min: 0, max: 10 }),
  anti_repetition: vNumber({ min: 0, max: 10 }),
  atmosphere_freshness: vNumber({ min: 0, max: 10 }),
});

const evaluationEntryValidator = vObject({
  concept_id: vNonEmptyString(),
  scores: scoreCardValidator,
  vetoes: vArray(vString()),
  critic_notes: vString(),
});

export const conceptEvaluationResultValidator: Validator<
  Omit<ConceptEvaluationResult, "source">
> = vObject({
  version: vNonEmptyString(),
  evaluations: vArray(evaluationEntryValidator, { min: 1 }),
  ranking: vArray(vNonEmptyString(), { min: 1 }),
  winner_id: vNonEmptyString(),
  winner_reason: vNonEmptyString(),
});

export function validateConceptEvaluationResult(
  value: unknown,
  allowedIds: readonly string[],
):
  | { ok: true; value: ConceptEvaluationResult }
  | { ok: false; issues: ValidationIssue[] } {
  const issues = conceptEvaluationResultValidator(value);
  if (issues.length > 0) return { ok: false, issues };
  const raw = value as Omit<ConceptEvaluationResult, "source">;
  const idSet = new Set(allowedIds);
  if (!idSet.has(raw.winner_id)) {
    return {
      ok: false,
      issues: [
        {
          path: "$.winner_id",
          message: `winner_id ${raw.winner_id} not in surviving concepts`,
        },
      ],
    };
  }
  for (const id of raw.ranking) {
    if (!idSet.has(id)) {
      return {
        ok: false,
        issues: [
          {
            path: "$.ranking",
            message: `ranking contains unknown id ${id}`,
          },
        ],
      };
    }
  }
  return {
    ok: true,
    value: {
      ...raw,
      version: CREATIVE_EVALUATION_VERSION,
      source: "critic",
    },
  };
}

export const CREATIVE_EVALUATION_EXPECTED_SHAPE = `{
  "version": "creative-evaluation@1",
  "evaluations": [{
    "concept_id": "c1",
    "scores": {
      "stop_scroll": 0-10,
      "originality": 0-10,
      "memorability": 0-10,
      "strategy_fit": 0-10,
      "funnel_fit": 0-10,
      "product_relevance": 0-10,
      "natural_product_integration": 0-10,
      "narrative_coherence": 0-10,
      "visual_distinctness": 0-10,
      "emotional_strength": 0-10,
      "production_feasibility": 0-10,
      "anti_repetition": 0-10,
      "atmosphere_freshness": 0-10
    },
    "vetoes": [],
    "critic_notes": "..."
  }],
  "ranking": ["best_id", "..."],
  "winner_id": "...",
  "winner_reason": "..."
}`;

export const SCORE_DIMENSIONS: (keyof ConceptScoreCard)[] = [
  "stop_scroll",
  "originality",
  "memorability",
  "strategy_fit",
  "funnel_fit",
  "product_relevance",
  "natural_product_integration",
  "narrative_coherence",
  "visual_distinctness",
  "emotional_strength",
  "production_feasibility",
  "anti_repetition",
  "atmosphere_freshness",
];

/** Equal-weight total — stop_scroll cannot alone crown a winner. */
export function equalWeightTotal(scores: ConceptScoreCard): number {
  let sum = 0;
  for (const k of SCORE_DIMENSIONS) sum += scores[k];
  return sum;
}
