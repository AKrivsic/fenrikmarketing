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
 * Commercial Success weights — calibrated so commercialTotal can outweigh
 * originality-driven creative swings (~15 pts from originality weight 1.5×10)
 * and comparative novelty bonuses.
 */
export const COMMERCIAL_SCORE_WEIGHTS = {
  renderability: 3.5,
  firstFrameClarity: 3.5,
  productDemonstrability: 3.0,
  humanProblemVisibility: 3.0,
  narrativeSurvivability: 2.5,
  commercialSurvivability: 2.5,
} as const;

export const COMMERCIAL_SUCCESS_VERSION = "commercial-success@1" as const;

function openingBlob(candidate: CreativeCandidate): string {
  return `${candidate.openingSituation} ${candidate.hookLine} ${candidate.coreIdea}`;
}

/**
 * Deterministic commercial dimensions from family metadata + text heuristics
 * grounded in the image-model / production audits (NO_TEXT, blank UI, etc.).
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
  // Start from family commercial reliability; refine below
  let commercialSurvivability = meta.commercial_reliability;

  if (meta.requires_readable_text) {
    renderability -= 2;
    firstFrameClarity -= 2;
    narrativeSurvivability -= 2;
  }
  if (meta.requires_real_product_asset) {
    productDemonstrability -= 1;
  }
  if (meta.metaphor_risk >= 7) {
    firstFrameClarity -= 1;
    narrativeSurvivability -= 2;
    commercialSurvivability -= 2;
  }

  // Text-dependent / diagram concepts — historically fail under NO_TEXT
  if (
    /\b(departure\s*board|status\s*board|boarding|delayed|phone\s*caller|#\d+|dual\s*clocks?|kpi|notification\s*stack|readable\s*text|labeled\s+rows?)\b/i.test(
      open,
    )
  ) {
    renderability -= 4;
    firstFrameClarity -= 4;
    narrativeSurvivability -= 3;
    commercialSurvivability -= 3;
  }

  // Abstract symbolic interfaces / glow dashboards
  if (
    /\b(glowing\s+(dashboard|tablet|panel|screen)|abstract\s+(ui|dashboard|system)|control\s*panel|status\s*lights?|symbolic\s+interface)\b/i.test(
      open,
    )
  ) {
    renderability -= 3;
    firstFrameClarity -= 3;
    productDemonstrability -= 2;
    commercialSurvivability -= 2;
  }

  // AI-invented product UI without human situation
  if (
    /\b(dashboard|analytics\s+screen|fake\s+ui|invented\s+ui)\b/i.test(blob) &&
    !/\b(hands?|person|customer|visitor|walk|phone\s+call|meeting|pitch)\b/i.test(
      open,
    )
  ) {
    productDemonstrability -= 2;
    firstFrameClarity -= 1;
  }

  // Human problem / situation-first boosts (pipeline-safe)
  if (
    /\b(hands?|person|customer|visitor|owner|founder|staff|walking\s+away|walks?\s+out|leave|leaving|argument|pitch|meeting|phone\s+to\s+(the\s+)?ear|on\s+the\s+phone|checkout|wallet|freeze|frozen)\b/i.test(
      open,
    )
  ) {
    humanProblemVisibility += 2;
    firstFrameClarity += 1;
    renderability += 1;
    commercialSurvivability += 1;
  }

  // Product can be shown as answering / chat / app action
  if (
    /\b(chat\s+(answer|reply|respond)|answers?\s+visitor|typing\s+indicator|app\s+recommend|product\s+ui|blueprint|framed\s+(asset|laptop)|services?\s+page\s+with\s+no\s+reply)\b/i.test(
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

  // Mascot / outdoor absurd spectacle — Identity historically relocates
  if (/\b(mascot|melting|parking\s*lot\s+heat|costume)\b/i.test(open)) {
    narrativeSurvivability -= 3;
    commercialSurvivability -= 2;
    firstFrameClarity -= 1;
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

  const whyWon = [
    `final_selection_score=${(winner.finalSelectionScore ?? 0).toFixed(1)}`,
    `creative_score=${winner.weightedTotal.toFixed(1)}`,
    `commercial_score=${(winner.commercialTotal ?? 0).toFixed(1)}`,
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
  ].join("; ");

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
