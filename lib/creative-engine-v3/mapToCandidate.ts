/**
 * Map invented concept → CreativeCandidate for Narrative Beats / fidelity / SI / PPD.
 * No FAMILY_BUILDERS. No motif-based DNA heuristics.
 */

import type { CreativeDNA } from "@/lib/creative-candidates/creativeDNA";
import {
  isValidCreativeDNA,
  normalizeCreativeDNA,
  validateCandidateDnaConsistency,
} from "@/lib/creative-candidates/creativeDNA";
import type { CreativeCandidate } from "@/lib/creative-candidates/types";
import type {
  ConceptEvaluationResult,
  InventedCreativeConcept,
} from "@/lib/creative-engine-v3/types";
import { CREATIVE_CANDIDATE_VERSION } from "@/lib/creative-candidates/types";
import type { CreativeCandidatePlan } from "@/lib/creative-candidates/types";

export function mapInventedConceptToCandidate(
  concept: InventedCreativeConcept,
  dna: CreativeDNA,
): CreativeCandidate {
  const hero =
    concept.characters_or_hero_objects[0] ??
    concept.fingerprint.hero_object ??
    "recurring subject";

  return {
    candidateId: concept.concept_id,
    family: "invented",
    coreIdea: concept.central_idea.trim(),
    emotionalReaction: `${concept.emotional_tone.trim()} via ${concept.emotional_mechanism.trim()}`,
    hookLine: concept.hook_line.trim(),
    openingSituation: concept.opening_two_seconds.trim(),
    visualPromise: [
      concept.visual_world.trim(),
      `Atmosphere: ${concept.atmosphere.time_of_day}, ${concept.atmosphere.palette_intent}, ${concept.atmosphere.lighting_intent}.`,
      `Viewpoint: ${concept.viewpoint}. Pacing: ${concept.pacing}.`,
    ].join(" "),
    storyProgression: concept.story_progression.trim(),
    productConnection: concept.product_role.trim(),
    ending: concept.ending_payoff.trim(),
    expectedViewerQuestion: dna.viewerQuestion.trim(),
    familiarityRisk: "low",
    memorabilityReason: concept.why_stops_scroll.trim(),
    creativeDNA: dna,
    creativeDnaSource: "model",
    // Extended field consumed by persistence / anti-repetition (optional on type via cast)
    ...( {
      conceptFingerprint: concept.fingerprint,
    } as object),
  } as CreativeCandidate & { conceptFingerprint: typeof concept.fingerprint };
}

export function pickWinnerConcept(
  concepts: readonly InventedCreativeConcept[],
  evaluation: ConceptEvaluationResult,
): InventedCreativeConcept | null {
  const byId = new Map(concepts.map((c) => [c.concept_id, c]));
  const winner = byId.get(evaluation.winner_id);
  if (winner) return winner;
  for (const id of evaluation.ranking) {
    const c = byId.get(id);
    if (c) return c;
  }
  return concepts[0] ?? null;
}

export function resolveModelDnaForConcept(
  concept: InventedCreativeConcept,
  productIs?: readonly string[],
): {
  dna: CreativeDNA | null;
  consistencyPassed: boolean;
  /** Soft warnings — v3 accepts shape-valid DNA when world matches opening. */
  reasons: string[];
  accept: boolean;
} {
  const reasons: string[] = [];
  const raw = concept.creative_dna;
  if (!isValidCreativeDNA(raw)) {
    return {
      dna: null,
      consistencyPassed: false,
      reasons: ["invalid_dna_shape"],
      accept: false,
    };
  }
  const dna = normalizeCreativeDNA(raw)!;
  const provisional = mapInventedConceptToCandidate(concept, dna);
  const { creativeDNA: _d, creativeDnaSource: _s, ...rest } = provisional;
  const consistency = validateCandidateDnaConsistency(rest, dna, { productIs });
  if (!consistency.passed) {
    reasons.push(
      ...consistency.violations.map((v) => `dna_${v.field}:${v.message}`),
    );
  }

  // Hard accept: full consistency.
  if (consistency.passed) {
    return { dna, consistencyPassed: true, reasons, accept: true };
  }

  // Soft accept for v3: shape-valid DNA whose world clearly belongs to the opening.
  // Divergence-era mainCharacter/immutableRules heuristics must not terminal-fail
  // newly invented concepts.
  const worldOk =
    tokenOverlapLight(dna.world, concept.opening_two_seconds) ||
    tokenOverlapLight(dna.world, concept.visual_world) ||
    tokenOverlapLight(dna.world, concept.fingerprint.visual_world);
  if (worldOk && dna.immutableRules.length >= 3) {
    return { dna, consistencyPassed: false, reasons, accept: true };
  }

  return { dna, consistencyPassed: false, reasons, accept: false };
}

