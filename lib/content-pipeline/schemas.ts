import {
  vNonEmptyString,
  vObject,
  type Infer,
} from "@/lib/ai/validateAiOutput";

const visualDirectionSchema = vObject({
  art_direction: vNonEmptyString(),
  lighting: vNonEmptyString(),
  palette: vNonEmptyString(),
  environment: vNonEmptyString(),
  camera_style: vNonEmptyString(),
  character_style: vNonEmptyString(),
});

export const videoConceptSchema = vObject({
  title: vNonEmptyString(),
  core_idea: vNonEmptyString(),
  narrative_arc: vNonEmptyString(),
  emotional_tone: vNonEmptyString(),
  audience_insight: vNonEmptyString(),
  product_role: vNonEmptyString(),
  why_it_works: vNonEmptyString(),
  visual_direction: visualDirectionSchema,
});

export const openingImpactSchema = vObject({
  first_image: vNonEmptyString(),
  first_spoken_sentence: vNonEmptyString(),
  emotion: vNonEmptyString(),
  pacing: vNonEmptyString(),
  attention_pattern: vNonEmptyString(),
});

export type VideoConceptOutput = Infer<typeof videoConceptSchema>;
export type OpeningImpactOutput = Infer<typeof openingImpactSchema>;
