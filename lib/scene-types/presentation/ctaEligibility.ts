import type { CtaScenePayload } from "@/lib/scene-types/cta/ctaScenePayload";
import type { AuthoritativeCtaReference } from "@/lib/scene-types/cta/ctaSourceOfTruth";
import {
  narrationContainsPhrase,
  normalizePresentationText,
  tokenOverlapRatio,
} from "@/lib/scene-types/presentation/textMatch";

export const CTA_UNSUPPORTED_CLAIM =
  /\b(\d+\s*%\s*off|discount|coupon|limited time|expires|countdown|money back|guarantee|risk-free|risk free|free trial|today only|last chance|act now|hurry|while supplies|#1|number one|best in class|lowest price|\$\d+|€\d+)\b/i;

export const CTA_SCARCITY_OR_SUPERLATIVE =
  /\b(best|#1|number one|leading|top-rated|top rated|lowest|cheapest)\b/i;

export function ctaCopyContainsUnsupportedClaim(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return (
    CTA_UNSUPPORTED_CLAIM.test(t) ||
    CTA_SCARCITY_OR_SUPERLATIVE.test(t)
  );
}

export function ctaFieldAlignsWithReference(
  field: string,
  reference: AuthoritativeCtaReference,
): boolean {
  const ref = normalizePresentationText(reference.text);
  const given = normalizePresentationText(field);
  if (!given || !ref) return false;
  if (ref === given) return true;
  if (ref.includes(given) || given.includes(ref)) return true;
  return (
    narrationContainsPhrase(reference.text, field, 0.4) ||
    narrationContainsPhrase(field, reference.text, 0.4) ||
    tokenOverlapRatio(ref, given) >= 0.45
  );
}

export function validateCtaSceneEligibility(args: {
  payload: CtaScenePayload;
  reference: AuthoritativeCtaReference | null;
  sceneIndex: number;
  sceneCount: number;
}):
  | { ok: true }
  | { ok: false; rule: string; reason: string } {
  if (!args.reference) {
    return {
      ok: false,
      rule: "cta_not_permitted",
      reason: "no authoritative package or project CTA to align with",
    };
  }

  const combined = [
    args.payload.headline,
    args.payload.subline ?? "",
    args.payload.button_label ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  if (ctaCopyContainsUnsupportedClaim(combined)) {
    return {
      ok: false,
      rule: "cta_unsupported_claim",
      reason: "cta copy contains unsupported offer, urgency, or superlative",
    };
  }

  const actionFields = [
    args.payload.headline,
    args.payload.subline ?? "",
    args.payload.button_label ?? "",
  ].filter((f) => typeof f === "string" && f.trim().length > 0) as string[];

  const actionAligns = actionFields.some((field) =>
    ctaFieldAlignsWithReference(field, args.reference),
  );
  if (!actionAligns) {
    return {
      ok: false,
      rule: "cta_action_mismatch",
      reason: "no CTA field matches package or project CTA action",
    };
  }

  if (
    args.payload.subline &&
    ctaCopyContainsUnsupportedClaim(args.payload.subline)
  ) {
    return {
      ok: false,
      rule: "cta_unsupported_claim",
      reason: "subline contains unsupported claim",
    };
  }

  if (args.payload.button_label) {
    if (ctaCopyContainsUnsupportedClaim(args.payload.button_label)) {
      return {
        ok: false,
        rule: "cta_unsupported_claim",
        reason: "button label contains unsupported claim",
      };
    }
    const buttonOk =
      ctaFieldAlignsWithReference(args.payload.button_label, args.reference) ||
      actionAligns;
    if (!buttonOk) {
      return {
        ok: false,
        rule: "cta_action_mismatch",
        reason: "button label does not preserve the same CTA action",
      };
    }
  }

  const lastIndex = args.sceneCount - 1;
  if (args.sceneIndex !== lastIndex) {
    return {
      ok: false,
      rule: "cta_not_final_scene",
      reason: "CTA scene must be the final visual scene",
    };
  }

  return { ok: true };
}
