import type { VisualMedium } from "@/lib/visual-medium/visualMedium";

const MEDIUM_IMAGE_STYLE: Record<VisualMedium, string> = {
  PHOTOGRAPHIC:
    "Photorealistic photographic image, credible materials and natural light.",
  CLEAN_ILLUSTRATION:
    "Clean flat illustration, simplified shapes, soft gradients, not photorealistic.",
  SOFT_3D:
    "Soft polished 3D render, digital product visualization, subtle materials, studio lighting, not toy-like.",
  GRAPHIC_COLLAGE:
    "Clean graphic collage, layered cutout shapes, brand-safe restrained palette.",
  TECHNICAL_BLUEPRINT:
    "Technical blueprint schematic aesthetic, structural lines and diagrams, muted blueprint tones.",
};

export const VISUAL_MEDIUM_PROMPT_HEADER = "VISUAL MEDIUM";

export function visualMediumImagePromptBlock(medium: VisualMedium): string {
  return [
    `${VISUAL_MEDIUM_PROMPT_HEADER} (${medium} — one medium for ALL image_prompts in this package):`,
    `- ${MEDIUM_IMAGE_STYLE[medium]}`,
    "- Apply this representation style to every generated still; do NOT restate the full medium block inside each image_prompt.",
    "- Do NOT request readable text, fake UI labels, metrics, or screenshots with legible words.",
    "- CREATIVE IDENTITY and PROJECT VISUAL PROFILE still apply as treatment within this medium.",
  ].join("\n");
}

/** Worker-side suffix (single line). */
export function visualMediumImagePromptSuffix(medium: VisualMedium): string {
  return MEDIUM_IMAGE_STYLE[medium];
}

export function promptAlreadyContainsMediumSuffix(
  prompt: string,
  medium: VisualMedium,
): boolean {
  const suffix = MEDIUM_IMAGE_STYLE[medium].slice(0, 48).toLowerCase();
  return prompt.toLowerCase().includes(suffix.slice(0, 32));
}
