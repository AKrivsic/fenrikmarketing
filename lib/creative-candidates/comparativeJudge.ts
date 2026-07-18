import {
  attachCommercialScores,
  buildSelectionDiagnostics,
} from "@/lib/creative-candidates/commercialScore";
import type {
  CommercialCandidateScores,
  ComparativeJudgeResult,
  ScoredCreativeCandidate,
  SelectionDiagnostics,
} from "@/lib/creative-candidates/types";

function pickMaxCreative(
  scored: readonly ScoredCreativeCandidate[],
  key: keyof ScoredCreativeCandidate["scores"],
  invert = false,
): string {
  const pool = scored.filter((s) => !s.rejected);
  const list = pool.length > 0 ? pool : [...scored];
  let best = list[0]!;
  for (const s of list) {
    const a = s.scores[key];
    const b = best.scores[key];
    if (invert ? a < b : a > b) best = s;
    else if (a === b && s.weightedTotal > best.weightedTotal) best = s;
  }
  return best.candidate.candidateId;
}

function pickMaxCommercial(
  scored: readonly ScoredCreativeCandidate[],
  key: keyof CommercialCandidateScores,
): string {
  const pool = scored.filter((s) => !s.rejected && s.commercialScores);
  const list = pool.length > 0 ? pool : scored.filter((s) => s.commercialScores);
  const fallback = list.length > 0 ? list : [...scored];
  let best = fallback[0]!;
  for (const s of fallback) {
    const a = s.commercialScores?.[key] ?? 0;
    const b = best.commercialScores?.[key] ?? 0;
    if (a > b) best = s;
    else if (
      a === b &&
      (s.finalSelectionScore ?? s.weightedTotal) >
        (best.finalSelectionScore ?? best.weightedTotal)
    ) {
      best = s;
    }
  }
  return best.candidate.candidateId;
}

function selectionScore(s: ScoredCreativeCandidate): number {
  return s.finalSelectionScore ?? s.weightedTotal;
}

/**
 * Comparative judge + Selection v3 winner.
 *
 * Creative comparative badges remain for diagnostics.
 * Winner is chosen by Final Selection Score =
 *   Creative weightedTotal + Commercial Success total
 * so commercial viability can outweigh pure originality.
 */
export function runComparativeJudge(
  scoredInput: readonly ScoredCreativeCandidate[],
): ComparativeJudgeResult & { selectionDiagnostics: SelectionDiagnostics } {
  const scored = scoredInput.some((s) => s.commercialScores)
    ? [...scoredInput]
    : attachCommercialScores(scoredInput);

  const eligible = scored.filter((s) => !s.rejected);
  const pool = eligible.length > 0 ? eligible : [...scored];

  const mostLikelyToStopScrolling = pickMaxCreative(scored, "stopPower");
  const leastInterchangeable = pickMaxCreative(scored, "originality");
  const clearestMentalImage = pickMaxCreative(scored, "visualSpecificity");
  const mostMemorableInOneHour = pickMaxCreative(scored, "memorability");
  const bestProductTopicFit = pickMaxCreative(scored, "productRelevance");

  const mostRenderable = pickMaxCommercial(scored, "renderability");
  const clearestFirstFrame = pickMaxCommercial(scored, "firstFrameClarity");
  const bestProductDemonstrability = pickMaxCommercial(
    scored,
    "productDemonstrability",
  );
  const strongestHumanProblem = pickMaxCommercial(
    scored,
    "humanProblemVisibility",
  );
  const bestCommercialSurvivability = pickMaxCommercial(
    scored,
    "commercialSurvivability",
  );

  let winner = pool[0]!;
  for (const s of pool) {
    if (selectionScore(s) > selectionScore(winner)) winner = s;
    else if (
      selectionScore(s) === selectionScore(winner) &&
      (s.commercialTotal ?? 0) > (winner.commercialTotal ?? 0)
    ) {
      winner = s;
    }
  }

  // Never crown pure feasibility / low-stop safety when commercial+creative are weak
  if (
    winner.scores.stopPower <= 3 &&
    winner.scores.memorability <= 3 &&
    (winner.commercialScores?.commercialSurvivability ?? 0) <= 4
  ) {
    const alternative = pool
      .filter((s) => s.candidate.candidateId !== winner.candidate.candidateId)
      .sort((a, b) => selectionScore(b) - selectionScore(a))[0];
    if (alternative && selectionScore(alternative) >= selectionScore(winner) - 5) {
      winner = alternative;
    }
  }

  const diagnostics = buildSelectionDiagnostics(scored, winner);

  const winnerReason = [
    `final_selection_score=${selectionScore(winner).toFixed(1)}`,
    `creative_score=${winner.weightedTotal.toFixed(1)}`,
    `commercial_score=${(winner.commercialTotal ?? 0).toFixed(1)}`,
    `stop=${winner.scores.stopPower}`,
    `comprehension=${winner.scores.immediateComprehension}`,
    `originality=${winner.scores.originality}`,
    `renderability=${winner.commercialScores?.renderability ?? "?"}`,
    `first_frame=${winner.commercialScores?.firstFrameClarity ?? "?"}`,
    `product_demo=${winner.commercialScores?.productDemonstrability ?? "?"}`,
    `human_problem=${winner.commercialScores?.humanProblemVisibility ?? "?"}`,
    `family=${winner.candidate.family}`,
    `core=${winner.candidate.coreIdea.slice(0, 100)}`,
  ].join("; ");

  return {
    mostLikelyToStopScrolling,
    leastInterchangeable,
    clearestMentalImage,
    mostMemorableInOneHour,
    bestProductTopicFit,
    mostRenderable,
    clearestFirstFrame,
    bestProductDemonstrability,
    strongestHumanProblem,
    bestCommercialSurvivability,
    winnerId: winner.candidate.candidateId,
    winnerReason,
    selectionDiagnostics: diagnostics,
  };
}

export function selectWinner(
  scored: readonly ScoredCreativeCandidate[],
  judge: ComparativeJudgeResult,
): ScoredCreativeCandidate {
  const withCommercial = scored.some((s) => s.commercialScores)
    ? scored
    : attachCommercialScores(scored);
  const found = withCommercial.find(
    (s) => s.candidate.candidateId === judge.winnerId,
  );
  if (found) return found;
  return [...withCommercial].sort(
    (a, b) =>
      (b.finalSelectionScore ?? b.weightedTotal) -
      (a.finalSelectionScore ?? a.weightedTotal),
  )[0]!;
}
