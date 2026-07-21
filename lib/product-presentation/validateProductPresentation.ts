/**
 * Wave 3 — validate package presentation against Product Presentation Decision.
 * Runs only when PRODUCT_PRESENTATION_DECISION_ENABLED=true and a plan exists.
 * Does not remove PRODUCT_DEMO; separates value proof from product screenshot.
 */
import type { AssetRef } from "@/lib/ai/prompts/generateContentPackage";
import {
  isEligibleForAuthenticProductClaim,
  type AuthenticityForProductClaim,
} from "@/lib/assets/productPresentationMetadata";
import type {
  ForbiddenPresentationForm,
  ProductPresentationPlan,
} from "./types";
import {
  ppdAuthorizesPresentationWithoutProductDemo,
  valueProofViaAuthenticAppearance,
} from "./valueProof";

export const PRODUCT_PRESENTATION_VALIDATION_VERSION =
  "product-presentation-validation@1" as const;

export type ProductPresentationViolationCode =
  | "authentic_without_eligible_binding"
  | "authentic_binding_not_eligible"
  | "logo_cannot_be_authentic"
  | "synthetic_product_ui_forbidden"
  | "invented_screenshot_forbidden"
  | "generic_chat_as_product_forbidden"
  | "generic_dashboard_as_product_forbidden"
  | "brand_logo_as_product_demo_forbidden"
  | "landing_page_alone_as_value_proof"
  | "value_proof_unsatisfied"
  | "incompatible_with_reveal";

export interface ProductPresentationViolation {
  code: ProductPresentationViolationCode;
  message: string;
  evidence?: string;
  forbidden_form?: ForbiddenPresentationForm;
}

export interface ProductPresentationValidationResult {
  version: typeof PRODUCT_PRESENTATION_VALIDATION_VERSION;
  /** False when flag off or no plan — caller should not treat as a hard gate. */
  active: boolean;
  passed: boolean;
  violations: ProductPresentationViolation[];
  summary: string;
  /** Value proof accepted without requiring PRODUCT_DEMO / product screenshot. */
  value_proof_without_product_demo: boolean;
  appearance_claim: ProductPresentationPlan["appearance_claim"] | null;
}

function sceneTexts(visualScenes: readonly unknown[] | null | undefined): string[] {
  const out: string[] = [];
  for (const s of visualScenes ?? []) {
    if (!s || typeof s !== "object" || Array.isArray(s)) continue;
    const r = s as Record<string, unknown>;
    if (typeof r.image_prompt === "string" && r.image_prompt.trim()) {
      out.push(r.image_prompt);
    }
    if (typeof r.used_as === "string" && r.used_as.trim()) {
      out.push(r.used_as);
    }
  }
  return out;
}

function authenticityForAsset(
  assetId: string,
  assets: readonly AssetRef[] | null | undefined,
): AuthenticityForProductClaim | null {
  const hit = (assets ?? []).find((a) => a.id === assetId);
  if (!hit) return null;
  return hit.authenticity_for_product_claim ?? null;
}

function detectForbiddenFormsInScenes(
  texts: readonly string[],
  plan: ProductPresentationPlan,
): ProductPresentationViolation[] {
  const blob = texts.join("\n");
  const violations: ProductPresentationViolation[] = [];
  const forbidden = new Set(plan.forbidden_forms);

  const push = (
    form: ForbiddenPresentationForm,
    code: ProductPresentationViolationCode,
    message: string,
    re: RegExp,
  ) => {
    if (!forbidden.has(form)) return;
    if (!re.test(blob)) return;
    violations.push({
      code,
      message,
      forbidden_form: form,
      evidence: blob.slice(0, 160),
    });
  };

  push(
    "synthetic_product_ui",
    "synthetic_product_ui_forbidden",
    "Synthetic / invented product UI is forbidden as product appearance",
    /\b(synthetic|invented|fake)\b[^.\n]{0,40}\b(product\s+ui|ui|dashboard|interface|screenshot)\b/i,
  );
  push(
    "invented_screenshot",
    "invented_screenshot_forbidden",
    "Invented screenshots are forbidden as authentic product appearance",
    /\b(invented|made[- ]up|fabricated)\b[^.\n]{0,40}\b(screenshot|ui|dashboard)\b/i,
  );
  push(
    "generic_dashboard_as_product",
    "generic_dashboard_as_product_forbidden",
    "Generic dashboard-as-product is forbidden",
    /\bgeneric\b[^.\n]{0,30}\b(dashboard|admin panel|saas ui)\b/i,
  );

  // generic_chat_as_product: only when claiming AUTHENTIC without eligible binding
  // (PRODUCT_DEMO dual-run presence alone must not auto-fail).
  if (
    forbidden.has("generic_chat_as_product") &&
    plan.appearance_claim === "AUTHENTIC" &&
    plan.asset_binding.length === 0 &&
    /\b(generic\s+chat|fake\s+chat\s+ui|invented\s+chat\s+interface)\b/i.test(blob)
  ) {
    violations.push({
      code: "generic_chat_as_product_forbidden",
      message:
        "Generic chat-as-product is forbidden for AUTHENTIC appearance without eligible binding",
      forbidden_form: "generic_chat_as_product",
      evidence: blob.slice(0, 160),
    });
  }

  if (
    forbidden.has("brand_logo_as_product_demo") &&
    plan.appearance_claim === "AUTHENTIC" &&
    /\blogo\b[^.\n]{0,40}\b(as\s+)?(product\s+demo|product\s+proof|product\s+appearance)\b/i.test(
      blob,
    )
  ) {
    violations.push({
      code: "brand_logo_as_product_demo_forbidden",
      message: "Brand logo must not be treated as authentic product demonstration",
      forbidden_form: "brand_logo_as_product_demo",
      evidence: blob.slice(0, 160),
    });
  }

  if (
    forbidden.has("landing_page_alone_as_value_proof") &&
    plan.appearance_claim === "AUTHENTIC" &&
    /\b(landing\s+page|pricing\s+hero|homepage\s+hero)\b/i.test(blob) &&
    !/\b(product_ui|dashboard|framed|screen\s+insert|asset)\b/i.test(blob) &&
    plan.asset_binding.length === 0
  ) {
    violations.push({
      code: "landing_page_alone_as_value_proof",
      message:
        "Landing page alone is not valid AUTHENTIC value proof without eligible product asset binding",
      forbidden_form: "landing_page_alone_as_value_proof",
      evidence: blob.slice(0, 160),
    });
  }

  return violations;
}

