import type { VisualProfile } from "@/lib/visual-profile/visualProfile";

export type ContrastLevel = "low" | "medium" | "high";
export type BackgroundTreatment = "flat" | "soft" | "rich";
export type SpacingDensity = "airy" | "balanced" | "tight";
export type CornerStyle = "soft" | "sharp";
export type LogoProminence = "subtle" | "normal" | "prominent";

export interface VisualProfileTokens {
  contrastLevel: ContrastLevel;
  backgroundTreatment: BackgroundTreatment;
  accentIntensity: number;
  textScale: number;
  spacingDensity: SpacingDensity;
  cornerStyle: CornerStyle;
  logoProminence: LogoProminence;
  imagePromptStyle: string;
}

const PROFILE_TOKENS: Record<VisualProfile, VisualProfileTokens> = {
  NATURAL: {
    contrastLevel: "medium",
    backgroundTreatment: "soft",
    accentIntensity: 0.88,
    textScale: 1,
    spacingDensity: "balanced",
    cornerStyle: "soft",
    logoProminence: "normal",
    imagePromptStyle:
      "Natural lighting, believable setting, candid composition, realistic textures, restrained contrast.",
  },
  MINIMAL: {
    contrastLevel: "low",
    backgroundTreatment: "flat",
    accentIntensity: 0.75,
    textScale: 0.96,
    spacingDensity: "airy",
    cornerStyle: "soft",
    logoProminence: "subtle",
    imagePromptStyle:
      "Clean composition, limited visual clutter, clear subject separation, generous negative space.",
  },
  BOLD: {
    contrastLevel: "high",
    backgroundTreatment: "rich",
    accentIntensity: 1.12,
    textScale: 1.1,
    spacingDensity: "tight",
    cornerStyle: "sharp",
    logoProminence: "prominent",
    imagePromptStyle:
      "Strong visual contrast, clear focal point, energetic composition, saturated but believable accents.",
  },
  EDITORIAL: {
    contrastLevel: "medium",
    backgroundTreatment: "soft",
    accentIntensity: 0.82,
    textScale: 1.02,
    spacingDensity: "balanced",
    cornerStyle: "soft",
    logoProminence: "subtle",
    imagePromptStyle:
      "Editorial photography, controlled composition, refined framing, subtle color treatment.",
  },
  PREMIUM: {
    contrastLevel: "medium",
    backgroundTreatment: "soft",
    accentIntensity: 0.78,
    textScale: 1.04,
    spacingDensity: "airy",
    cornerStyle: "soft",
    logoProminence: "normal",
    imagePromptStyle:
      "Elegant lighting, polished materials, restrained composition, subtle premium atmosphere.",
  },
};

export function tokensForVisualProfile(profile: VisualProfile): VisualProfileTokens {
  return PROFILE_TOKENS[profile];
}
