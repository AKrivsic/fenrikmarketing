import { candidateBlob } from "@/lib/creative-candidates/generateCandidates";
import { familyCommercialMetadata } from "@/lib/creative-candidates/familyMetadata";
import type {
  CommercialCandidateScores,
  CreativeCandidate,
  CreativeCandidateScores,
  SelectionDiagnostics,
  ScoredCreativeCandidate,
} from "@/lib/creative-candidates/types";

function clamp10(n: number): number {
  return Math.max(0, Math.min(10, Math.round(n)));
}

/**
 * Commercial Success weights — used inside the stop-scroll shortlist (phase 2).
 * Must not be so large that commercial alone overturns a far-stronger stop
 * candidate from outside the shortlist (see comparativeJudge two-phase policy).
 */
export const COMMERCIAL_SCORE_WEIGHTS = {
  renderability: 3.0,
  firstFrameClarity: 3.5,
  productDemonstrability: 2.5,
  humanProblemVisibility: 3.0,
  narrativeSurvivability: 2.0,
  commercialSurvivability: 2.0,
} as const;

export const COMMERCIAL_SUCCESS_VERSION = "commercial-success@1" as const;

function openingBlob(candidate: CreativeCandidate): string {
  return `${candidate.openingSituation} ${candidate.hookLine} ${candidate.coreIdea}`;
}

/**
 * True when the opening names a stakes/action/consequence beat — high
 * information density for scroll-stop (industry-agnostic).
 */
function hasMeaningfulOpeningEvent(text: string): boolean {
  return /\b(walk(?:ing|s|ed)?\s+away|leave|leaving|unanswered|no\s+reply|never\s+(comes|came|answers?)|dies?\s+in\s+silence|rival|competitor|before\s+you|too\s+late|missed|frozen|argument|fight|conflict|consequence|cost|losing|lost|fails?|failure|stack(?:ing|s|ed)?|overflow|pile|mountain|melting|breaking|broken|empty\s+(?:bed|crib|chair|seat|slot|inbox|thread|queue)|waiting|seen\s+by\s+nobody|nobody\s+(answers?|replies)|mid-(?:action|pitch|call|sentence))\b/i.test(
    text,
  );
}

/**
 * Low-information opening: static staging with no stakes, action, contrast,
 * or curiosity cue. Calm can be fine; empty-of-meaning is not.
 */
function isLowInformationOpening(text: string): boolean {
  if (hasMeaningfulOpeningEvent(text)) return false;
  if (
    /\b(why|what\s+if|nobody|never|instead|versus|vs\.?|before|after|wrong|right|only|still|already|yet)\b/i.test(
      text,
    )
  ) {
    return false;
  }
  return /\b(generic|interchangeable|decorative|abstract\s+(shapes?|shapes)|empty\s+environment|no\s+subject|stock\s+staging)\b/i.test(
    text,
  );
}

/**
 * Opening depends on readable labels/numbers to land meaning (NO_TEXT risk).
 * Industry-agnostic: labeled rows, status words, notification copy, KPIs.
 */
function dependsOnReadableText(text: string): boolean {
  return /\b(readable\s+text|labeled\s+rows?|status\s+(board|panel|lights?)|notification\s+stack|kpi|typography|signage|captioned|with\s+labels?\b|boarding|delayed|cancelled|canceled|#\d+)\b/i.test(
    text,
  );
}

/**
 * Deterministic commercial dimensions from family metadata + text heuristics.
 * Penalize low-information and text-dependent opens; reward meaningful events.
 * Do not encode industry- or location-specific bans.
 */
