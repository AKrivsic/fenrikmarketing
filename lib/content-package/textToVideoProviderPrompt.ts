import {
  containsCzechDiacritics,
  hasCzechVisualPrefix,
  type CanonicalVideoScene,
} from "@/lib/content-package/canonicalVideoPlan";
import type { VisualIdentity } from "@/lib/content-pipeline/types";

export const T2V_PROVIDER_PROMPT_NOT_ENGLISH =
  "t2v_provider_prompt_not_english" as const;

export interface TextToVideoContinuityBlock {
  environment?: string;
  palette?: string;
  lighting?: string;
  art_direction?: string;
  camera_style?: string;
  character_style?: string;
}

export function continuityBlockFromVisualIdentity(
  identity: VisualIdentity | null | undefined,
): TextToVideoContinuityBlock | null {
  if (!identity) return null;
  const block: TextToVideoContinuityBlock = {};
  if (identity.environment.trim()) block.environment = identity.environment.trim();
  if (identity.palette.trim()) block.palette = identity.palette.trim();
  if (identity.lighting.trim()) block.lighting = identity.lighting.trim();
  if (identity.art_direction.trim()) {
    block.art_direction = identity.art_direction.trim();
  }
  if (identity.camera_style.trim()) block.camera_style = identity.camera_style.trim();
  if (identity.character_style.trim()) {
    block.character_style = identity.character_style.trim();
  }
  return Object.keys(block).length > 0 ? block : null;
}

function joinContinuity(block: TextToVideoContinuityBlock | null): string {
  if (!block) return "";
  const parts: string[] = [];
  if (block.environment) parts.push(`same environment: ${block.environment}`);
  if (block.palette) parts.push(`shared palette: ${block.palette}`);
  if (block.lighting) parts.push(`shared lighting: ${block.lighting}`);
  if (block.art_direction) parts.push(`shared visual style: ${block.art_direction}`);
  if (block.camera_style) parts.push(`camera: ${block.camera_style}`);
  if (block.character_style) {
    parts.push(`same device or character type if present: ${block.character_style}`);
  }
  if (parts.length === 0) return "";
  return `Continuity guidance (does not guarantee identical faces): ${parts.join("; ")}.`;
}

/**
 * Mechanical Runway prompt from approved English scene + motion + identity.
 * Does not invent story, does not copy voiceover, does not call an LLM.
 */
export function composeTextToVideoProviderPrompt(args: {
  englishVisualIntent?: string;
  /** @deprecated Legacy alias — same as englishVisualIntent. */
  humanVisualIntent?: string;
  motionPrompt?: string | null;
  energyMotion?: string;
  sceneRole?: "opening" | "body" | "closing";
  continuity?: TextToVideoContinuityBlock | null;
  canonicalScene?: Pick<CanonicalVideoScene, "image_prompt"> | null;
}): string {
  const intent = (args.englishVisualIntent ?? args.humanVisualIntent ?? "").trim();
  const motion =
    (args.motionPrompt ?? "").trim() || (args.energyMotion ?? "").trim();
  const lines = [
    "Photoreal marketing video clip, vertical portrait 9:16.",
    intent ? `Scene action: ${intent}` : "",
    args.canonicalScene?.image_prompt
      ? `Still description: ${args.canonicalScene.image_prompt.trim()}`
      : "",
    motion ? `Motion and change: ${motion}` : "",
    joinContinuity(args.continuity ?? null),
    "No character dialogue, no lip-sync, no generated subtitles, captions, or logos in frame.",
    "No readable on-screen text unless it is already approved product UI chrome.",
  ].filter((line) => line.length > 0);
  return lines.join(" ");
}

export function assertProviderPromptIsEnglishProduction(prompt: string): void {
  if (containsCzechDiacritics(prompt) || hasCzechVisualPrefix(prompt)) {
    throw new Error(T2V_PROVIDER_PROMPT_NOT_ENGLISH);
  }
}
