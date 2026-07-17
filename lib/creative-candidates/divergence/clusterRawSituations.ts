import {
  jaccardSimilarity,
  tokenSet,
} from "@/lib/creative-candidates/divergence/scoreRawSituation";
import type {
  RawSituationCluster,
  RawVisualSituation,
} from "@/lib/creative-candidates/divergence/types";

const CLUSTER_MERGE_THRESHOLD = 0.52;

function combinedScore(s: RawVisualSituation): number {
  return s.stopScrollScore * 0.65 + s.visualDistinctScore * 0.35;
}

/**
 * Greedy clustering: assign each non-rejected situation to nearest cluster or new cluster.
 * Return cluster reps sorted by combined scroll-stop score.
 */
export function clusterRawSituations(
  situations: readonly RawVisualSituation[],
  opts?: { similarityThreshold?: number },
): {
  clusters: RawSituationCluster[];
  survivors: RawVisualSituation[];
  annotated: RawVisualSituation[];
} {
  const threshold = opts?.similarityThreshold ?? CLUSTER_MERGE_THRESHOLD;
  const pool = situations
    .filter((s) => !s.rejected)
    .map((s) => ({
      ...s,
      _tokens: tokenSet(`${s.scene} ${s.scrollStopCue} ${s.tags.join(" ")}`),
      _score: combinedScore(s),
    }))
    .sort((a, b) => b._score - a._score);

  const clusters: Array<{
    clusterId: string;
    rep: (typeof pool)[0];
    members: (typeof pool)[0][];
  }> = [];

  for (const s of pool) {
    let bestIdx = -1;
    let bestSim = 0;
    for (let ci = 0; ci < clusters.length; ci++) {
      const sim = jaccardSimilarity(s._tokens, clusters[ci]!.rep._tokens);
      if (sim > bestSim) {
        bestSim = sim;
        bestIdx = ci;
      }
    }
    if (bestIdx >= 0 && bestSim >= threshold) {
      clusters[bestIdx]!.members.push(s);
    } else {
      clusters.push({
        clusterId: `cl-${clusters.length + 1}`,
        rep: s,
        members: [s],
      });
    }
  }

  const clusterSummaries: RawSituationCluster[] = clusters.map((c) => ({
    clusterId: c.clusterId,
    representativeId: c.rep.id,
    memberIds: c.members.map((m) => m.id),
    centroidScene: c.rep.scene,
  }));

  const survivors = clusters
    .map((c) => c.rep)
    .sort((a, b) => b._score - a._score)
    .map(({ _tokens, _score, ...rest }) => ({
      ...rest,
      clusterId: clusters.find((cl) => cl.rep.id === rest.id)?.clusterId ?? null,
    }));

  const repById = new Map(survivors.map((s) => [s.id, s.clusterId]));
  const annotated = situations.map((s) => {
    if (s.rejected) return s;
    const memberCluster = clusters.find((c) =>
      c.members.some((m) => m.id === s.id),
    );
    const clusterId = memberCluster?.clusterId ?? null;
    const isRep = memberCluster?.rep.id === s.id;
    return {
      ...s,
      clusterId: isRep ? clusterId : clusterId,
    };
  });

  // Mark non-rep members (for observability survivors = reps only)
  void repById;

  return { clusters: clusterSummaries, survivors, annotated };
}

export function pickTopSurvivors(
  survivors: readonly RawVisualSituation[],
  count: number,
): RawVisualSituation[] {
  return survivors.slice(0, count);
}
