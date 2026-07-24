/**
 * Content memory fingerprints (anti-repetition).
 */

/** Legacy Creative Engine fingerprints (still readable from old packages). */
export interface CreativeConceptFingerprint {
  core_premise: string;
  opening_mechanism: string;
  visual_world: string;
  hero_object: string;
  metaphor: string | null;
  emotional_arc: string;
  product_mechanism: string;
  palette_atmosphere: string;
  ending_mechanism: string;
  /** Abstract communication mechanism label for anti-repetition. */
  creative_direction: string;
}

export const CONTENT_PIPELINE_FINGERPRINT_VERSION =
  "content-pipeline-fingerprint@1" as const;

/** Content Pipeline fingerprints — lightweight idea / world anti-repetition. */
export interface ContentPipelineFingerprint {
  version: typeof CONTENT_PIPELINE_FINGERPRINT_VERSION;
  core_idea: string;
  product_role: string;
  environment: string;
  attention_pattern: string;
  /** Soft label: creative mode id and/or narrative shape. */
  narrative_mechanism: string;
  /** Compact visual world (environment + art direction). */
  visual_world: string;
}
