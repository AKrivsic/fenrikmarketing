import {
  areNearDuplicateSituations,
  situationFingerprint,
} from "@/lib/creative-candidates/divergence/situationFingerprint";
import type {
  RawSituationCluster,
  RawVisualSituation,
} from "@/lib/creative-candidates/divergence/types";

function combinedScore(s: RawVisualSituation): number {
  return s.stopScrollScore * 0.65 + s.visualDistinctScore * 0.35;
}

/**
 * Semantic clustering: near-duplicates (same idea, different props/camera) share a cluster.
 * Survivors = best-scoring representative per cluster.
 */
export function clusterRawSituations(
  situations: readonly RawVisualSituation[],
): {
  clusters: RawSituationCluster[];
  survivors: RawVisualSituation[];
  annotated: RawVisualSituation[];
} {
  const pool = situations
    .filter((s) => !s.rejected)
    .map((s) => ({
      ...s,
      _fp: situationFingerprint(s.scene, s.scrollStopCue),
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
    for (let ci = 0; ci < clusters.length; ci++) {
      const rep = clusters[ci]!.rep;
      if (
        areNearDuplicateSituations(
          { scene: s.scene, scrollStopCue: s.scrollStopCue, tags: s.tags },
          { scene: rep.scene, scrollStopCue: rep.scrollStopCue, tags: rep.tags },
        )
      ) {
        bestIdx = ci;
        break;
      }
    }
    if (bestIdx >= 0) {
      clusters[bestIdx]!.members.push(s);
      // Keep highest-scoring member as rep
      if (s._score > clusters[bestIdx]!.rep._score) {
        clusters[bestIdx]!.rep = s;
      }
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
    .map((c) => {
      const { _fp, _score, ...rest } = c.rep;
      void _fp;
      void _score;
      return {
        ...rest,
        clusterId: c.clusterId,
      };
    })
    .sort((a, b) => combinedScore(b) - combinedScore(a));

  const annotated = situations.map((s) => {
    if (s.rejected) return s;
    const memberCluster = clusters.find((c) =>
      c.members.some((m) => m.id === s.id),
    );
    return {
      ...s,
      clusterId: memberCluster?.clusterId ?? null,
    };
  });

  return { clusters: clusterSummaries, survivors, annotated };
}

export function pickTopSurvivors(
  survivors: readonly RawVisualSituation[],
  count: number,
): RawVisualSituation[] {
  return survivors.slice(0, count);
}
