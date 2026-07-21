import type {
  CreativeBrief,
  CreativeDirection,
} from "@/lib/creative-engine-v3/types";
import {
  DIRECTION_SELECT_MAX,
  DIRECTION_SELECT_MIN,
} from "@/lib/creative-engine-v3/types";
import { DIRECTION_EVAL_EXPECTED_SHAPE } from "@/lib/creative-engine-v3/directionEvalSchema";
import { FUNNEL_STAGE_LABELS } from "@/lib/ai/types";

export const CREATIVE_DIRECTION_CRITIC_SYSTEM = [
  "You comparatively evaluate abstract creative directions for short-form ads.",
  "Select the strongest AND most diverse set — not only the single highest score.",
  "Directions are mechanisms, not stories. Do not invent concepts or hooks.",
  "Respond with a single valid JSON document only.",
].join(" ");

export function buildDirectionEvaluationPrompt(args: {
  brief: CreativeBrief;
  directions: readonly CreativeDirection[];
}): string {
  const { brief, directions } = args;
  const funnelLabel = FUNNEL_STAGE_LABELS[brief.strategy.funnel_stage];

  const blocks = directions.map((d, i) =>
    [
      `### Direction ${i + 1} (${d.direction_id}): ${d.label}`,
      `mechanism: ${d.mechanism}`,
      `why_fits: ${d.why_fits}`,
      `diversity_note: ${d.diversity_note}`,
      `anti_repetition_note: ${d.anti_repetition_note}`,
    ].join("\n"),
  );

  return [
    "DIRECTION EVALUATION — score all directions; select a diverse shortlist.",
    "",
    `Topic: ${brief.strategy.topic}`,
    `Angle: ${brief.strategy.angle ?? "(none)"}`,
    `Funnel: ${funnelLabel}`,
    `Audience: ${brief.project.audience ?? "(unspecified)"}`,
    `Pain points: ${JSON.stringify(brief.project.pain_points)}`,
    "",
    "Recent directions to prefer DIFFERENCE from:",
    ...brief.memory.recent_directions.slice(0, 12).map((d) => `- ${d}`),
    "",
    `Select ${DIRECTION_SELECT_MIN}–${DIRECTION_SELECT_MAX} directions that are both strong and mutually diverse.`,
    "Prefer variety of communication mechanisms over slight score gaps between near-duplicates.",
    "",
    ...blocks,
    "",
    "OUTPUT JSON SHAPE:",
    DIRECTION_EVAL_EXPECTED_SHAPE,
  ].join("\n");
}