export function scoreCommercialSuccess(
  candidate: CreativeCandidate,
): CommercialCandidateScores {
  const meta = familyCommercialMetadata(candidate.family);
  const open = openingBlob(candidate);
  const blob = candidateBlob(candidate);

  let renderability = meta.renderability;
  let firstFrameClarity = meta.first_frame_clarity;
  let productDemonstrability = meta.product_visibility;
  let humanProblemVisibility = meta.human_problem_strength;
  let narrativeSurvivability = meta.commercial_reliability;
  let commercialSurvivability = meta.commercial_reliability;

  if (meta.requires_readable_text) {
    renderability -= 2;
    firstFrameClarity -= 2;
    narrativeSurvivability -= 1;
  }
  if (meta.requires_real_product_asset) {
    productDemonstrability -= 1;
  }
  if (meta.metaphor_risk >= 7) {
    firstFrameClarity -= 1;
    narrativeSurvivability -= 1;
    commercialSurvivability -= 1;
  }

  if (dependsOnReadableText(open)) {
    renderability -= 3;
    firstFrameClarity -= 3;
    narrativeSurvivability -= 2;
    commercialSurvivability -= 2;
  }

  // Abstract symbolic interfaces without a human situation
  if (
    /\b(glowing\s+(dashboard|tablet|panel|screen)|abstract\s+(ui|dashboard|system)|symbolic\s+interface)\b/i.test(
      open,
    )
  ) {
    renderability -= 2;
    firstFrameClarity -= 2;
    productDemonstrability -= 1;
  }

  if (
    /\b(dashboard|analytics\s+screen|fake\s+ui|invented\s+ui)\b/i.test(blob) &&
    !/\b(hands?|person|customer|visitor|walk|phone\s+call|meeting|pitch|patient|guest|client|buyer)\b/i.test(
      open,
    )
  ) {
    productDemonstrability -= 2;
    firstFrameClarity -= 1;
  }

  // Meaningful opening event — boost clarity / human problem (Attention First)
  if (hasMeaningfulOpeningEvent(open)) {
    humanProblemVisibility += 2;
    firstFrameClarity += 1;
    renderability += 1;
    commercialSurvivability += 1;
  }

  if (isLowInformationOpening(open)) {
    firstFrameClarity -= 3;
    humanProblemVisibility -= 2;
    commercialSurvivability -= 2;
  }

  // Product can be shown as answering / action in-world (not sales pitch)
  if (
    /\b(chat\s+(answer|reply|respond)|answers?\s+(visitor|guest|patient|client|buyer)|typing\s+indicator|app\s+recommend|product\s+ui|framed\s+(asset|laptop)|no\s+reply)\b/i.test(
      blob,
    )
  ) {
    productDemonstrability += 2;
    commercialSurvivability += 1;
  }

  // Empty glow / speech bubble as "product" — weak demonstrability
  if (
    /\b(empty\s+speech\s+bubble|glowing\s+bubble|soft\s+green\s+glow)\b/i.test(
      blob,
    ) &&
    !/\b(chat\s+answer|message\s+bubbles?|product\s+ui|framed)\b/i.test(blob)
  ) {
    productDemonstrability -= 2;
  }

  return {
    renderability: clamp10(renderability),
    firstFrameClarity: clamp10(firstFrameClarity),
    productDemonstrability: clamp10(productDemonstrability),
    humanProblemVisibility: clamp10(humanProblemVisibility),
    narrativeSurvivability: clamp10(narrativeSurvivability),
    commercialSurvivability: clamp10(commercialSurvivability),
  };
}

export function commercialTotal(scores: CommercialCandidateScores): number {
  return (
    scores.renderability * COMMERCIAL_SCORE_WEIGHTS.renderability +
    scores.firstFrameClarity * COMMERCIAL_SCORE_WEIGHTS.firstFrameClarity +
    scores.productDemonstrability *
      COMMERCIAL_SCORE_WEIGHTS.productDemonstrability +
    scores.humanProblemVisibility *
      COMMERCIAL_SCORE_WEIGHTS.humanProblemVisibility +
    scores.narrativeSurvivability *
      COMMERCIAL_SCORE_WEIGHTS.narrativeSurvivability +
    scores.commercialSurvivability *
      COMMERCIAL_SCORE_WEIGHTS.commercialSurvivability
  );
}

export function finalSelectionScore(
  creativeWeightedTotal: number,
  commercialWeightedTotal: number,
): number {
  return creativeWeightedTotal + commercialWeightedTotal;
}

export function commercialDimensionContributions(
  scores: CommercialCandidateScores,
): Record<keyof CommercialCandidateScores, number> {
  return {
    renderability: scores.renderability * COMMERCIAL_SCORE_WEIGHTS.renderability,
    firstFrameClarity:
      scores.firstFrameClarity * COMMERCIAL_SCORE_WEIGHTS.firstFrameClarity,
    productDemonstrability:
      scores.productDemonstrability *
      COMMERCIAL_SCORE_WEIGHTS.productDemonstrability,
    humanProblemVisibility:
      scores.humanProblemVisibility *
      COMMERCIAL_SCORE_WEIGHTS.humanProblemVisibility,
    narrativeSurvivability:
      scores.narrativeSurvivability *
      COMMERCIAL_SCORE_WEIGHTS.narrativeSurvivability,
    commercialSurvivability:
      scores.commercialSurvivability *
      COMMERCIAL_SCORE_WEIGHTS.commercialSurvivability,
  };
}

function primaryPenalties(s: ScoredCreativeCandidate): string[] {
  const out: string[] = [];
  const c = s.commercialScores;
  if (!c) return out;
  if (c.renderability <= 4) out.push(`low_renderability=${c.renderability}`);
  if (c.firstFrameClarity <= 4)
    out.push(`low_first_frame_clarity=${c.firstFrameClarity}`);
  if (c.productDemonstrability <= 4)
    out.push(`low_product_demonstrability=${c.productDemonstrability}`);
  if (c.humanProblemVisibility <= 4)
    out.push(`low_human_problem_visibility=${c.humanProblemVisibility}`);
  if (c.narrativeSurvivability <= 4)
    out.push(`low_narrative_survivability=${c.narrativeSurvivability}`);
  if (c.commercialSurvivability <= 4)
    out.push(`low_commercial_survivability=${c.commercialSurvivability}`);
  const meta = familyCommercialMetadata(s.candidate.family);
  if (meta.metaphor_risk >= 7)
    out.push(`high_metaphor_risk=${meta.metaphor_risk}`);
  if (meta.requires_readable_text) out.push("requires_readable_text");
  return out;
}

