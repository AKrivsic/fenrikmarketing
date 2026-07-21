import type {
  CreativeBrief,
  CreativeDirection,
} from "@/lib/creative-engine-v3/types";
import {
  CONCEPTS_PER_DIRECTION_MAX,
  CONCEPTS_PER_DIRECTION_MIN,
  TOTAL_CONCEPTS_MAX,
  TOTAL_CONCEPTS_MIN,
} from "@/lib/creative-engine-v3/types";
import { CREATIVE_IDEATION_EXPECTED_SHAPE } from "@/lib/creative-engine-v3/ideationSchema";
import { FUNNEL_STAGE_LABELS } from "@/lib/ai/types";

export const CREATIVE_IDEATION_SYSTEM = [
  "You are the Creative Engine for short-form social video ads.",
  "Invent original commercial concepts under assigned creative directions.",
  "You never select from banks, templates, or example stories.",
  "Respond with a single valid JSON document only.",
].join(" ");

function memoryLines(brief: CreativeBrief): string[] {
  const lines: string[] = [
    "RECENT CONTENT MEMORY (reject / avoid — NEVER reuse as inspiration or copy):",
  ];
  if (brief.memory.recent_hooks.length) {
    lines.push("Recent hooks to avoid repeating:");
    for (const h of brief.memory.recent_hooks.slice(0, 12)) {
      lines.push(`- ${h}`);
    }
  }
  if (brief.memory.recent_directions.length) {
    lines.push("Recent creative directions / mechanisms already used:");
    for (const d of brief.memory.recent_directions.slice(0, 12)) {
      lines.push(`- ${d}`);
    }
  }
  if (brief.memory.recent_fingerprints.length) {
    lines.push(
      "Recent creative fingerprints to avoid (premises / worlds / mechanisms / atmospheres / directions):",
    );
    for (const fp of brief.memory.recent_fingerprints.slice(0, 12)) {
      lines.push(
        `- direction=${fp.creative_direction || "?"} | premise=${fp.core_premise} | open=${fp.opening_mechanism} | world=${fp.visual_world} | hero=${fp.hero_object} | atmosphere=${fp.palette_atmosphere}`,
      );
    }
  }
  if (brief.memory.forbidden_atmospheres.length) {
    lines.push("Atmospheres recently overused — invent something visually different:");
    for (const a of brief.memory.forbidden_atmospheres.slice(0, 10)) {
      lines.push(`- ${a}`);
    }
  }
  if (
    !brief.memory.recent_hooks.length &&
    !brief.memory.recent_fingerprints.length
  ) {
    lines.push("- (empty memory — still invent distinct concepts per direction)");
  }
  return lines;
}

export function buildCreativeIdeationPrompt(args: {
  brief: CreativeBrief;
  selectedDirections: readonly CreativeDirection[];
  rejectionAppendix?: string | null;
}): string {
  const { brief, selectedDirections } = args;
  const funnelLabel = FUNNEL_STAGE_LABELS[brief.strategy.funnel_stage];
  const perDirHint = `${CONCEPTS_PER_DIRECTION_MIN}–${CONCEPTS_PER_DIRECTION_MAX}`;

  const directionBlocks = selectedDirections.map((d, i) =>
    [
      `### Selected direction ${i + 1} (${d.direction_id}): ${d.label}`,
      `mechanism: ${d.mechanism}`,
      `why_fits: ${d.why_fits}`,
      `Invent ${perDirHint} ORIGINAL concepts that execute THIS mechanism (not a different mechanism).`,
    ].join("\n"),
  );

  const lines: string[] = [
    "CREATIVE CONCEPT IDEATION — invent original concepts under selected directions.",
    "Concept counts are ADAPTIVE (not a fixed six). Choose how many per direction within the allowed range.",
    "",
    "PRODUCT BRAIN (facts only — invent the story yourself):",
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
    `- sibling_angles already used: ${JSON.stringify(brief.run.sibling_angles)}`,
    "",
    "ASSETS / PPD CONSTRAINTS (production facts — not creative concepts):",
    `- ${brief.assets.summary}`,
    `- presentation_class: ${brief.assets.ppd_constraints.presentation_class ?? "n/a"}`,
    `- reveal_ceiling: ${brief.assets.ppd_constraints.reveal_ceiling ?? "n/a"}`,
    `- authentic_asset_available: ${brief.assets.ppd_constraints.authentic_asset_available}`,
    "",
    ...memoryLines(brief),
    "",
    "SELECTED CREATIVE DIRECTIONS (mechanisms — invent stories that execute them):",
    ...directionBlocks,
    "",
    "HARD REQUIREMENTS:",
    `- For EACH selected direction, invent ${perDirHint} concepts.`,
    `- Total concepts across all directions: ${TOTAL_CONCEPTS_MIN}–${TOTAL_CONCEPTS_MAX}.`,
    "- Every concept must set direction_id, direction_label, and fingerprint.creative_direction to that direction's mechanism/label.",
    "- Concepts under the same direction must still differ in opening, world, tone, characters/objects, and product integration.",
    "- Concepts across directions must stay faithful to their assigned mechanism.",
    "- Leave the safe LLM zone. Generic B2B social content is a failure.",
    "- Scroll-stopping in the first two seconds.",
    "- Visually distinctive worlds; do NOT default to dark scenes, night offices, blue lighting, or muted corporate palettes.",
    "- Forbidden fallbacks: laptop montages, dashboards as the hero, talking heads, generic offices, dark rooms as default.",
    "- Natural product integration (not a sales pitch in second 1).",
    `- Suitable for funnel stage ${funnelLabel}.`,
    "- Consistent from opening through ending (author creative_dna with each concept).",
    "- Feasible for short-form image/video stills (flag production_risks honestly).",
    "- Do NOT force predefined creative categories. Do NOT include example concepts.",
    "- Do NOT select from prewritten stories, hooks, metaphors, situations, or commercial-world banks.",
    "",
    "OUTPUT JSON SHAPE:",
    CREATIVE_IDEATION_EXPECTED_SHAPE,
  ];

  if (args.rejectionAppendix?.trim()) {
    lines.push(
      "",
      "PRIOR CONCEPT IDEATION WAS REJECTED. Invent NEW concepts under the same directions that avoid:",
      args.rejectionAppendix.trim(),
    );
  }

  return lines.join("\n");
}
