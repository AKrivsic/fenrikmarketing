export const CREATIVE_DIVERGENCE_VERSION = "creative-divergence@2.1" as const;

/** One concrete filmable frame — not a theme, not a product message. */
export interface RawVisualSituation {
  id: string;
  scene: string;
  /** What a stranger feels in one second. */
  scrollStopCue: string;
  tags: string[];
  stopScrollScore: number;
  visualDistinctScore: number;
  rejected: boolean;
  rejectReason: string | null;
  clusterId: string | null;
}

export interface RawSituationCluster {
  clusterId: string;
  representativeId: string;
  memberIds: string[];
  centroidScene: string;
}

export interface CreativeDivergencePlan {
  version: typeof CREATIVE_DIVERGENCE_VERSION;
  rawGeneratedCount: number;
  rawAfterFilterCount: number;
  clusters: RawSituationCluster[];
  survivors: RawVisualSituation[];
  rejectedGenericSamples: Array<{ id: string; reason: string; scene: string }>;
  candidateSourceIds: string[];
}
