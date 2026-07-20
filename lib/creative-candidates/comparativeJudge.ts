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

/** Max candidates kept after stop-scroll shortlist (phase 1). */
export const STOP_SHORTLIST_SIZE = 3;

/**
 * Winner must be within this many stopPower points of the pool max.
 * Prevents commercial from crowning a far-weaker scroll-stop candidate.
 */
export const STOP_POWER_GAP_MAX = 2;

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
 * When every candidate is soft-rejected, still optimize Attention First:
 * rank by stopPower (then memorability / firstFrameClarity), not commercial max.
 */
function buildStopPreferredRejectedPool(
  scored: readonly ScoredCreativeCandidate[],
): ScoredCreativeCandidate[] {
  const list = [...scored];
  if (list.length === 0) return list;
  const withClarity = list.filter(
    (s) => (s.commercialScores?.firstFrameClarity ?? 0) >= 5,
  );
  const base = withClarity.length > 0 ? withClarity : list;
  return [...base].sort((a, b) => {
    if (b.scores.stopPower !== a.scores.stopPower) {
      return b.scores.stopPower - a.scores.stopPower;
    }
    if (b.scores.memorability !== a.scores.memorability) {
      return b.scores.memorability - a.scores.memorability;
    }
    return (
      (b.commercialScores?.firstFrameClarity ?? 0) -
      (a.commercialScores?.firstFrameClarity ?? 0)
    );
  });
}

/**
 * Phase 1: shortlist by stop-scroll (stopPower), within STOP_POWER_GAP_MAX of max.
 * Cap at STOP_SHORTLIST_SIZE (tiebreak memorability, then creative weightedTotal,
 * then firstFrameClarity so meaning-readable opens win ties).
 */
export function buildStopScrollShortlist(
  pool: readonly ScoredCreativeCandidate[],
): ScoredCreativeCandidate[] {
  if (pool.length === 0) return [];
  const maxStop = Math.max(...pool.map((s) => s.scores.stopPower));
  const withinGap = pool.filter(
    (s) => s.scores.stopPower >= maxStop - STOP_POWER_GAP_MAX,
  );
  const ranked = [...withinGap].sort((a, b) => {
    if (b.scores.stopPower !== a.scores.stopPower) {
      return b.scores.stopPower - a.scores.stopPower;
    }
    if (b.scores.memorability !== a.scores.memorability) {
      return b.scores.memorability - a.scores.memorability;
    }
    if (b.weightedTotal !== a.weightedTotal) {
      return b.weightedTotal - a.weightedTotal;
    }
    return (
      (b.commercialScores?.firstFrameClarity ?? 0) -
      (a.commercialScores?.firstFrameClarity ?? 0)
    );
  });
  const shortlist = ranked.slice(0, STOP_SHORTLIST_SIZE);
  return shortlist.length > 0 ? shortlist : [...pool].slice(0, 1);
}

/**
 * Comparative judge + Selection v3 winner.
 *
 * Creative comparative badges remain for diagnostics.
 *
 * Winner policy (Attention First):
 *   Phase 1 — shortlist by stopPower (within gap of max).
 *   Phase 2 — among shortlist, pick by Final Selection Score
 *             (creative weightedTotal + commercial total).
 * Commercial may choose among strong stop candidates; it must not crown a
 * far-weaker stop-scroll candidate from the full pool.
 */
export function runComparativeJudge(
  scoredInput: readonly ScoredCreativeCandidate[],
): ComparativeJudgeResult & { selectionDiagnostics: SelectionDiagnostics } {
  const scored = scoredInput.some((s) => s.commercialScores)
    ? [...scoredInput]
    : attachCommercialScores(scoredInput);

  const eligible = scored.filter((s) => !s.rejected);
  // GEN-1: when all soft-rejected, prefer stop-scroll among rejected — never
  // fall back to a commercial lottery over the full rejected set unordered.
  const pool =
    eligible.length > 0
      ? eligible
      : buildStopPreferredRejectedPool(scored);

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

  const shortlist = buildStopScrollShortlist(pool);
  const maxStop = Math.max(...pool.map((s) => s.scores.stopPower));

  let winner = shortlist[0]!;
  for (const s of shortlist) {
    if (selectionScore(s) > selectionScore(winner)) winner = s;
    else if (
      selectionScore(s) === selectionScore(winner) &&
      (s.commercialTotal ?? 0) > (winner.commercialTotal ?? 0)
    ) {
      winner = s;
    } else if (
      selectionScore(s) === selectionScore(winner) &&
      (s.commercialTotal ?? 0) === (winner.commercialTotal ?? 0) &&
      s.scores.stopPower > winner.scores.stopPower
    ) {
      winner = s;
    }
  }

  // Safety: never crown a winner more than STOP_POWER_GAP_MAX below pool max.
  if (winner.scores.stopPower < maxStop - STOP_POWER_GAP_MAX) {
    const stopLeader = [...pool].sort(
      (a, b) =>
        b.scores.stopPower - a.scores.stopPower ||
        b.scores.memorability - a.scores.memorability,
    )[0]!;
    winner = stopLeader;
  }

  // Never crown pure feasibility / low-stop safety when commercial+creative are weak
  if (
    winner.scores.stopPower <= 3 &&
    winner.scores.memorability <= 3 &&
    (winner.commercialScores?.commercialSurvivability ?? 0) <= 4
  ) {
    const alternative = shortlist
      .filter((s) => s.candidate.candidateId !== winner.candidate.candidateId)
      .sort((a, b) => selectionScore(b) - selectionScore(a))[0];
    if (alternative && selectionScore(alternative) >= selectionScore(winner) - 5) {
      winner = alternative;
    }
  }

  const diagnostics = buildSelectionDiagnostics(scored, winner, {
    stopShortlistIds: shortlist.map((s) => s.candidate.candidateId),
    maxStopPowerInPool: maxStop,
  });

  const winnerReason = [
    `selection=stop_shortlist_then_commercial`,
    `stop_shortlist=${shortlist.map((s) => s.candidate.candidateId).join(",")}`,
    `final_selection_score=${selectionScore(winner).toFixed(1)}`,
    `creative_score=${winner.weightedTotal.toFixed(1)}`,
    `commercial_score=${(winner.commercialTotal ?? 0).toFixed(1)}`,
    `stop=${winner.scores.stopPower}`,
    `max_stop_in_pool=${maxStop}`,
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
