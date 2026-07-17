import { runComparativeJudge, selectWinner } from "@/lib/creative-candidates/comparativeJudge";
import { generateCreativeCandidatesWithDivergence } from "@/lib/creative-candidates/generateCandidates";
import { applyGenericityRejections } from "@/lib/creative-candidates/scoreCandidates";
import {
  buildCreativeCandidatePromptBlock,
  creativeCandidateFieldsForPersistence,
} from "@/lib/creative-candidates/promptBlocks";
import {
  CREATIVE_CANDIDATE_VERSION,
  type ConceptFidelityResult,
  type CreativeCandidatePlan,
} from "@/lib/creative-candidates/types";

export function planCreativeCandidatesForPackage(args: {
  topic: string;
  angle?: string | null;
  painPoints?: readonly string[];
  productIs?: readonly string[];
  requireVideo: boolean;
}): {
  plan: CreativeCandidatePlan | null;
  promptBlock: string;
  persistenceFields: Record<string, unknown>;
} {
  if (!args.requireVideo) {
    return { plan: null, promptBlock: "", persistenceFields: {} };
  }

  const { candidates: generatedCandidates, divergence: creativeDivergence } =
    generateCreativeCandidatesWithDivergence({
      topic: args.topic,
      angle: args.angle,
      painPoints: args.painPoints,
      productIs: args.productIs,
    });

  const candidateScores = applyGenericityRejections(generatedCandidates, {
    topic: args.topic,
    angle: args.angle,
    productIs: args.productIs,
  });

  const comparativeJudge = runComparativeJudge(candidateScores);
  const winnerScored = selectWinner(candidateScores, comparativeJudge);

  const plan: CreativeCandidatePlan = {
    version: CREATIVE_CANDIDATE_VERSION,
    creativeDivergence,
    generatedCandidates,
    candidateScores,
    rejectedCandidates: candidateScores
      .filter((s) => s.rejected)
      .map((s) => ({
        candidateId: s.candidate.candidateId,
        reasons: s.rejectReasons,
      })),
    selectedCandidate: winnerScored.candidate,
    comparativeJudge,
    finalScriptFidelity: null,
    finalStoryboardFidelity: null,
    regenerationReason: null,
  };

  return {
    plan,
    promptBlock: buildCreativeCandidatePromptBlock(plan),
    persistenceFields: creativeCandidateFieldsForPersistence(plan),
  };
}

export function attachFidelityToPlan(
  plan: CreativeCandidatePlan,
  fidelity: ConceptFidelityResult,
  regenerationReason: string | null,
): CreativeCandidatePlan {
  return {
    ...plan,
    finalScriptFidelity: fidelity,
    finalStoryboardFidelity: fidelity,
    regenerationReason,
  };
}
