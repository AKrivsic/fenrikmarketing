import {
  vArray,
  vNonEmptyString,
  vNumber,
  vObject,
  type Validator,
  type ValidationIssue,
} from "@/lib/ai/validateAiOutput";
import {
  CREATIVE_DIRECTION_VERSION,
  DIRECTION_GEN_MAX,
  DIRECTION_GEN_MIN,
  type CreativeDirection,
  type CreativeDirectionGenerationResult,
} from "@/lib/creative-engine-v3/types";

const directionValidator = vObject({
  direction_id: vNonEmptyString(),
  label: vNonEmptyString(),
  mechanism: vNonEmptyString(),
  why_fits: vNonEmptyString(),
  diversity_note: vNonEmptyString(),
  anti_repetition_note: vNonEmptyString(),
});

function adaptiveDirectionsValidator(): Validator<CreativeDirection[]> {
  return (value, path = "$") => {
    const base = vArray(directionValidator, { min: DIRECTION_GEN_MIN })(
      value,
      path,
    );
    if (!Array.isArray(value)) return base;
    if (value.length > DIRECTION_GEN_MAX) {
      return [
        ...base,
        {
          path,
          message: `expected at most ${DIRECTION_GEN_MAX} directions, got ${value.length}`,
        },
      ];
    }
    return base;
  };
}

export const creativeDirectionGenerationValidator: Validator<CreativeDirectionGenerationResult> =
  vObject({
    version: vNonEmptyString(),
    directions: adaptiveDirectionsValidator(),
  });

export function validateCreativeDirectionGeneration(
  value: unknown,
):
  | { ok: true; value: CreativeDirectionGenerationResult }
  | { ok: false; issues: ValidationIssue[] } {
  const issues = creativeDirectionGenerationValidator(value);
  if (issues.length > 0) return { ok: false, issues };
  const raw = value as CreativeDirectionGenerationResult;
  return {
    ok: true,
    value: {
      version: CREATIVE_DIRECTION_VERSION,
      directions: raw.directions,
    },
  };
}

export const CREATIVE_DIRECTION_EXPECTED_SHAPE = `{
  "version": "creative-direction@1",
  "directions": [ /* adaptive ${DIRECTION_GEN_MIN}-${DIRECTION_GEN_MAX} abstract mechanisms */ {
    "direction_id": "d1",
    "label": "short invented mechanism name",
    "mechanism": "abstract communication mechanism — NOT a story, hook, or scene",
    "why_fits": "why this mechanism fits product/strategy/funnel/audience",
    "diversity_note": "how this differs from the other directions you invented",
    "anti_repetition_note": "how this avoids recent direction memory"
  } ]
}`;

export function clampDirectionScores(
  n: number,
  min = 0,
  max = 10,
): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

export { vNumber };
