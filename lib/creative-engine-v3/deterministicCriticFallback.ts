/**
 * Deterministic multi-criteria ranking over invented concepts only.
 * Never falls back to Divergence / template banks.
 */

import {
  fingerprintFieldSimilarity,
  isDarkOfficeAtmosphere,
} from "@/lib/creative-engine-v3/conceptFingerprint";
import {
  equalWeightTotal,
  SCORE_DIMENSIONS,
} from "@/lib/creative-engine-v3/criticSchema";
import {
  CREATIVE_EVALUATION_VERSION,
  type ConceptEvaluationEntry,
  type ConceptEvaluationResult,
  type ConceptScoreCard,
  type CreativeBrief,
  type InventedCreativeConcept,
} from "@/lib/creative-engine-v3/types";

function clamp(n: number): number {
  return Math.max(0, Math.min(10, Math.round(n * 10) / 10));
}

function specificityScore(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const uniq = new Set(words.map((w) => w.toLowerCase()));
  const long = words.filter((w) => w.length > 5).length;
  return clamp(3 + Math.min(4, words.length / 8) + Math.min(3, long / 4) + Math.min(2, uniq.size / 10));
}

function scoreConcept(
  concept: InventedCreativeConcept,
  brief: CreativeBrief,
): ConceptScoreCard {
  const recent = brief.memory.recent_fingerprints;
  let maxSim = 0;
  for (const fp of recent) {
    maxSim = Math.max(maxSim, fingerprintFieldSimilarity(concept.fingerprint, fp));
  }
  const antiRep = clamp(10 - maxSim * 0.7);
  const atmFresh = isDarkOfficeAtmosphere(
    `${concept.fingerprint.palette_atmosphere} ${concept.atmosphere.lighting_intent}`,
  )
    ? recent.some((fp) => isDarkOfficeAtmosphere(fp.palette_atmosphere))
      ? 2
      : 5
    : 8;

  const productBlob = `${concept.product_role} ${concept.fingerprint.product_mechanism}`;
  const productScore = clamp(
    specificityScore(productBlob) +
      (/\b(answer|chat|visitor|lead|website)\b/i.test(productBlob) ? 1.5 : 0),
  );

  const funnelBonus =
    concept.funnel_fit_note.toLowerCase().includes(brief.strategy.funnel_stage) ||
    concept.funnel_fit_note.length > 40
      ? 1
      : 0;

  return {
    stop_scroll: specificityScore(concept.why_stops_scroll + " " + concept.opening_two_seconds),
    originality: clamp(antiRep * 0.7 + specificityScore(concept.central_idea) * 0.3),
    memorability: specificityScore(concept.hook_line + " " + concept.visual_world),
    strategy_fit: specificityScore(
      `${brief.strategy.topic} ${concept.central_idea} ${concept.funnel_fit_note}`,
    ),
    funnel_fit: clamp(specificityScore(concept.funnel_fit_note) + funnelBonus),
    product_relevance: productScore,
    natural_product_integration: productScore,
    narrative_coherence: specificityScore(concept.story_progression),
    visual_distinctness: specificityScore(concept.visual_world),
    emotional_strength: specificityScore(
      `${concept.emotional_tone} ${concept.emotional_mechanism}`,
    ),
    production_feasibility: clamp(
      9 -
        concept.production_risks.filter((r) => /hard|difficult|unfilm|cgi|crowd/i.test(r))
          .length *
          1.5,
    ),
    anti_repetition: antiRep,
    atmosphere_freshness: atmFresh,
  };
}

export function deterministicEvaluateConcepts(args: {
  concepts: readonly InventedCreativeConcept[];
  brief: CreativeBrief;
}): ConceptEvaluationResult {
  if (args.concepts.length === 0) {
    return {
      version: CREATIVE_EVALUATION_VERSION,
      evaluations: [],
      ranking: [],
      winner_id: "",
      winner_reason: "no surviving concepts",
      source: "deterministic_fallback",
    };
  }

  const evaluations: ConceptEvaluationEntry[] = args.concepts.map((c) => ({
    concept_id: c.concept_id,
    scores: scoreConcept(c, args.brief),
    vetoes: [],
    critic_notes: "deterministic multi-criteria fallback (critic unavailable)",
  }));

  const ranked = [...evaluations].sort(
    (a, b) => equalWeightTotal(b.scores) - equalWeightTotal(a.scores),
  );
  // Tie-break: prefer originality + funnel_fit + natural_product_integration over stop alone
  ranked.sort((a, b) => {
    const ta = equalWeightTotal(a.scores);
    const tb = equalWeightTotal(b.scores);
    if (tb !== ta) return tb - ta;
    const key = (e: ConceptEvaluationEntry) =>
      e.scores.originality +
      e.scores.funnel_fit +
      e.scores.natural_product_integration +
      e.scores.narrative_coherence;
    return key(b) - key(a);
  });

  const winner = ranked[0]!;
  return {
    version: CREATIVE_EVALUATION_VERSION,
    evaluations,
    ranking: ranked.map((e) => e.concept_id),
    winner_id: winner.concept_id,
    winner_reason: `Deterministic equal-weight total across ${SCORE_DIMENSIONS.length} dimensions (stop_scroll not sole decider).`,
    source: "deterministic_fallback",
  };
}
