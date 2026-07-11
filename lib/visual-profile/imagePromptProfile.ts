import type { VisualProfile } from "@/lib/visual-profile/visualProfile";
import { tokensForVisualProfile } from "@/lib/visual-profile/visualProfileTokens";

export const VISUAL_PROFILE_PROMPT_HEADER = "PROJECT VISUAL PROFILE";

export function visualProfileImagePromptBlock(profile: VisualProfile): string {
  const tokens = tokensForVisualProfile(profile);
  return [
    `${VISUAL_PROFILE_PROMPT_HEADER} (${profile} — treatment only, never copy or claims):`,
    `- ${tokens.imagePromptStyle}`,
    "- Apply this to lighting, composition and mood only.",
    "- Do NOT change product facts, features, environments, or messaging.",
    "- Do NOT add luxury positioning, fake UI, or readable text.",
    "- Scene meaning and Project Brain truth constraints still override style.",
  ].join("\n");
}

/** Worker-side suffix before sanitization (concrete, non-marketing). */
export function visualProfileImagePromptSuffix(profile: VisualProfile): string {
  return tokensForVisualProfile(profile).imagePromptStyle;
}
