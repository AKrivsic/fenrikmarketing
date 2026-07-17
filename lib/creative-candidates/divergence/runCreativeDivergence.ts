import {
  extractTopicConcreteSignals,
  type TopicConcreteSignals,
} from "@/lib/creative-candidates/generateCandidates";
import { clusterRawSituations } from "@/lib/creative-candidates/divergence/clusterRawSituations";
import { buildCandidatesFromSurvivors } from "@/lib/creative-candidates/divergence/buildCandidatesFromSituations";
import { generateRawVisualSituations } from "@/lib/creative-candidates/divergence/generateRawSituations";
import {
  CREATIVE_DIVERGENCE_VERSION,
  type CreativeDivergencePlan,
} from "@/lib/creative-candidates/divergence/types";
import type { CreativeCandidate } from "@/lib/creative-candidates/types";

function productLabel(productIs: readonly string[]): string {
  const p = productIs.find((x) => x.trim());
  return p?.trim() || "the product";
}

function painLabel(painPoints: readonly string[]): string {
  const p = painPoints.find((x) => x.trim());
  return p?.trim() || "unanswered demand";
}

export function runCreativeDivergence(input: {
  topic: string;
  angle?: string | null;
  painPoints?: readonly string[];
  productIs?: readonly string[];
  candidateCount?: number;
}): {
  divergence: CreativeDivergencePlan;
  candidates: CreativeCandidate[];
} {
  const signals = extractTopicConcreteSignals(input.topic, input.angle);
  const product = productLabel(input.productIs ?? []);
  const pain = painLabel(input.painPoints ?? []);
  const candidateCount = input.candidateCount ?? 8;

  const allRaw = generateRawVisualSituations({
    topic: input.topic,
    angle: input.angle,
    signals,
    targetCount: 45,
  });

  const rejectedGenericSamples = allRaw
    .filter((s) => s.rejected)
    .slice(0, 12)
    .map((s) => ({
      id: s.id,
      reason: s.rejectReason ?? "rejected",
      scene: s.scene.slice(0, 160),
    }));

  const { clusters, survivors } = clusterRawSituations(allRaw);

  const candidates = buildCandidatesFromSurvivors(survivors, {
    signals,
    product,
    pain,
    count: candidateCount,
  });

  const divergence: CreativeDivergencePlan = {
    version: CREATIVE_DIVERGENCE_VERSION,
    rawGeneratedCount: allRaw.length,
    rawAfterFilterCount: allRaw.filter((s) => !s.rejected).length,
    clusters,
    survivors: survivors.slice(0, 16),
    rejectedGenericSamples,
    candidateSourceIds: candidates.map((c) => {
      const match = survivors.find(
        (s) => c.openingSituation === s.scene || c.coreIdea === s.scene,
      );
      return match?.id ?? c.candidateId;
    }),
  };

  return { divergence, candidates };
}

export type { TopicConcreteSignals };
