import { candidateBlob } from "@/lib/creative-candidates/generateCandidates";
import {
  isPropAsConcept,
  matchesGenericConcept,
  matchesGenericHookOpener,
} from "@/lib/creative-candidates/genericity";
import { extractTopicConcreteSignals } from "@/lib/creative-candidates/generateCandidates";
import type {
  CreativeCandidate,
  CreativeCandidateScores,
  ScoredCreativeCandidate,
} from "@/lib/creative-candidates/types";

function clamp(n: number): number {
  return Math.max(0, Math.min(10, Math.round(n)));
}

/**
 * Weighted total. Prioritize stop / comprehension / memorability / product.
 * Feasibility only vetoes the impossible — it must not crown the safest generic.
 */
export const SCORE_WEIGHTS = {
  stopPower: 3.0,
  immediateComprehension: 2.5,
  memorability: 2.5,
  productRelevance: 2.0,
  emotionalCharge: 1.2,
  visualSpecificity: 1.2,
  storyPotential: 1.0,
  originality: 1.5,
  // Subtracted: high generic risk hurts
  AI_Generic_Risk: -2.0,
  // Soft: never dominate selection
  productionFeasibility: 0.35,
} as const;

export function scoreCreativeCandidate(
  candidate: CreativeCandidate,
  ctx: { topic: string; angle?: string | null; productIs?: readonly string[] },
): CreativeCandidateScores {
  const blob = candidateBlob(candidate);
  const signals = extractTopicConcreteSignals(ctx.topic, ctx.angle);
  const product = (ctx.productIs ?? []).join(" ").toLowerCase();

  let stopPower = 5;
  let immediateComprehension = 5;
  let memorability = 5;
  let emotionalCharge = 5;
  let productRelevance = 5;
  let visualSpecificity = 5;
  let storyPotential = 5;
  let originality = 5;
  let AI_Generic_Risk = 3;
  let productionFeasibility = 8;

  // Family priors
  const familyBoost: Record<string, Partial<CreativeCandidateScores>> = {
    human_conflict: { stopPower: 2, emotionalCharge: 2, memorability: 1 },
    absurd_understandable: { stopPower: 2, originality: 2, memorability: 2 },
    visual_exaggeration: { stopPower: 2, visualSpecificity: 2, memorability: 2 },
    consequence_first: { stopPower: 3, emotionalCharge: 1, storyPotential: 1 },
    role_reversal: { originality: 2, memorability: 2, stopPower: 1 },
    social_observation: { immediateComprehension: 1, productRelevance: 1 },
    unexpected_comparison: { originality: 2, memorability: 2, stopPower: 1 },
    direct_product_world: {
      productRelevance: 3,
      immediateComprehension: 2,
      visualSpecificity: 1,
    },
  };
  const boost = familyBoost[candidate.family] ?? {};
  stopPower += boost.stopPower ?? 0;
  immediateComprehension += boost.immediateComprehension ?? 0;
  memorability += boost.memorability ?? 0;
  emotionalCharge += boost.emotionalCharge ?? 0;
  productRelevance += boost.productRelevance ?? 0;
  visualSpecificity += boost.visualSpecificity ?? 0;
  storyPotential += boost.storyPotential ?? 0;
  originality += boost.originality ?? 0;

  // Topic specificity
  const tokenHits = signals.rawTokens.filter((t) =>
    blob.toLowerCase().includes(t.toLowerCase()),
  ).length;
  if (tokenHits >= 2) {
    memorability += 1;
    productRelevance += 1;
    visualSpecificity += 1;
    AI_Generic_Risk -= 2;
  } else if (tokenHits === 0) {
    AI_Generic_Risk += 3;
    memorability -= 2;
    productRelevance -= 2;
  }

  if (/\b(heat|heatwave|cooling|technician|van|truck|job)\b/i.test(blob) &&
    /\bhvac|heatwave|technician/i.test(ctx.topic + (ctx.angle ?? ""))) {
    visualSpecificity += 1;
    stopPower += 1;
  }
  if (/\b(accountant|vacation|suitcase|contact)\b/i.test(blob) &&
    /\baccountant|vacation/i.test(ctx.topic + (ctx.angle ?? ""))) {
    visualSpecificity += 1;
    stopPower += 1;
    productRelevance += 1;
  }

  if (product && /\b(chat|assistant|website|answer|visitor)\b/i.test(blob)) {
    productRelevance += 1;
  }

  if (candidate.familiarityRisk === "high") {
    AI_Generic_Risk += 2;
    originality -= 1;
  } else if (candidate.familiarityRisk === "low") {
    originality += 1;
    AI_Generic_Risk -= 1;
  }

  if (matchesGenericConcept(blob) || matchesGenericHookOpener(candidate.hookLine)) {
    AI_Generic_Risk += 4;
    stopPower -= 3;
    originality -= 3;
    memorability -= 2;
  }
  if (isPropAsConcept(blob)) {
    AI_Generic_Risk += 3;
    stopPower -= 2;
    visualSpecificity -= 2;
  }

  // Feasibility: reject only surreal impossibilities, not "harder to film"
  if (/\bunfilmable|impossible\s+CGI|requires\s+celebrity\b/i.test(blob)) {
    productionFeasibility = 1;
  } else if (/\bgraveyard|mountain|boarding|van|street|argument\b/i.test(blob)) {
    productionFeasibility = 7; // filmable stills
  }

  return {
    stopPower: clamp(stopPower),
    immediateComprehension: clamp(immediateComprehension),
    memorability: clamp(memorability),
    emotionalCharge: clamp(emotionalCharge),
    productRelevance: clamp(productRelevance),
    visualSpecificity: clamp(visualSpecificity),
    storyPotential: clamp(storyPotential),
    originality: clamp(originality),
    AI_Generic_Risk: clamp(AI_Generic_Risk),
    productionFeasibility: clamp(productionFeasibility),
  };
}

