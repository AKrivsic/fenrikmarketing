import type { CreativeCandidatePlan } from "@/lib/creative-candidates/types";
import { CREATIVE_CANDIDATE_VERSION } from "@/lib/creative-candidates/types";
import {
  buildCreativeDnaPromptBlock,
  normalizeCreativeDNA,
  type CreativeDnaDiagnostics,
} from "@/lib/creative-candidates/creativeDNA";
import { buildStoryIntegrityPromptBlock } from "@/lib/creative-candidates/storyIntegrity";
import { buildProductDemonstrationPromptBlock } from "@/lib/creative-candidates/productDemonstrationIntegrity";

export const CREATIVE_CANDIDATE_PROMPT_HEADER = "CREATIVE CANDIDATE SELECTION";

export function buildCreativeCandidatePromptBlock(
  plan: CreativeCandidatePlan,
): string {
  const w = plan.selectedCandidate;
  const integrityBlock = buildStoryIntegrityPromptBlock(w);
  const productDemoBlock = buildProductDemonstrationPromptBlock(w);
  const productDemoHardRule = [
    "- PRODUCT PRESENTATION: follow Product Presentation Decision — authentic asset,",
    "  world/outcome, abstract mechanism, or story without product pixels.",
    "  Do NOT emit legacy PRODUCT_DEMO / synthetic product UI. Do not recreate a full",
    "  ask→answer→result chat sequence in IMAGE scenes.",
  ];
  return [
    `${CREATIVE_CANDIDATE_PROMPT_HEADER} (${CREATIVE_CANDIDATE_VERSION}):`,
    "Creative Engine v3 invented original concepts; a winner was selected by comparative evaluation (not template banks).",
    "Selection balances stop-scroll with originality, funnel fit, coherence, and product integration — stop power alone does not crown the winner.",
    "You MUST execute THIS winner — do not invent a safer montage, do not reinterpret into a low-information generic setting unless the winner requires it.",
    "Do not sand the opening into a weaker, more 'commercially safe' variant. Protect the winner's stop-scroll idea.",
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
    "- Keep topic-specific concrete signals from the winner (do not collapse to generic industry filler).",
    "- Downstream beats follow storyProgression AND the NARRATIVE BEATS block",
    "  (HOOK → SETUP → ESCALATION → RESOLUTION); product enters via productConnection; close via ending.",
    "- Attention / Visual Narrative / Identity control LOOK and MECHANISM — they must AMPLIFY this winner, not replace it.",
    "- Creative Identity may change lighting, camera, color, composition treatment — NEVER the location, environment, main event, or openingSituation.",
    "- When CANONICAL CREATIVE DNA is present below, it overrides conflicting staging from Identity / Narrative / Product Reveal.",
    "- STORY INTEGRITY: every visual beat must stay inside the selected world — no mid-video metaphor escape.",
    ...productDemoHardRule,
    "- Product may appear in the opening when it is part of the hook situation.",
    "  Forbidden in the opening meaning block: sales pitch, offer language, CTA, pricing, 'buy/book/sign up now'.",
    "",
    integrityBlock,
    "",
    productDemoBlock,
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
      productDemonstrationIntegrity: plan.productDemonstrationIntegrity ?? null,
      regenerationReason: plan.regenerationReason,
      ...(diagnostics ? { creativeDnaDiagnostics: diagnostics } : {}),
    },
  };
}
