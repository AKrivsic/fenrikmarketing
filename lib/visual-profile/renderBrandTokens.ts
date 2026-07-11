import type { Json } from "@/lib/supabase/types";
import {
  resolveChecklistBrandTokens,
  type ChecklistBrandTokens,
} from "@/lib/scene-types/checklist/brandTokens";
import type { ScenePresentationStyling } from "@/lib/scene-types/visualScene";
import { applyProfileToBrandTokens } from "@/lib/visual-profile/applyProfileToBrandTokens";
import {
  parseVisualProfile,
  DEFAULT_VISUAL_PROFILE,
  type VisualProfile,
} from "@/lib/visual-profile/visualProfile";

export function resolveRenderBrandTokens(args: {
  knowledge: Json | null | undefined;
  visualProfile?: VisualProfile | null;
  styling?: ScenePresentationStyling;
  payloadBackgroundStyle?: "dark" | "light" | "brand";
}): ReturnType<typeof applyProfileToBrandTokens> {
  const base = resolveChecklistBrandTokens({
    knowledge: args.knowledge,
    styling: args.styling,
    payloadBackgroundStyle: args.payloadBackgroundStyle,
  });
  const profile =
    args.visualProfile && parseVisualProfile(args.visualProfile)
      ? args.visualProfile
      : DEFAULT_VISUAL_PROFILE;
  return applyProfileToBrandTokens(base, profile);
}

export type { ChecklistBrandTokens };
