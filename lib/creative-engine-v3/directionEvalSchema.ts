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
  CREATIVE_DIRECTION_EVAL_VERSION,
  DIRECTION_SELECT_MAX,
  DIRECTION_SELECT_MIN,
  type CreativeDirectionEvaluationResult,
  type DirectionScoreCard,
} from "@/lib/creative-engine-v3/types";

const scoreCardValidator = vObject({
  strategy_fit: vNumber({ min: 0, max: 10 }),
  funnel_fit: vNumber({ min: 0, max: 10 }),
  originality: vNumber({ min: 0, max: 10 }),
  diversity_vs_peers: vNumber({ min: 0, max: 10 }),
  anti_repetition: vNumber({ min: 0, max: 10 }),
  concept_potential: vNumber({ min: 0, max: 10 }),
  emotional_range: vNumber({ min: 0, max: 10 }),
  production_feasibility: vNumber({ min: 0, max: 10 }),
});

const entryValidator = vObject({
  direction_id: vNonEmptyString(),
  scores: scoreCardValidator,
  vetoes: vArray(vString()),
  critic_notes: vString(),
});

export const directionEvaluationValidator: Validator<
  Omit<CreativeDirectionEvaluationResult, "source">
> = vObject({
  version: vNonEmptyString(),
  evaluations: vArray(entryValidator, { min: 1 }),
  ranking: vArray(vNonEmptyString(), { min: 1 }),
  selected_direction_ids: vArray(vNonEmptyString(), {
    min: DIRECTION_SELECT_MIN,
  }),
  selection_reason: vNonEmptyString(),
}) as Validator<Omit<CreativeDirectionEvaluationResult, "source">>;

export function validateDirectionEvaluation(
  value: unknown,
  allowedIds: readonly string[],
):
  | { ok: true; value: CreativeDirectionEvaluationResult }
  | { ok: false; issues: ValidationIssue[] } {
  const issues = directionEvaluationValidator(value);
  if (issues.length > 0) return { ok: false, issues };
  const raw = value as Omit<CreativeDirectionEvaluationResult, "source">;
  const idSet = new Set(allowedIds);

  if (
    raw.selected_direction_ids.length < DIRECTION_SELECT_MIN ||
    raw.selected_direction_ids.length > DIRECTION_SELECT_MAX
  ) {
    return {
      ok: false,
      issues: [
        {
          path: "$.selected_direction_ids",
          message: `expected ${DIRECTION_SELECT_MIN}-${DIRECTION_SELECT_MAX} selected directions`,
        },
      ],
    };
  }

  for (const id of raw.selected_direction_ids) {
    if (!idSet.has(id)) {
      return {
        ok: false,
        issues: [
          {
            path: "$.selected_direction_ids",
            message: `unknown direction_id ${id}`,
          },
        ],
      };
    }
  }

  return {
    ok: true,
    value: {
      ...raw,
      version: CREATIVE_DIRECTION_EVAL_VERSION,
      source: "critic",
    },
  };
}

export const DIRECTION_EVAL_EXPECTED_SHAPE = `{
  "version": "creative-direction-eval@1",
  "evaluations": [{
    "direction_id": "d1",
    "scores": {
      "strategy_fit": 0-10,
      "funnel_fit": 0-10,
      "originality": 0-10,
      "diversity_vs_peers": 0-10,
      "anti_repetition": 0-10,
      "concept_potential": 0-10,
      "emotional_range": 0-10,
      "production_feasibility": 0-10
    },
    "vetoes": [],
    "critic_notes": "..."
  }],
  "ranking": ["best_id", "..."],
  "selected_direction_ids": ["id1", "id2"],
  "selection_reason": "..."
}`;

export const DIRECTION_SCORE_KEYS: (keyof DirectionScoreCard)[] = [
  "strategy_fit",
  "funnel_fit",
  "originality",
  "diversity_vs_peers",
  "anti_repetition",
  "concept_potential",
  "emotional_range",
  "production_feasibility",
];

export function directionEqualWeightTotal(scores: DirectionScoreCard): number {
  let sum = 0;
  for (const k of DIRECTION_SCORE_KEYS) sum += scores[k];
  return sum;
}
