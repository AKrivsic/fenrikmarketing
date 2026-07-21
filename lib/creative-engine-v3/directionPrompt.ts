import type { CreativeBrief } from "@/lib/creative-engine-v3/types";
import {
  DIRECTION_GEN_MAX,
  DIRECTION_GEN_MIN,
} from "@/lib/creative-engine-v3/types";
import { CREATIVE_DIRECTION_EXPECTED_SHAPE } from "@/lib/creative-engine-v3/directionSchema";
import { FUNNEL_STAGE_LABELS } from "@/lib/ai/types";

export const CREATIVE_DIRECTION_SYSTEM = [
  "You invent abstract creative DIRECTIONS for short-form social ads.",
  "A direction is a communication mechanism — how the message could be told.",
  "Directions are NOT stories, NOT hooks, NOT scenes, NOT templates, NOT product pitches.",
  "Invent directions dynamically. Do not choose from any fixed menu.",
  "Respond with a single valid JSON document only.",
].join(" ");

function directionMemoryLines(brief: CreativeBrief): string[] {
  const lines: string[] = [
    "RECENT CREATIVE DIRECTIONS (reject / avoid repeating these mechanisms — NEVER reuse as inspiration):",
  ];
  if (brief.memory.recent_directions.length) {
    for (const d of brief.memory.recent_directions.slice(0, 16)) {
      lines.push(`- ${d}`);
    }
  } else {
    lines.push("- (none yet — still invent genuinely different mechanisms)");
  }
  if (brief.memory.recent_fingerprints.length) {
    lines.push(
      "Recent concept fingerprints (avoid repeating their communication mechanisms too):",
    );
    for (const fp of brief.memory.recent_fingerprints.slice(0, 10)) {
      const dir = fp.creative_direction?.trim();
      lines.push(
        `- direction=${dir || "(unspecified)"} | premise=${fp.core_premise} | atmosphere=${fp.palette_atmosphere}`,
      );
    }
  }
  return lines;
}

export function buildCreativeDirectionPrompt(args: {
  brief: CreativeBrief;
  rejectionAppendix?: string | null;
}): string {
  const { brief } = args;
  const funnelLabel = FUNNEL_STAGE_LABELS[brief.strategy.funnel_stage];

  const lines: string[] = [
    "CREATIVE DIRECTION GENERATION — invent abstract communication mechanisms.",
    "",
    "PRODUCT BRAIN (facts only):",
    `- product_is: ${JSON.stringify(brief.project.product_is)}`,
    `- product_is_not: ${JSON.stringify(brief.project.product_is_not)}`,
    `- pain_points: ${JSON.stringify(brief.project.pain_points)}`,
    `- strengths: ${JSON.stringify(brief.project.strengths)}`,
    `- audience: ${brief.project.audience ?? "(unspecified)"}`,
    `- voice_notes: ${brief.project.voice_notes ?? "(unspecified)"}`,
    "",
    "STRATEGY ITEM:",
    `- topic: ${brief.strategy.topic}`,
    `- angle: ${brief.strategy.angle ?? "(none)"}`,
    `- funnel_stage: ${funnelLabel} (${brief.strategy.funnel_stage})`,
    `- platform: ${brief.strategy.platform}`,
    `- format: ${brief.strategy.format}`,
    `- cta_hint: ${brief.strategy.cta_hint ?? "(none)"}`,
    "",
    "RUN CONTEXT:",
    `- package_index: ${brief.run.package_index ?? "n/a"}`,
    `- package_count: ${brief.run.package_count ?? "n/a"}`,
    `- angle_lens (framing hint, NOT a story): ${brief.run.angle_lens ?? "n/a"}`,
    `- pain_point_focus: ${brief.run.pain_point_focus ?? "n/a"}`,
    "",
    ...directionMemoryLines(brief),
    "",
    "WHAT A DIRECTION IS:",
    "- An abstract creative mechanism / way of communicating the message.",
    "- Examples of the *kind* of thing meant (illustrative only — invent your own; do NOT copy this list):",
    "  solving a problem · experiment · myth vs reality · dialogue · comparison ·",
    "  emotional story · social proof · behind the scenes · unexpected contrast · challenge · analogy",
    "- Do NOT write hooks, openings, plots, characters, visual worlds, or scripts here.",
    "",
    "HARD REQUIREMENTS:",
    `- Invent ${DIRECTION_GEN_MIN}–${DIRECTION_GEN_MAX} directions (choose how many based on strategy richness and anti-repetition pressure).`,
    "- Directions must be genuinely different mechanisms from each other.",
    "- Avoid repeating recent_directions and recent fingerprint creative_direction values.",
    `- Suitable for funnel stage ${funnelLabel}.`,
    "- Fit Product Brain pain points and audience without inventing fake product claims.",
    "- Do NOT force a predefined category list. Do NOT output stories or hooks.",
    "",
    "OUTPUT JSON SHAPE:",
    CREATIVE_DIRECTION_EXPECTED_SHAPE,
  ];

  if (args.rejectionAppendix?.trim()) {
    lines.push(
      "",
      "PRIOR DIRECTIONS WERE REJECTED. Invent NEW mechanisms that avoid:",
      args.rejectionAppendix.trim(),
    );
  }

  return lines.join("\n");
}
