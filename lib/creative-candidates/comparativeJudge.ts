import type {
  ComparativeJudgeResult,
  ScoredCreativeCandidate,
} from "@/lib/creative-candidates/types";

function pickMax(
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

/**
 * Comparative judge across the full slate — not independent pass/fail only.
 */
export function runComparativeJudge(
  scored: readonly ScoredCreativeCandidate[],
): ComparativeJudgeResult {
  const eligible = scored.filter((s) => !s.rejected);
  const pool = eligible.length > 0 ? eligible : [...scored];

  const mostLikelyToStopScrolling = pickMax(scored, "stopPower");
  const leastInterchangeable = pickMax(scored, "originality");
  const clearestMentalImage = pickMax(scored, "visualSpecificity");
  const mostMemorableInOneHour = pickMax(scored, "memorability");
  const bestProductTopicFit = pickMax(scored, "productRelevance");

  // Winner: weighted total among eligible, with comparative vote bonus
  const voteBonus = new Map<string, number>();
  for (const id of [
    mostLikelyToStopScrolling,
    leastInterchangeable,
    clearestMentalImage,
    mostMemorableInOneHour,
    bestProductTopicFit,
  ]) {
    voteBonus.set(id, (voteBonus.get(id) ?? 0) + 1);
  }

  let winner = pool[0]!;
  for (const s of pool) {
    const score =
      s.weightedTotal + (voteBonus.get(s.candidate.candidateId) ?? 0) * 4;
    const winScore =
      winner.weightedTotal +
      (voteBonus.get(winner.candidate.candidateId) ?? 0) * 4;
    if (score > winScore) winner = s;
  }

  // Never let highest feasibility alone win if stop/memorability are weak
  const safer = pool
    .filter((s) => s.scores.productionFeasibility >= 8)
    .sort((a, b) => b.scores.productionFeasibility - a.scores.productionFeasibility)[0];
  if (
    safer &&
    safer.candidate.candidateId === winner.candidate.candidateId &&
    safer.scores.stopPower <= 4 &&
    safer.scores.memorability <= 4
  ) {
    const alternative = pool
      .filter((s) => s.candidate.candidateId !== safer.candidate.candidateId)
      .sort((a, b) => b.weightedTotal - a.weightedTotal)[0];
    if (alternative) winner = alternative;
  }

  const votes = voteBonus.get(winner.candidate.candidateId) ?? 0;
  const winnerReason = [
    `weighted_total=${winner.weightedTotal.toFixed(1)}`,
    `comparative_votes=${votes}`,
    `stop=${winner.scores.stopPower}`,
    `comprehension=${winner.scores.immediateComprehension}`,
    `memorability=${winner.scores.memorability}`,
    `product=${winner.scores.productRelevance}`,
    `family=${winner.candidate.family}`,
    `core=${winner.candidate.coreIdea.slice(0, 120)}`,
  ].join("; ");

  return {
    mostLikelyToStopScrolling,
    leastInterchangeable,
    clearestMentalImage,
    mostMemorableInOneHour,
    bestProductTopicFit,
    winnerId: winner.candidate.candidateId,
    winnerReason,
  };
}

export function selectWinner(
  scored: readonly ScoredCreativeCandidate[],
  judge: ComparativeJudgeResult,
): ScoredCreativeCandidate {
  const found = scored.find((s) => s.candidate.candidateId === judge.winnerId);
  if (found) return found;
  return [...scored].sort((a, b) => b.weightedTotal - a.weightedTotal)[0]!;
}
