import type {
  OpeningImpact,
  VideoConcept,
  VisualIdentity,
} from "@/lib/content-pipeline/types";

/**
 * Visual Identity — deterministic assemble from Video Concept + Opening Impact.
 * No LLM call (keeps Step 2 AI count low; artifact still persisted for Step 3 image gen).
 */
export function buildVisualIdentity(args: {
  concept: VideoConcept;
  openingImpact: OpeningImpact;
}): VisualIdentity {
  const { concept, openingImpact } = args;
  const vd = concept.visual_direction;
  return {
    art_direction: vd.art_direction.trim(),
    lighting: vd.lighting.trim(),
    palette: vd.palette.trim(),
    environment: vd.environment.trim(),
    camera_style: vd.camera_style.trim(),
    character_style: vd.character_style.trim(),
    opening_emotion: openingImpact.emotion.trim(),
    opening_first_image: openingImpact.first_image.trim(),
  };
}
