import {
  vArray,
  vNonEmptyString,
  vObject,
  vOptional,
  vString,
  type Validator,
  type ValidationIssue,
} from "@/lib/ai/validateAiOutput";
import {
  CREATIVE_IDEATION_VERSION,
  TOTAL_CONCEPTS_MAX,
  TOTAL_CONCEPTS_MIN,
  type CreativeIdeationResult,
  type InventedCreativeConcept,
} from "@/lib/creative-engine-v3/types";
import { isValidCreativeDNA } from "@/lib/creative-candidates/creativeDNA";

const fingerprintValidator = vObject({
  core_premise: vNonEmptyString(),
  opening_mechanism: vNonEmptyString(),
  visual_world: vNonEmptyString(),
  hero_object: vNonEmptyString(),
  metaphor: vOptional(vString()),
  emotional_arc: vNonEmptyString(),
  product_mechanism: vNonEmptyString(),
  palette_atmosphere: vNonEmptyString(),
  ending_mechanism: vNonEmptyString(),
  creative_direction: vNonEmptyString(),
});

const atmosphereValidator = vObject({
  time_of_day: vNonEmptyString(),
  palette_intent: vNonEmptyString(),
  lighting_intent: vNonEmptyString(),
});

const dnaValidator: Validator<InventedCreativeConcept["creative_dna"]> = (
  value,
  path = "$",
) => {
  if (!isValidCreativeDNA(value)) {
    return [{ path, message: "expected valid CreativeDNA object" }];
  }
  return [];
};

const conceptValidator = vObject({
  concept_id: vNonEmptyString(),
  direction_id: vNonEmptyString(),
  direction_label: vNonEmptyString(),
  title: vNonEmptyString(),
  central_idea: vNonEmptyString(),
  opening_two_seconds: vNonEmptyString(),
  hook_line: vNonEmptyString(),
  story_progression: vNonEmptyString(),
  visual_world: vNonEmptyString(),
  emotional_mechanism: vNonEmptyString(),
  emotional_tone: vNonEmptyString(),
  pacing: vNonEmptyString(),
  viewpoint: vNonEmptyString(),
  characters_or_hero_objects: vArray(vNonEmptyString(), { min: 1 }),
  product_role: vNonEmptyString(),
  ending_payoff: vNonEmptyString(),
  why_stops_scroll: vNonEmptyString(),
  funnel_fit_note: vNonEmptyString(),
  production_risks: vArray(vString()),
  atmosphere: atmosphereValidator,
  fingerprint: fingerprintValidator,
  creative_dna: dnaValidator,
});

function adaptiveConceptsValidator(): Validator<InventedCreativeConcept[]> {
  return (value, path = "$") => {
    const base = vArray(conceptValidator, { min: TOTAL_CONCEPTS_MIN })(
      value,
      path,
    );
    if (!Array.isArray(value)) return base;
    if (value.length > TOTAL_CONCEPTS_MAX) {
      return [
        ...base,
        {
          path,
          message: `expected at most ${TOTAL_CONCEPTS_MAX} concepts, got ${value.length}`,
        },
      ];
    }
    return base;
  };
}

export const creativeIdeationResultValidator: Validator<CreativeIdeationResult> =
  vObject({
    version: vNonEmptyString(),
    concepts: adaptiveConceptsValidator(),
  });

export function validateCreativeIdeationResult(
  value: unknown,
  opts?: { requiredDirectionIds?: readonly string[] },
): { ok: true; value: CreativeIdeationResult } | { ok: false; issues: ValidationIssue[] } {
  const issues = creativeIdeationResultValidator(value);
  if (issues.length > 0) return { ok: false, issues };
  const raw = value as CreativeIdeationResult;

  if (opts?.requiredDirectionIds?.length) {
    const covered = new Set(raw.concepts.map((c) => c.direction_id));
    for (const id of opts.requiredDirectionIds) {
      if (!covered.has(id)) {
        return {
          ok: false,
          issues: [
            {
              path: "$.concepts",
              message: `missing concepts for selected direction_id ${id}`,
            },
          ],
        };
      }
    }
  }

  const concepts = raw.concepts.map((c) => ({
    ...c,
    fingerprint: {
      ...c.fingerprint,
      metaphor:
        c.fingerprint.metaphor && String(c.fingerprint.metaphor).trim()
          ? String(c.fingerprint.metaphor).trim()
          : null,
      creative_direction:
        (c.fingerprint.creative_direction || c.direction_label || "").trim() ||
        c.direction_label,
    },
  }));

  return {
    ok: true,
    value: {
      version: CREATIVE_IDEATION_VERSION,
      concepts,
    },
  };
}

export const CREATIVE_IDEATION_EXPECTED_SHAPE = `{
  "version": "creative-ideation@2",
  "concepts": [ /* adaptive ${TOTAL_CONCEPTS_MIN}-${TOTAL_CONCEPTS_MAX}; 2-4 per selected direction */ {
    "concept_id": "c1",
    "direction_id": "d1",
    "direction_label": "...",
    "title": "...",
    "central_idea": "...",
    "opening_two_seconds": "...",
    "hook_line": "...",
    "story_progression": "...",
    "visual_world": "...",
    "emotional_mechanism": "...",
    "emotional_tone": "...",
    "pacing": "...",
    "viewpoint": "...",
    "characters_or_hero_objects": ["..."],
    "product_role": "...",
    "ending_payoff": "...",
    "why_stops_scroll": "...",
    "funnel_fit_note": "...",
    "production_risks": ["..."],
    "atmosphere": { "time_of_day": "...", "palette_intent": "...", "lighting_intent": "..." },
    "fingerprint": {
      "core_premise": "...",
      "opening_mechanism": "...",
      "visual_world": "...",
      "hero_object": "...",
      "metaphor": null,
      "emotional_arc": "...",
      "product_mechanism": "...",
      "palette_atmosphere": "...",
      "ending_mechanism": "...",
      "creative_direction": "must match this concept's direction mechanism/label"
    },
    "creative_dna": {
      "world": "...",
      "mainCharacter": "...",
      "coreConflict": "...",
      "productRole": "...",
      "viewerQuestion": "...",
      "endingIntent": "...",
      "immutableRules": ["...", "...", "..."]
    }
  } ]
}`;
