import type { VisualProfile } from "@/lib/visual-profile/visualProfile";
import type { CreativeIdentityDimension } from "@/lib/creative-identity/types";

export interface DimensionOption {
  id: string;
  /** Short phrase merged into image prompts / identity block. */
  prompt: string;
  /** When set, option is allowed only for these profiles. */
  profiles?: readonly VisualProfile[];
  /** Exclude for these project.type values. */
  excludeProjectTypes?: readonly string[];
}

export const CREATIVE_IDENTITY_DIMENSIONS: readonly CreativeIdentityDimension[] = [
  "environment",
  "mood",
  "lighting",
  "camera",
  "composition",
  "human_presence",
  "color_feel",
] as const;

export const DIMENSION_CATALOG: Record<
  CreativeIdentityDimension,
  readonly DimensionOption[]
> = {
  environment: [
    { id: "home_kitchen", prompt: "a home kitchen with everyday realism" },
    { id: "home_office_nook", prompt: "a small home office nook" },
    { id: "neighborhood_cafe", prompt: "a quiet neighborhood café corner" },
    { id: "co_working_daylight", prompt: "a bright co-working space in daylight" },
    { id: "urban_street_soft", prompt: "a soft-focus urban street exterior" },
    { id: "quiet_studio", prompt: "a clean, quiet studio-like interior" },
    {
      id: "small_retail_floor",
      prompt: "a small retail floor with natural foot traffic distance",
      excludeProjectTypes: ["saas", "software"],
    },
    { id: "maker_workbench", prompt: "a maker workbench with tools and materials" },
  ],
  mood: [
    { id: "focused_calm", prompt: "focused calm" },
    { id: "quietly_tense", prompt: "quiet tension before a decision" },
    { id: "relieved", prompt: "subtle relief after friction" },
    { id: "curious", prompt: "curious, alert attention" },
    { id: "determined", prompt: "determined, forward-leaning energy" },
    { id: "reflective", prompt: "reflective, thoughtful pause" },
    {
      id: "urgent_controlled",
      prompt: "controlled urgency without chaos",
      profiles: ["BOLD", "EDITORIAL"],
    },
    { id: "optimistic", prompt: "quiet optimism" },
  ],
  lighting: [
    { id: "soft_window_daylight", prompt: "soft natural window daylight" },
    { id: "overcast_diffused", prompt: "overcast diffused daylight" },
    { id: "warm_late_afternoon", prompt: "warm late-afternoon side light" },
    { id: "cool_morning", prompt: "cool clear morning light" },
    { id: "bright_even_indoor", prompt: "bright, even indoor illumination" },
    { id: "gentle_side_light", prompt: "gentle side lighting with soft shadows" },
    { id: "open_shade_outdoor", prompt: "open shade outdoor light" },
    {
      id: "low_contrast_flat",
      prompt: "low-contrast, flat documentary lighting",
      profiles: ["MINIMAL", "NATURAL"],
    },
  ],
  camera: [
    { id: "eye_level_medium", prompt: "eye-level medium shot" },
    { id: "slightly_above_table", prompt: "slightly above table height" },
    { id: "over_shoulder", prompt: "over-the-shoulder framing" },
    { id: "close_detail", prompt: "close detail on hands or objects" },
    { id: "wide_environmental", prompt: "wide environmental framing" },
    { id: "three_quarter", prompt: "three-quarter angle on the subject" },
    {
      id: "shallow_depth",
      prompt: "shallow depth of field on the primary subject",
      profiles: ["EDITORIAL", "PREMIUM", "BOLD"],
    },
    { id: "static_documentary", prompt: "static documentary framing" },
  ],
  composition: [
    {
      id: "subject_left_third",
      prompt: "subject placed on the left third with breathing room",
    },
    {
      id: "centered_headroom",
      prompt: "centered subject with generous vertical headroom",
      profiles: ["MINIMAL", "NATURAL", "PREMIUM"],
    },
    { id: "layered_depth", prompt: "layered depth with foreground and background" },
    { id: "tight_crop_hands", prompt: "tight crop on hands and workspace" },
    {
      id: "wide_negative_space",
      prompt: "wide frame with intentional negative space",
      profiles: ["MINIMAL", "NATURAL"],
    },
    {
      id: "diagonal_leading",
      prompt: "diagonal leading lines toward the subject",
      profiles: ["BOLD", "EDITORIAL"],
    },
    { id: "foreground_frame", prompt: "foreground framing element (door, shelf, plant)" },
    { id: "symmetrical_calm", prompt: "symmetrical, calm composition" },
  ],
  human_presence: [
    { id: "single_partial", prompt: "a single person, partial body, face not dominant" },
    { id: "hands_only", prompt: "hands and workspace only, no face" },
    { id: "silhouette_back", prompt: "person seen from behind or as silhouette" },
    {
      id: "no_people",
      prompt: "no people visible — objects and environment tell the story",
      profiles: ["MINIMAL", "NATURAL"],
    },
    { id: "two_at_distance", prompt: "two people at conversational distance, not posed" },
    {
      id: "person_small_in_frame",
      prompt: "person small in frame within a larger environment",
    },
    { id: "implied_offscreen", prompt: "implied human presence just off-screen" },
    { id: "face_not_visible", prompt: "face intentionally not visible" },
  ],
  color_feel: [
    { id: "warm_neutral", prompt: "warm neutral color feel" },
    { id: "cool_neutral", prompt: "cool neutral color feel" },
    { id: "muted_earth", prompt: "muted earth tones" },
    {
      id: "soft_pastel",
      prompt: "soft pastel accents, restrained saturation",
      profiles: ["MINIMAL", "NATURAL", "PREMIUM"],
    },
    { id: "natural_greens", prompt: "natural greens from plants or outdoor context" },
    { id: "urban_gray_blue", prompt: "urban gray-blue ambient palette" },
    { id: "warm_wood", prompt: "warm wood surfaces and amber highlights" },
    {
      id: "restrained_monochrome",
      prompt: "restrained near-monochrome palette",
      profiles: ["MINIMAL", "EDITORIAL"],
    },
  ],
};