function tokenOverlapLight(a: string, b: string): boolean {
  const stop = new Set(["that", "this", "with", "from", "the", "and", "for", "as"]);
  const tokens = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stop.has(w));
  const aw = new Set(tokens(a));
  let hits = 0;
  for (const w of tokens(b)) {
    if (aw.has(w)) hits++;
  }
  return hits >= 1;
}

export function buildCandidatePlanFromV3(args: {
  winner: CreativeCandidate;
  generated: CreativeCandidate[];
  evaluation: ConceptEvaluationResult;
  regenerationReason?: string | null;
}): CreativeCandidatePlan {
  const { winner, generated, evaluation } = args;
  return {
    version: CREATIVE_CANDIDATE_VERSION,
    generatedCandidates: generated,
    candidateScores: generated.map((c) => {
      const ev = evaluation.evaluations.find((e) => e.concept_id === c.candidateId);
      const stop = ev?.scores.stop_scroll ?? 5;
      return {
        candidate: c,
        scores: {
          stopPower: stop,
          immediateComprehension: ev?.scores.narrative_coherence ?? 5,
          memorability: ev?.scores.memorability ?? 5,
          emotionalCharge: ev?.scores.emotional_strength ?? 5,
          productRelevance: ev?.scores.product_relevance ?? 5,
          visualSpecificity: ev?.scores.visual_distinctness ?? 5,
          storyPotential: ev?.scores.narrative_coherence ?? 5,
          originality: ev?.scores.originality ?? 5,
          AI_Generic_Risk: Math.max(0, 10 - (ev?.scores.originality ?? 5)),
          productionFeasibility: ev?.scores.production_feasibility ?? 5,
        },
        weightedTotal: stop,
        commercialScores: {
          renderability: ev?.scores.production_feasibility ?? 5,
          firstFrameClarity: ev?.scores.stop_scroll ?? 5,
          productDemonstrability: ev?.scores.natural_product_integration ?? 5,
          humanProblemVisibility: ev?.scores.emotional_strength ?? 5,
          narrativeSurvivability: ev?.scores.narrative_coherence ?? 5,
          commercialSurvivability: ev?.scores.strategy_fit ?? 5,
        },
        commercialTotal: ev?.scores.strategy_fit ?? 5,
        finalSelectionScore: ev
          ? Object.values(ev.scores).reduce((a, b) => a + b, 0)
          : 0,
        rejected: Boolean(ev?.vetoes?.length),
        rejectReasons: ev?.vetoes ?? [],
      };
    }),
    rejectedCandidates: evaluation.evaluations
      .filter((e) => e.vetoes.length > 0)
      .map((e) => ({ candidateId: e.concept_id, reasons: e.vetoes })),
    selectedCandidate: winner,
    comparativeJudge: {
      mostLikelyToStopScrolling: evaluation.ranking[0] ?? winner.candidateId,
      leastInterchangeable: winner.candidateId,
      clearestMentalImage: winner.candidateId,
      mostMemorableInOneHour: winner.candidateId,
      bestProductTopicFit: winner.candidateId,
      winnerId: winner.candidateId,
      winnerReason: evaluation.winner_reason,
    },
    selectionDiagnostics: {
      version: "commercial-success@1",
      winnerId: winner.candidateId,
      creativeScore: 0,
      commercialScore: 0,
      finalSelectionScore: 0,
      commercialDimensions: {
        renderability: 0,
        firstFrameClarity: 0,
        productDemonstrability: 0,
        humanProblemVisibility: 0,
        narrativeSurvivability: 0,
        commercialSurvivability: 0,
      },
      commercialDimensionContributions: {
        renderability: 0,
        firstFrameClarity: 0,
        productDemonstrability: 0,
        humanProblemVisibility: 0,
        narrativeSurvivability: 0,
        commercialSurvivability: 0,
      },
      creativeScoresSnapshot: {
        stopPower: 0,
        immediateComprehension: 0,
        memorability: 0,
        emotionalCharge: 0,
        productRelevance: 0,
        visualSpecificity: 0,
        storyPotential: 0,
        originality: 0,
        AI_Generic_Risk: 0,
        productionFeasibility: 0,
      },
      whyWon: `${evaluation.source}: ${evaluation.winner_reason}`,
      losersPenalized: [],
      overturnedCreativeLeader: false,
    },
    finalScriptFidelity: null,
    finalStoryboardFidelity: null,
    regenerationReason: args.regenerationReason ?? null,
  };
}
