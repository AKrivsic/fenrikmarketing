import type {
  ProofIndex,
  ProofStatisticCandidate,
} from "@/lib/scene-types/presentation/proofIndex";
import type { StatisticScenePayload } from "@/lib/scene-types/statistic/statisticScenePayload";
import {
  digitSignatureForStatistic,
  normalizeStatisticUnit,
} from "@/lib/scene-types/statistic/parseStatisticCandidates";
import {
  narrationContainsPhrase,
  normalizePresentationText,
  tokenOverlapRatio,
} from "@/lib/scene-types/presentation/textMatch";

export function resolveStatisticCandidate(
  proof: ProofIndex,
  proofId: string,
): ProofStatisticCandidate | null {
  return proof.statisticCandidates.find((c) => c.id === proofId) ?? null;
}

export function statisticValueUnitMatches(
  candidate: ProofStatisticCandidate,
  payload: Pick<StatisticScenePayload, "value" | "unit">,
): boolean {
  const candUnit = normalizeStatisticUnit(candidate.unit);
  const payUnit = normalizeStatisticUnit(payload.unit);

  let payValue = payload.value.trim();
  let payUnitEffective = payUnit;
  if (payValue.includes("%") && !payUnitEffective) {
    payValue = payValue.replace(/%/g, "").trim();
    payUnitEffective = "%";
  }

  const candSig = digitSignatureForStatistic(candidate.value, candUnit);
  const paySig = digitSignatureForStatistic(payValue, payUnitEffective);
  if (!candSig || candSig !== paySig) return false;

  if (candUnit !== payUnitEffective) {
    if (!(candUnit === "%" && payUnitEffective === "%")) return false;
  }
  return true;
}

export function statisticLabelMatches(
  candidate: ProofStatisticCandidate,
  label: string,
): boolean {
  const approved = normalizePresentationText(candidate.label);
  const given = normalizePresentationText(label);
  if (!approved || !given) return false;
  if (approved === given) return true;
  if (approved.includes(given) || given.includes(approved)) return true;
  return tokenOverlapRatio(approved, given) >= 0.55;
}

export function narrationSupportsStatisticBeat(
  narration: string,
  candidate: ProofStatisticCandidate,
): boolean {
  const n = normalizePresentationText(narration);
  if (!n) return false;
  const valueDigits = digitSignatureForStatistic(candidate.value, candidate.unit);
  const narrDigits = (n.match(/\d+/g) ?? []).join("|");
  if (valueDigits && narrDigits.includes(valueDigits.split("|")[0] ?? "")) {
    return true;
  }
  if (/\b(\d+|percent|percentage|faster|hours|minutes|customers|users|data|metric|results?)\b/i.test(n)) {
    return tokenOverlapRatio(candidate.label, narration) >= 0.25;
  }
  return (
    narrationContainsPhrase(n, candidate.label, 0.35) ||
    tokenOverlapRatio(candidate.originalStatement, narration) >= 0.3
  );
}

export function validateStatisticSceneEligibility(args: {
  payload: StatisticScenePayload;
  proof: ProofIndex;
  narration: string;
}):
  | { ok: true; candidate: ProofStatisticCandidate }
  | { ok: false; rule: string; reason: string } {
  const candidate = resolveStatisticCandidate(args.proof, args.payload.proof_id);
  if (!candidate) {
    return {
      ok: false,
      rule: "statistic_proof_not_found",
      reason: "proof_id does not resolve to an approved statistic candidate",
    };
  }

  if (!statisticValueUnitMatches(candidate, args.payload)) {
    return {
      ok: false,
      rule: "statistic_value_mismatch",
      reason: "value or unit does not match approved proof",
    };
  }

  const payUnit = normalizeStatisticUnit(args.payload.unit);
  const candUnit = normalizeStatisticUnit(candidate.unit);
  if (payUnit && candUnit && payUnit !== candUnit) {
    return {
      ok: false,
      rule: "statistic_unit_mismatch",
      reason: "unit does not match approved proof",
    };
  }

  if (!statisticLabelMatches(candidate, args.payload.label)) {
    return {
      ok: false,
      rule: "statistic_label_mismatch",
      reason: "label does not match approved proof claim",
    };
  }

  if (!narrationSupportsStatisticBeat(args.narration, candidate)) {
    return {
      ok: false,
      rule: "statistic_narration_not_supported",
      reason: "narration does not support presenting this metric",
    };
  }

  return { ok: true, candidate };
}
