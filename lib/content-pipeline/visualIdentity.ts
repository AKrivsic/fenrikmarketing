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

export function visualIdentityPromptBlock(identity: VisualIdentity): string {
  return [
    "VISUAL IDENTITY:",
    `- art_direction: ${identity.art_direction}`,
    `- lighting: ${identity.lighting}`,
    `- palette: ${identity.palette}`,
    `- environment: ${identity.environment}`,
    `- camera_style: ${identity.camera_style}`,
    `- character_style: ${identity.character_style}`,
    `- opening_emotion: ${identity.opening_emotion}`,
    `- opening_first_image: ${identity.opening_first_image}`,
  ].join("\n");
}