export function weightedTotal(scores: CreativeCandidateScores): number {
  return (
    scores.stopPower * SCORE_WEIGHTS.stopPower +
    scores.immediateComprehension * SCORE_WEIGHTS.immediateComprehension +
    scores.memorability * SCORE_WEIGHTS.memorability +
    scores.productRelevance * SCORE_WEIGHTS.productRelevance +
    scores.emotionalCharge * SCORE_WEIGHTS.emotionalCharge +
    scores.visualSpecificity * SCORE_WEIGHTS.visualSpecificity +
    scores.storyPotential * SCORE_WEIGHTS.storyPotential +
    scores.originality * SCORE_WEIGHTS.originality +
    scores.AI_Generic_Risk * SCORE_WEIGHTS.AI_Generic_Risk +
    scores.productionFeasibility * SCORE_WEIGHTS.productionFeasibility
  );
}

export function applyGenericityRejections(
  candidates: CreativeCandidate[],
  ctx: { topic: string; angle?: string | null; productIs?: readonly string[] },
): ScoredCreativeCandidate[] {
  return candidates.map((candidate) => {
    const blob = candidateBlob(candidate);
    const rejectReasons: string[] = [];
    const g = matchesGenericConcept(blob);
    if (g) rejectReasons.push(`generic_concept:${g}`);
    const h = matchesGenericHookOpener(candidate.hookLine);
    if (h) rejectReasons.push(`generic_hook:${h}`);
    if (isPropAsConcept(blob)) rejectReasons.push("prop_as_concept");

    // Soft: if concept is ONLY busy-business with no topic tokens → reject
    const signals = extractTopicConcreteSignals(ctx.topic, ctx.angle);
    const hits = signals.rawTokens.filter((t) =>
      blob.toLowerCase().includes(t.toLowerCase()),
    ).length;
    if (
      hits === 0 &&
      /\b(business|busy|website|office|laptop|phone)\b/i.test(blob) &&
      !/\b(heat|cooling|technician|patient|kitchen|van)\b/i.test(blob)
    ) {
      rejectReasons.push("topic_collapsed_to_generic_business");
    }

    const scores = scoreCreativeCandidate(candidate, ctx);
    if (scores.productionFeasibility <= 2) {
      rejectReasons.push("production_impossible");
    }

    return {
      candidate,
      scores,
      weightedTotal: weightedTotal(scores),
      rejected: rejectReasons.length > 0,
      rejectReasons,
    };
  });
}