/**
 * Developer-friendly diagnostics for the winning selection.
 */
export function buildSelectionDiagnostics(
  scored: readonly ScoredCreativeCandidate[],
  winner: ScoredCreativeCandidate,
  extras?: {
    stopShortlistIds?: readonly string[];
    maxStopPowerInPool?: number;
  },
): SelectionDiagnostics {
  const commercial = winner.commercialScores!;
  const contributions = commercialDimensionContributions(commercial);
  const losers = scored
    .filter((s) => s.candidate.candidateId !== winner.candidate.candidateId)
    .map((s) => ({
      candidateId: s.candidate.candidateId,
      family: s.candidate.family,
      creativeScore: s.weightedTotal,
      commercialScore: s.commercialTotal ?? 0,
      finalSelectionScore: s.finalSelectionScore ?? s.weightedTotal,
      primaryPenalties: primaryPenalties(s),
      lostBy:
        (winner.finalSelectionScore ?? 0) - (s.finalSelectionScore ?? 0),
    }))
    .sort((a, b) => b.finalSelectionScore - a.finalSelectionScore);

  const creativeLeaders = [...scored].sort(
    (a, b) => b.weightedTotal - a.weightedTotal,
  );
  const creativeLeader = creativeLeaders[0];
  const overturnedCreativeLeader =
    Boolean(creativeLeader) &&
    creativeLeader!.candidate.candidateId !== winner.candidate.candidateId &&
    creativeLeader!.weightedTotal > winner.weightedTotal;

  const stopLeaders = [...scored].sort(
    (a, b) => b.scores.stopPower - a.scores.stopPower,
  );
  const stopLeader = stopLeaders[0];
  const overturnedStopLeader =
    Boolean(stopLeader) &&
    stopLeader!.candidate.candidateId !== winner.candidate.candidateId &&
    stopLeader!.scores.stopPower > winner.scores.stopPower;

  const whyWon = [
    `final_selection_score=${(winner.finalSelectionScore ?? 0).toFixed(1)}`,
    `creative_score=${winner.weightedTotal.toFixed(1)}`,
    `commercial_score=${(winner.commercialTotal ?? 0).toFixed(1)}`,
    `stop=${winner.scores.stopPower}`,
    extras?.maxStopPowerInPool != null
      ? `max_stop_in_pool=${extras.maxStopPowerInPool}`
      : null,
    extras?.stopShortlistIds
      ? `stop_shortlist=${extras.stopShortlistIds.join(",")}`
      : null,
    `family=${winner.candidate.family}`,
    `renderability=${commercial.renderability}`,
    `first_frame_clarity=${commercial.firstFrameClarity}`,
    `product_demo=${commercial.productDemonstrability}`,
    `human_problem=${commercial.humanProblemVisibility}`,
    `narrative_survive=${commercial.narrativeSurvivability}`,
    `commercial_survive=${commercial.commercialSurvivability}`,
    overturnedCreativeLeader
      ? `overturned_higher_creative=${creativeLeader!.candidate.candidateId}(creative=${creativeLeader!.weightedTotal.toFixed(1)})`
      : "also_led_or_tied_creative",
    overturnedStopLeader
      ? `commercial_chose_within_stop_shortlist_vs=${stopLeader!.candidate.candidateId}(stop=${stopLeader!.scores.stopPower})`
      : "led_or_tied_stop_in_shortlist",
  ]
    .filter((x): x is string => Boolean(x))
    .join("; ");

  return {
    version: COMMERCIAL_SUCCESS_VERSION,
    winnerId: winner.candidate.candidateId,
    creativeScore: winner.weightedTotal,
    commercialScore: winner.commercialTotal ?? 0,
    finalSelectionScore: winner.finalSelectionScore ?? winner.weightedTotal,
    commercialDimensions: commercial,
    commercialDimensionContributions: contributions,
    creativeScoresSnapshot: winner.scores,
    whyWon,
    losersPenalized: losers.slice(0, 7),
    overturnedCreativeLeader,
  };
}

/** Attach commercial layer onto already creatively scored candidates. */
export function attachCommercialScores(
  scored: readonly ScoredCreativeCandidate[],
): ScoredCreativeCandidate[] {
  return scored.map((s) => {
    const commercialScores = scoreCommercialSuccess(s.candidate);
    const cTotal = commercialTotal(commercialScores);
    const final = finalSelectionScore(s.weightedTotal, cTotal);
    return {
      ...s,
      commercialScores,
      commercialTotal: cTotal,
      finalSelectionScore: final,
    };
  });
}

export function summarizeCreativeVsCommercial(
  scores: CreativeCandidateScores,
  commercial: CommercialCandidateScores,
): { creativeHighlights: string[]; commercialHighlights: string[] } {
  return {
    creativeHighlights: [
      `stop=${scores.stopPower}`,
      `originality=${scores.originality}`,
      `memorability=${scores.memorability}`,
    ],
    commercialHighlights: [
      `renderability=${commercial.renderability}`,
      `first_frame=${commercial.firstFrameClarity}`,
      `product_demo=${commercial.productDemonstrability}`,
    ],
  };
}
