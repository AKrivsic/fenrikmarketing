import { runComparativeJudge, selectWinner } from "@/lib/creative-candidates/comparativeJudge";
import { generateCreativeCandidatesWithDivergence } from "@/lib/creative-candidates/generateCandidates";
import { extractTopicConcreteSignals } from "@/lib/creative-candidates/topicSignals";
import { applyGenericityRejections } from "@/lib/creative-candidates/scoreCandidates";
import {
  buildCreativeCandidatePromptBlock,
  buildCreativeDnaPromptBlockFromPlan,
  creativeCandidateFieldsForPersistence,
} from "@/lib/creative-candidates/promptBlocks";
import {
  CREATIVE_CANDIDATE_VERSION,
  type ConceptFidelityResult,
  type CreativeCandidate,
  type CreativeCandidatePlan,
} from "@/lib/creative-candidates/types";
import {
  normalizeCreativeDNA,
  resolveCandidateCreativeDNA,
  type CreativeDnaDiagnostics,
  type CreativeDnaResolveResult,
  type CreativeDnaSource,
} from "@/lib/creative-candidates/creativeDNA";

function productLabel(productIs: readonly string[]): string {
  const p = productIs.find((x) => x.trim());
  return p?.trim() || "the product";
}

function painLabel(painPoints: readonly string[]): string {
  const p = painPoints.find((x) => x.trim());
  return p?.trim() || "unanswered demand";
}

/**
 * Ensure winner DNA is resolved (authored preferred; fallback for historical).
 * Does not overwrite valid model-authored DNA.
 */
export function ensureCandidateCreativeDNA(
  candidate: CreativeCandidate,
  ctx: {
    topic: string;
    angle?: string | null;
    painPoints?: readonly string[];
    productIs?: readonly string[];
  },
): { candidate: CreativeCandidate; resolve: CreativeDnaResolveResult } {
  const signals = extractTopicConcreteSignals(ctx.topic, ctx.angle, {
    productIs: ctx.productIs,
  });
  const { creativeDNA, creativeDnaSource: _s, ...rest } = candidate;
  const resolve = resolveCandidateCreativeDNA({
    candidate: rest,
    authoredDna: creativeDNA,
    ctx: {
      signals,
      product: productLabel(ctx.productIs ?? []),
      pain: painLabel(ctx.painPoints ?? []),
      productIs: ctx.productIs,
    },
  });

  // Preserve existing model source when DNA was already authored and accepted
  let source: CreativeDnaSource = resolve.source;
  if (
    candidate.creativeDnaSource === "model" &&
    resolve.source === "model" &&
    normalizeCreativeDNA(candidate.creativeDNA)
  ) {
    source = "model";
  }

  return {
    resolve,
    candidate: {
      ...candidate,
      creativeDNA: resolve.dna,
      creativeDnaSource: source,
    },
  };
}

export function planCreativeCandidatesForPackage(args: {
  topic: string;
  angle?: string | null;
  painPoints?: readonly string[];
  productIs?: readonly string[];
  requireVideo: boolean;
}): {
  plan: CreativeCandidatePlan | null;
  promptBlock: string;
  /** DNA section only; empty when DNA absent. */
  dnaPromptBlock: string;
  persistenceFields: Record<string, unknown>;
  dnaResolve: CreativeDnaResolveResult | null;
} {
  if (!args.requireVideo) {
    return {
      plan: null,
      promptBlock: "",
      dnaPromptBlock: "",
      persistenceFields: {},
      dnaResolve: null,
    };
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
  const selectionDiagnostics = comparativeJudge.selectionDiagnostics;

  // Persist judge without nested diagnostics object (kept on plan root)
  const { selectionDiagnostics: _diag, ...judgeForPlan } = comparativeJudge;

  const { candidate: selectedCandidate, resolve: dnaResolve } =
    ensureCandidateCreativeDNA(winnerScored.candidate, args);

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
    selectedCandidate,
    comparativeJudge: judgeForPlan,
    selectionDiagnostics,
    finalScriptFidelity: null,
    finalStoryboardFidelity: null,
    regenerationReason: null,
  };

  return {
    plan,
    promptBlock: buildCreativeCandidatePromptBlock(plan),
    dnaPromptBlock: buildCreativeDnaPromptBlockFromPlan(plan),
    persistenceFields: creativeCandidateFieldsForPersistence(plan),
    dnaResolve,
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

export function attachStoryIntegrityToPlan(
  plan: CreativeCandidatePlan,
  storyIntegrity: import("@/lib/creative-candidates/storyIntegrity").StoryIntegrityResult,
  regenerationReason?: string | null,
): CreativeCandidatePlan {
  return {
    ...plan,
    storyIntegrity,
    regenerationReason:
      regenerationReason !== undefined
        ? regenerationReason
        : plan.regenerationReason,
  };
}

export function buildCreativeDnaDiagnostics(args: {
  plan: CreativeCandidatePlan;
  identityEnvironmentSuppressed: boolean;
  validation: CreativeDnaDiagnostics["validation"];
  dnaResolve?: CreativeDnaResolveResult | null;
}): CreativeDnaDiagnostics {
  const dna = normalizeCreativeDNA(args.plan.selectedCandidate.creativeDNA);
  const resolve = args.dnaResolve;
  const source: CreativeDnaSource =
    resolve?.source ??
    args.plan.selectedCandidate.creativeDnaSource ??
    (dna ? "model" : "missing");

  return {
    present: Boolean(dna),
    candidateId: args.plan.selectedCandidate.candidateId,
    candidateVersion: args.plan.version,
    dnaPromptVersion: "creative-dna@1",
    identityEnvironmentSuppressed: args.identityEnvironmentSuppressed,
    creativeDnaSource: source,
    fallbackUsed: resolve?.fallbackUsed ?? source === "deterministic_fallback",
    fallbackReason: resolve?.fallbackReason ?? null,
    modelDnaConsistency: resolve?.consistency ?? null,
    validation: args.validation,
  };
}
