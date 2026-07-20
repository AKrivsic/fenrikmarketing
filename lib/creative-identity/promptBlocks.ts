import {
  CREATIVE_IDENTITY_VERSION,
  type CreativeIdentity,
} from "@/lib/creative-identity/types";

export const CREATIVE_IDENTITY_PROMPT_HEADER = "CREATIVE IDENTITY";

export function buildCreativeIdentityPromptBlock(
  identity: CreativeIdentity,
  recentIdentityKeys: readonly string[],
  opts?: {
    /** When true, environment is treatment-inside-DNA-world wording. */
    dnaWorldTreatment?: boolean;
  },
): string {
  const avoid =
    recentIdentityKeys.length > 0
      ? [
          "",
          "Recent packages in this series already used these identity combinations — pick staging that feels different while keeping the resolved identity below:",
          ...recentIdentityKeys.slice(0, 6).map((k) => `- ${k.slice(0, 160)}`),
          "Your resolved identity for THIS package is fixed; vary scene subjects and props, not these seven axes.",
        ]
      : [];

  const environmentLine = opts?.dnaWorldTreatment
    ? `- Environment (treatment only — stay inside Creative DNA world): ${identity.environment}`
    : "- Environment: " + identity.environment;

  const rules = opts?.dnaWorldTreatment
    ? [
        "Rules:",
        "- Apply the following visual treatment inside the canonical Creative DNA world.",
        "- Do NOT inject a different physical setting; Creative DNA.world is the mandatory location.",
        "- Creative Identity controls style, camera, color, composition, lighting, visual language — NEVER location, environment, main event, or openingSituation.",
        "- Every image_prompt must express this SAME lighting/camera/composition/color treatment while depicting each beat's narrative subject in the DNA world.",
        "- Scene meaning and Project Brain truth constraints override staging; identity adjusts HOW it looks, not WHAT the product is.",
        "- VISUAL NARRATIVE (when present above) decides WHAT carries meaning; identity decides how that world is lit, framed, and colored.",
        "- PROJECT VISUAL PROFILE still applies on top (treatment only).",
      ]
    : [
        "Rules:",
        "- Creative Identity controls style, camera, color, composition, lighting, visual language — NEVER location, environment, main event, or openingSituation.",
        "- When a Creative Candidate openingSituation / DNA world is present, stay inside that world; identity is treatment only.",
        "- Every image_prompt must express this SAME identity treatment while depicting each beat's narrative subject.",
        "- Scene meaning and Project Brain truth constraints override staging; identity adjusts HOW it looks, not WHAT the product is.",
        "- VISUAL NARRATIVE (when present above) decides WHAT carries meaning; identity decides how that world is lit, framed, and colored.",
        "- PROJECT VISUAL PROFILE still applies on top (treatment only).",
        "- Do not revert to interchangeable stock staging unless the beat requires it.",
      ];

  return [
    `${CREATIVE_IDENTITY_PROMPT_HEADER} (${CREATIVE_IDENTITY_VERSION} — one identity for ALL image_prompts in this package):`,
    environmentLine,
    "- Mood: " + identity.mood,
    "- Lighting: " + identity.lighting,
    "- Camera: " + identity.camera,
    "- Composition: " + identity.composition,
    "- Human presence: " + identity.human_presence,
    "- Color feel: " + identity.color_feel,
    "",
    ...rules,
    ...avoid,
  ].join("\n");
}

/** Worker-side suffix appended to each AI image prompt (stable within the video). */
export function creativeIdentityImagePromptSuffix(identity: CreativeIdentity): string {
  return [
    "Creative identity:",
    identity.environment + ";",
    identity.mood + ";",
    identity.lighting + ";",
    identity.camera + ";",
    identity.composition + ";",
    identity.human_presence + ";",
    identity.color_feel + ".",
  ].join(" ");
}

export function creativeIdentityFieldsForPersistence(
  identity: CreativeIdentity,
): Record<string, unknown> {
  return {
    creative_identity: {
      version: identity.version,
      key: identity.key,
      environment: identity.environment,
      mood: identity.mood,
      lighting: identity.lighting,
      camera: identity.camera,
      composition: identity.composition,
      human_presence: identity.human_presence,
      color_feel: identity.color_feel,
      option_ids: identity.option_ids,
    },
  };
}
