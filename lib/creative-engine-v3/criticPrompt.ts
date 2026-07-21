import type { CreativeBrief, InventedCreativeConcept } from "@/lib/creative-engine-v3/types";
import { CREATIVE_EVALUATION_EXPECTED_SHAPE } from "@/lib/creative-engine-v3/criticSchema";
import { FUNNEL_STAGE_LABELS } from "@/lib/ai/types";

export const CREATIVE_CRITIC_SYSTEM = [
  "You are a comparative creative critic for short-form social ads.",
  "Rank the provided invented concepts against each other.",
  "Stop-scroll strength matters but must NOT automatically override originality, funnel fit, narrative coherence, or natural product integration.",
  "Do not invent new concepts. Do not prefer generic B2B safety.",
  "Respond with a single valid JSON document only.",
].join(" ");

export function buildCreativeCriticPrompt(args: {
  brief: CreativeBrief;
  concepts: readonly InventedCreativeConcept[];
}): string {
  const { brief, concepts } = args;
  const funnelLabel = FUNNEL_STAGE_LABELS[brief.strategy.funnel_stage];

  const conceptBlocks = concepts.map((c, i) =>
    [
      `### Concept ${i + 1} (${c.concept_id}): ${c.title}`,
      `central_idea: ${c.central_idea}`,
      `opening_two_seconds: ${c.opening_two_seconds}`,
      `hook_line: ${c.hook_line}`,
      `story_progression: ${c.story_progression}`,
      `visual_world: ${c.visual_world}`,
      `emotional_tone: ${c.emotional_tone}`,
      `emotional_mechanism: ${c.emotional_mechanism}`,
      `pacing: ${c.pacing}`,
      `viewpoint: ${c.viewpoint}`,
      `characters_or_hero_objects: ${JSON.stringify(c.characters_or_hero_objects)}`,
      `product_role: ${c.product_role}`,
      `ending_payoff: ${c.ending_payoff}`,
      `why_stops_scroll: ${c.why_stops_scroll}`,
      `funnel_fit_note: ${c.funnel_fit_note}`,
      `atmosphere: ${JSON.stringify(c.atmosphere)}`,
      `fingerprint: ${JSON.stringify(c.fingerprint)}`,
      `production_risks: ${JSON.stringify(c.production_risks)}`,
    ].join("\n"),
  );

  return [
    "COMPARATIVE CRITIC — score and rank ALL surviving concepts.",
    "",
    `Strategy topic: ${brief.strategy.topic}`,
    `Angle: ${brief.strategy.angle ?? "(none)"}`,
    `Funnel: ${funnelLabel}`,
    `Pain points: ${JSON.stringify(brief.project.pain_points)}`,
    `Product: ${JSON.stringify(brief.project.product_is)}`,
    "",
    "Recent fingerprints to prefer DIFFERENCE from:",
    ...brief.memory.recent_fingerprints
      .slice(0, 8)
      .map(
        (fp) =>
          `- ${fp.core_premise} / ${fp.visual_world} / ${fp.palette_atmosphere}`,
      ),
    "",
    "Score each concept 0–10 on EVERY dimension. Rank comparatively (best first).",
    "winner_id must be one of the concept_ids below.",
    "Do NOT use Attention-First stop-only shortlisting. A slightly weaker stop with far better originality/funnel/product integration may win.",
    "",
    ...conceptBlocks,
    "",
    "OUTPUT JSON SHAPE:",
    CREATIVE_EVALUATION_EXPECTED_SHAPE,
  ].join("\n");
}