/**
 * Validate presentation against PPD. When flag is off or plan is null, returns
 * inactive pass (legacy SI/PDI remain the authority).
 */
export function validateProductPresentationPackage(args: {
  plan: ProductPresentationPlan | null | undefined;
  visualScenes?: readonly unknown[] | null;
  assets?: readonly AssetRef[] | null;
}): ProductPresentationValidationResult {
  const plan = args.plan ?? null;

  if (!plan) {
    return {
      version: PRODUCT_PRESENTATION_VALIDATION_VERSION,
      active: false,
      passed: true,
      violations: [],
      summary: "ppd_validation_inactive_no_plan",
      value_proof_without_product_demo: false,
      appearance_claim: null,
    };
  }

  const violations: ProductPresentationViolation[] = [];
  const texts = sceneTexts(args.visualScenes);

  if (plan.value_proof_mode === "unsatisfied") {
    violations.push({
      code: "value_proof_unsatisfied",
      message: "Product Presentation Decision reports unsatisfied value proof",
      evidence: plan.presentation_class,
    });
  }

  if (plan.compatible_with_reveal === false) {
    violations.push({
      code: "incompatible_with_reveal",
      message: "PPD appearance claim exceeds Product Reveal ceiling",
      evidence: `claim=${plan.appearance_claim} ceiling=${plan.reveal_ceiling}`,
    });
  }

  if (plan.appearance_claim === "AUTHENTIC") {
    if (plan.asset_binding.length === 0) {
      violations.push({
        code: "authentic_without_eligible_binding",
        message:
          "AUTHENTIC appearance claim requires an eligible authentic asset binding",
      });
    } else {
      for (const id of plan.asset_binding) {
        const authenticity = authenticityForAsset(id, args.assets);
        // Missing asset from pool: trust plan only if no assets provided (unit tests).
        if (args.assets && args.assets.length > 0) {
          if (authenticity === null) {
            violations.push({
              code: "authentic_binding_not_eligible",
              message: `AUTHENTIC binding ${id} not found among available assets`,
              evidence: id,
            });
          } else if (!isEligibleForAuthenticProductClaim(authenticity)) {
            violations.push({
              code: "authentic_binding_not_eligible",
              message: `AUTHENTIC binding ${id} is not authenticity=eligible (${authenticity})`,
              evidence: id,
            });
          }
        }
      }
    }

    const boundAssets = (args.assets ?? []).filter((a) =>
      plan.asset_binding.includes(a.id),
    );
    if (boundAssets.some((a) => a.product_role === "logo")) {
      violations.push({
        code: "logo_cannot_be_authentic",
        message: "Logo must not carry AUTHENTIC product appearance claim",
      });
    }
  }

  violations.push(...detectForbiddenFormsInScenes(texts, plan));

  const passed = violations.length === 0;
  return {
    version: PRODUCT_PRESENTATION_VALIDATION_VERSION,
    active: true,
    passed,
    violations,
    summary: passed
      ? "product_presentation_validation_passed"
      : `product_presentation_validation_failed:${violations.map((v) => v.code).join(",")}`,
    value_proof_without_product_demo:
      ppdAuthorizesPresentationWithoutProductDemo(plan) &&
      !valueProofViaAuthenticAppearance(plan),
    appearance_claim: plan.appearance_claim,
  };
}

export function productPresentationValidationIssues(
  result: ProductPresentationValidationResult,
): { path: string; message: string }[] {
  if (!result.active || result.passed) return [];
  return result.violations.map((v) => ({
    path: "product_presentation",
    message: `${v.code}: ${v.message}`,
  }));
}

export function productPresentationFieldsForValidationPersistence(
  result: ProductPresentationValidationResult,
): Record<string, unknown> {
  if (!result.active) return {};
  return {
    product_presentation_validation: {
      version: result.version,
      passed: result.passed,
      summary: result.summary,
      value_proof_without_product_demo: result.value_proof_without_product_demo,
      appearance_claim: result.appearance_claim,
      violations: result.violations,
    },
  };
}
