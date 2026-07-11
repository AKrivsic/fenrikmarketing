import type { ChecklistBrandTokens } from "@/lib/scene-types/checklist/brandTokens";
import {
  tokensForVisualProfile,
  type VisualProfileTokens,
} from "@/lib/visual-profile/visualProfileTokens";
import type { VisualProfile } from "@/lib/visual-profile/visualProfile";

export interface RenderBrandTokens extends ChecklistBrandTokens {
  textScaleMultiplier: number;
  accentOpacity: number;
  cornerRadius: number;
  markerScale: number;
}

function spacingScale(density: VisualProfileTokens["spacingDensity"]): number {
  if (density === "airy") return 1.14;
  if (density === "tight") return 0.9;
  return 1;
}

function logoScale(prominence: VisualProfileTokens["logoProminence"]): number {
  if (prominence === "subtle") return 0.86;
  if (prominence === "prominent") return 1.14;
  return 1;
}

function cornerRadius(style: VisualProfileTokens["cornerStyle"]): number {
  return style === "sharp" ? 10 : 16;
}

export function applyProfileToBrandTokens(
  base: ChecklistBrandTokens,
  profile: VisualProfile,
): RenderBrandTokens {
  const tokens = tokensForVisualProfile(profile);
  const space = spacingScale(tokens.spacingDensity);
  const logo = logoScale(tokens.logoProminence);

  return {
    ...base,
    marginX: Math.round(base.marginX * space),
    marginTop: Math.round(base.marginTop * space),
    contentBottomY: Math.round(base.contentBottomY - (space - 1) * 40),
    logoMaxWidth: Math.round(base.logoMaxWidth * logo),
    logoMaxHeight: Math.round(base.logoMaxHeight * logo),
    textScaleMultiplier: tokens.textScale,
    accentOpacity: Math.min(1, Math.max(0.55, tokens.accentIntensity)),
    cornerRadius: cornerRadius(tokens.cornerStyle),
    markerScale: tokens.contrastLevel === "high" ? 1.12 : 1,
  };
}
