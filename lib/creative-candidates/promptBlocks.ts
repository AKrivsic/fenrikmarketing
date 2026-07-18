import type { CreativeCandidatePlan } from "@/lib/creative-candidates/types";
import { CREATIVE_CANDIDATE_VERSION } from "@/lib/creative-candidates/types";
import {
  buildCreativeDnaPromptBlock,
  normalizeCreativeDNA,
  type CreativeDnaDiagnostics,
} from "@/lib/creative-candidates/creativeDNA";
import { buildStoryIntegrityPromptBlock } from "@/lib/creative-candidates/storyIntegrity";

export const CREATIVE_CANDIDATE_PROMPT_HEADER = "CREATIVE CANDIDATE SELECTION";

export function buildCreativeCandidatePromptBlock(
  plan: CreativeCandidatePlan,
): string {
  const w = plan.selectedCandidate;
  const integrityBlock = buildStoryIntegrityPromptBlock(w);
  return [
    `${CREATIVE_CANDIDATE_PROMPT_HEADER} (${CREATIVE_CANDIDATE_VERSION}):`,
    "Raw visual situations were clustered for scroll-stop (Creative Divergence v2); a winner was selected for COMMERCIAL SUCCESS of the finished ad",
    "(Selection v3: Creative Score + Commercial Success — not pure originality).",
    "You MUST execute THIS winner — do not invent a safer B2B montage, do not reinterpret into phones/laptops/offices unless the winner requires it.",
    "",
    `Winner id: ${w.candidateId} (${w.family})`,
    `Why it won: ${plan.comparativeJudge.winnerReason}`,
    plan.selectionDiagnostics
      ? `Selection diagnostics: creative=${plan.selectionDiagnostics.creativeScore.toFixed(1)} commercial=${plan.selectionDiagnostics.commercialScore.toFixed(1)} final=${plan.selectionDiagnostics.finalSelectionScore.toFixed(1)}`
      : null,
    "",
    `coreIdea: ${w.coreIdea}`,
    `emotionalReaction: ${w.emotionalReaction}`,
    `hookLine (MUST be the stored hook AND the first spoken line): ${w.hookLine}`,
    `openingSituation (MUST be visual_scenes[0] / first image_prompt): ${w.openingSituation}`,
    `visualPromise: ${w.visualPromise}`,
    `storyProgression: ${w.storyProgression}`,
    `productConnection: ${w.productConnection}`,
    `ending: ${w.ending}`,
    `expectedViewerQuestion: ${w.expectedViewerQuestion}`,
    `memorabilityReason: ${w.memorabilityReason}`,
    "",
    "Hard rules:",
    "- First spoken line creates tension, contradiction, curiosity, surprise, consequence, or emotional recognition.",
    "- Forbidden openers: Let's be honest / Most businesses / In today's world / generic belief essays.",
    "- Keep topic-specific concrete signals from the winner (do not collapse to 'businesses are busy').",
    "- Downstream beats follow storyProgression AND the NARRATIVE BEATS block",
    "  (HOOK → SETUP → ESCALATION → RESOLUTION); product enters via productConnection; close via ending.",
    "- Attention / Visual Narrative / Identity control LOOK and MECHANISM — they must AMPLIFY this winner, not replace it.",
    "- When CANONICAL CREATIVE DNA is present below, it overrides conflicting staging from Identity / Narrative / Product Reveal.",
    "- STORY INTEGRITY: every visual beat must stay inside the selected world — no mid-video metaphor escape.",
    "",
    integrityBlock,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

/**
 * Separate DNA block placed immediately after the candidate block.
 * Returns empty string when DNA is absent (historical candidates).
 */
export function buildCreativeDnaPromptBlockFromPlan(
  plan: CreativeCandidatePlan,
): string {
  const dna = normalizeCreativeDNA(plan.selectedCandidate.creativeDNA);
  return dna ? buildCreativeDnaPromptBlock(dna) : "";
}

export function creativeCandidateFieldsForPersistence(
  plan: CreativeCandidatePlan,
  diagnostics?: CreativeDnaDiagnostics | null,
): Record<string, unknown> {
  return {
    creative_candidates: {
      version: plan.version,
      creativeDivergence: plan.creativeDivergence,
      generatedCandidates: plan.generatedCandidates,
      candidateScores: plan.candidateScores.map((s) => ({
        candidateId: s.candidate.candidateId,
        family: s.candidate.family,
        scores: s.scores,
        weightedTotal: s.weightedTotal,
        commercialScores: s.commercialScores ?? null,
        commercialTotal: s.commercialTotal ?? null,
        finalSelectionScore: s.finalSelectionScore ?? null,
        rejected: s.rejected,
        rejectReasons: s.rejectReasons,
        hookLine: s.candidate.hookLine,
        openingSituation: s.candidate.openingSituation,
        coreIdea: s.candidate.coreIdea,
      })),
      rejectedCandidates: plan.rejectedCandidates,
      selectedCandidate: plan.selectedCandidate,
      comparativeJudge: plan.comparativeJudge,
      selectionDiagnostics: plan.selectionDiagnostics ?? null,
      finalScriptFidelity: plan.finalScriptFidelity,
      finalStoryboardFidelity: plan.finalStoryboardFidelity,
      storyIntegrity: plan.storyIntegrity ?? null,
      regenerationReason: plan.regenerationReason,
      ...(diagnostics ? { creativeDnaDiagnostics: diagnostics } : {}),
    },
  };
}
