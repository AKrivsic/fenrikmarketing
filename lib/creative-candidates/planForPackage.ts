import { extractTopicConcreteSignals } from "@/lib/creative-candidates/topicSignals";
import type {
  ConceptFidelityResult,
  CreativeCandidate,
  CreativeCandidatePlan,
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

export function attachProductDemonstrationIntegrityToPlan(
  plan: CreativeCandidatePlan,
  productDemonstrationIntegrity: import("@/lib/creative-candidates/productDemonstrationIntegrity").ProductDemonstrationIntegrityResult,
  regenerationReason?: string | null,
): CreativeCandidatePlan {
  return {
    ...plan,
    productDemonstrationIntegrity,
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
