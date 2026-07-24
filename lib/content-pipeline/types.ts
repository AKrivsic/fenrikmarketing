/**
 * Content pipeline creative artifacts.
 *
 * Persisted under presentation_generation for Visual Identity → image generation.
 */

export interface VideoConcept {
  title: string;
  core_idea: string;
  narrative_arc: string;
  emotional_tone: string;
  audience_insight: string;
  product_role: string;
  why_it_works: string;
  /** Hints used to assemble Visual Identity without a separate creative LLM. */
  visual_direction: {
    art_direction: string;
    lighting: string;
    palette: string;
    environment: string;
    camera_style: string;
    character_style: string;
  };
}

export interface OpeningImpact {
  first_image: string;
  first_spoken_sentence: string;
  emotion: string;
  pacing: string;
  attention_pattern: string;
}

export interface VisualIdentity {
  art_direction: string;
  lighting: string;
  palette: string;
  environment: string;
  camera_style: string;
  character_style: string;
  /** Echoed from Opening Impact for later image-gen wiring. */
  opening_emotion: string;
  opening_first_image: string;
}

export interface ContentPipelineArtifacts {
  pipeline: "content_pipeline";
  video_concept: VideoConcept;
  opening_impact: OpeningImpact;
  visual_identity: VisualIdentity;
}
