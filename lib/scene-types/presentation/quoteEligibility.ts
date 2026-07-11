import type { ProofIndex, ProofQuoteCandidate } from "@/lib/scene-types/presentation/proofIndex";
import {
  attributionMatchesApproved,
  quoteTextMatchesApproved,
} from "@/lib/scene-types/presentation/proofIndex";
import type { QuoteScenePayload } from "@/lib/scene-types/quote/quoteScenePayload";
import {
  narrationContainsPhrase,
  normalizePresentationText,
  tokenOverlapRatio,
} from "@/lib/scene-types/presentation/textMatch";

export function resolveQuoteCandidate(
  proof: ProofIndex,
  proofId: string,
): ProofQuoteCandidate | null {
  return proof.quoteCandidates.find((c) => c.id === proofId) ?? null;
}

export function narrationSupportsQuoteBeat(
  narration: string,
  quote: string,
): boolean {
  const n = normalizePresentationText(narration);
  if (!n) return false;
  if (/\b(customer|client|testimonial|review|said|says|hear from|feedback|trust)\b/i.test(n)) {
    return true;
  }
  if (tokenOverlapRatio(quote, narration) >= 0.28) return true;
  if (narrationContainsPhrase(n, quote, 0.35)) return true;
  return false;
}

export function validateQuoteSceneEligibility(args: {
  payload: QuoteScenePayload;
  proof: ProofIndex;
  narration: string;
}):
  | { ok: true; candidate: ProofQuoteCandidate }
  | { ok: false; rule: string; reason: string } {
  const candidate = resolveQuoteCandidate(args.proof, args.payload.proof_id);
  if (!candidate) {
    return {
      ok: false,
      rule: "quote_proof_not_found",
      reason: "proof_id does not resolve to an approved quote candidate",
    };
  }

  if (!quoteTextMatchesApproved(candidate.quote, args.payload.quote)) {
    return {
      ok: false,
      rule: "quote_text_mismatch",
      reason: "quote text does not match approved source",
    };
  }

  if (!attributionMatchesApproved(candidate, args.payload.attribution)) {
    return {
      ok: false,
      rule: "quote_attribution_mismatch",
      reason: "attribution does not match approved source",
    };
  }

  if (!narrationSupportsQuoteBeat(args.narration, args.payload.quote)) {
    return {
      ok: false,
      rule: "quote_narration_not_supported",
      reason: "narration does not support presenting this quote",
    };
  }

  return { ok: true, candidate };
}
