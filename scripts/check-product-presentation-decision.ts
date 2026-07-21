// npm run check:product-presentation-decision
import assert from "node:assert/strict";
import type { AssetRef } from "@/lib/ai/prompts/generateContentPackage";
import type { ProductRevealPlan } from "@/lib/product-reveal/types";
import type { VisualNarrativePlan } from "@/lib/visual-narrative/types";
import { isProductPresentationDecisionEnabled } from "@/lib/product-presentation/config";
import { planProductPresentationForPackage } from "@/lib/product-presentation/planForPackage";
import {
  productPresentationFieldsForPersistence,
  readProductPresentationFromBrief,
} from "@/lib/product-presentation/persistence";
import { resolveProductPresentationPlan } from "@/lib/product-presentation/resolveProductPresentation";
import {
  FORBIDDEN_PRESENTATION_FORMS,
  PRODUCT_PRESENTATION_VERSION,
} from "@/lib/product-presentation/types";

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log("  ok ", name);
  } catch (err) {
    failed++;
    console.error(" FAIL", name, err);
  }
}

function reveal(
  strategy: ProductRevealPlan["solution_beat_strategy"],
): ProductRevealPlan {
  return {
    version: "product-reveal@2",
    solution_beat_strategy: strategy,
    reasons: [`test_${strategy}`],
    sample_payoff_visual_required: false,
  };
}

function narrative(
  carrier: VisualNarrativePlan["primary_meaning_carrier"],
): VisualNarrativePlan {
  return {
    version: "visual-narrative@1.1",
    primary_meaning_carrier: carrier,
    subject_focus: "test",
    supporting_carriers: [],
    product_world_hints: [],
    recent_motif_counts: {},
    key: `test-${carrier}`,
    storytelling_mode: "situation_first",
    director_version: "vsd@1",
    preferred_situation_framing: "concrete",
    reject_abstract_riddles: true,
    metaphor_policy: "understandable_preferred",
  };
}

function uiAsset(id = "asset-ui-1"): AssetRef {
  return {
    id,
    title: "Dashboard screenshot",
    asset_class: "static",
    media_type: "image",
    product_role: "product_ui",
    asset_quality: "high",
    provenance_class: "client_upload",
    authenticity_for_product_claim: "eligible",
    recommended_presentation_classes: [
      "AUTHENTIC_PRODUCT_SURFACE",
      "AUTHENTIC_PRODUCT_IN_CONTEXT",
    ],
  };
}

function logoAsset(id = "asset-logo-1"): AssetRef {
  return {
    id,
    title: "Brand logo",
    asset_class: "static",
    media_type: "image",
    product_role: "logo",
    asset_quality: "high",
    provenance_class: "client_upload",
    authenticity_for_product_claim: "ineligible",
    recommended_presentation_classes: ["BRAND_SIGNAL_ONLY"],
  };
}

function weakScrapedUi(id = "scraped-weak"): AssetRef {
  return {
    id,
    title: "Scraped dashboard",
    asset_class: "static",
    media_type: "image",
    product_role: "dashboard",
    asset_quality: "high",
    provenance_class: "scraped",
    authenticity_for_product_claim: "weak",
    recommended_presentation_classes: [
      "PRODUCT_OUTCOME_WORLD",
      "ABSTRACT_MECHANISM",
    ],
  };
}

console.log("check:product-presentation-decision");

check("PPD always enabled (sole presentation runtime)", () => {
  assert.equal(isProductPresentationDecisionEnabled(), true);
});

check("null when no reveal plan", () => {
  const plan = resolveProductPresentationPlan({
    productReveal: null,
    assets: [uiAsset()],
    visualNarrative: narrative("product"),
  });
  assert.equal(plan, null);
});

check("REAL_ASSET + tier1 → AUTHENTIC_PRODUCT_SURFACE", () => {
  const plan = resolveProductPresentationPlan({
    productReveal: reveal("REAL_ASSET"),
    assets: [uiAsset("ui-a")],
    visualNarrative: narrative("product"),
  });
  assert.ok(plan);
  assert.equal(plan!.version, PRODUCT_PRESENTATION_VERSION);
  assert.equal(plan!.presentation_class, "AUTHENTIC_PRODUCT_SURFACE");
  assert.equal(plan!.appearance_claim, "AUTHENTIC");
  assert.equal(plan!.should_show_product_appearance, true);
  assert.deepEqual(plan!.asset_binding, ["ui-a"]);
  assert.equal(plan!.value_proof_mode, "via_authentic_appearance");
  assert.equal(plan!.compatible_with_reveal, true);
  assert.equal(plan!.reveal_ceiling, "REAL_ASSET");
  assert.ok(plan!.forbidden_forms.includes("synthetic_product_ui"));
  assert.equal(plan!.forbidden_forms.length, FORBIDDEN_PRESENTATION_FORMS.length);
});

check("FRAMED_ASSET + tier1 → AUTHENTIC_PRODUCT_IN_CONTEXT", () => {
  const plan = resolveProductPresentationPlan({
    productReveal: reveal("FRAMED_ASSET"),
    assets: [uiAsset()],
    visualNarrative: narrative("product"),
  });
  assert.equal(plan!.presentation_class, "AUTHENTIC_PRODUCT_IN_CONTEXT");
  assert.equal(plan!.appearance_claim, "AUTHENTIC");
});

check("NO_PRODUCT_VISUAL ignores assets → NO_PRODUCT_APPEARANCE", () => {
  const plan = resolveProductPresentationPlan({
    productReveal: reveal("NO_PRODUCT_VISUAL"),
    assets: [uiAsset()],
    visualNarrative: narrative("human"),
  });
  assert.equal(plan!.presentation_class, "NO_PRODUCT_APPEARANCE");
  assert.equal(plan!.appearance_claim, "NONE");
  assert.equal(plan!.should_show_product_appearance, false);
  assert.deepEqual(plan!.asset_binding, []);
  assert.equal(plan!.compatible_with_reveal, true);
});

check("PRODUCT_OUTCOME → PRODUCT_OUTCOME_WORLD (never AUTHENTIC)", () => {
  const plan = resolveProductPresentationPlan({
    productReveal: reveal("PRODUCT_OUTCOME"),
    assets: [uiAsset()],
    visualNarrative: narrative("human"),
  });
  assert.equal(plan!.presentation_class, "PRODUCT_OUTCOME_WORLD");
  assert.equal(plan!.appearance_claim, "NON_PRODUCT");
  assert.notEqual(plan!.appearance_claim, "AUTHENTIC");
});

check("ABSTRACT_PRODUCT_SYSTEM → ABSTRACT_MECHANISM", () => {
  const plan = resolveProductPresentationPlan({
    productReveal: reveal("ABSTRACT_PRODUCT_SYSTEM"),
    assets: [uiAsset()],
    visualNarrative: narrative("process"),
  });
  assert.equal(plan!.presentation_class, "ABSTRACT_MECHANISM");
  assert.equal(plan!.value_proof_mode, "via_abstract_mechanism");
});

check("REAL_ASSET without tier1/2 but logo → BRAND_SIGNAL_ONLY", () => {
  const plan = resolveProductPresentationPlan({
    productReveal: reveal("REAL_ASSET"),
    assets: [logoAsset("logo-x")],
    visualNarrative: narrative("product"),
  });
  assert.equal(plan!.presentation_class, "BRAND_SIGNAL_ONLY");
  assert.equal(plan!.appearance_claim, "NON_PRODUCT");
  assert.deepEqual(plan!.asset_binding, ["logo-x"]);
  assert.equal(plan!.fidelity_tier, "brand_only");
});

check("REAL_ASSET scarcity + human carrier → PRODUCT_OUTCOME_WORLD", () => {
  const plan = resolveProductPresentationPlan({
    productReveal: reveal("REAL_ASSET"),
    assets: [],
    visualNarrative: narrative("human"),
  });
  assert.equal(plan!.presentation_class, "PRODUCT_OUTCOME_WORLD");
  assert.equal(plan!.value_proof_mode, "via_world_outcome");
});

check("persistence round-trip", () => {
  const plan = resolveProductPresentationPlan({
    productReveal: reveal("REAL_ASSET"),
    assets: [uiAsset("persist-1")],
    visualNarrative: narrative("product"),
  })!;
  const fields = productPresentationFieldsForPersistence(plan);
  const brief = { presentation_generation: { ...fields } };
  const read = readProductPresentationFromBrief(brief);
  assert.ok(read);
  assert.equal(read!.presentation_class, plan.presentation_class);
  assert.deepEqual(read!.asset_binding, ["persist-1"]);
});

check("wrapper computes plan and persistence", () => {
  const wrapped = planProductPresentationForPackage({
    productReveal: reveal("REAL_ASSET"),
    assets: [uiAsset()],
    visualNarrative: narrative("product"),
  });
  assert.equal(wrapped.enabled, true);
  assert.ok(wrapped.plan);
  assert.ok(
    (wrapped.persistenceFields as { product_presentation?: unknown })
      .product_presentation,
  );
});

check("FRAMED_ASSET wrapper", () => {
  const wrapped = planProductPresentationForPackage({
    productReveal: reveal("FRAMED_ASSET"),
    assets: [uiAsset("wrap-1")],
    visualNarrative: narrative("product"),
  });
  assert.equal(wrapped.enabled, true);
  assert.ok(wrapped.plan);
  assert.equal(wrapped.plan!.presentation_class, "AUTHENTIC_PRODUCT_IN_CONTEXT");
});

check("PPD prefers eligible asset over weak asset", () => {
  const plan = resolveProductPresentationPlan({
    productReveal: reveal("REAL_ASSET"),
    assets: [weakScrapedUi("weak-1"), uiAsset("eligible-1")],
    visualNarrative: narrative("product"),
  });
  assert.deepEqual(plan!.asset_binding, ["eligible-1"]);
  assert.equal(plan!.appearance_claim, "AUTHENTIC");
});

check("PPD never AUTHENTIC without eligible asset binding", () => {
  const plan = resolveProductPresentationPlan({
    productReveal: reveal("REAL_ASSET"),
    assets: [weakScrapedUi("only-weak")],
    visualNarrative: narrative("human"),
  });
  assert.notEqual(plan!.appearance_claim, "AUTHENTIC");
  assert.equal(plan!.should_show_product_appearance, false);
  assert.ok(!plan!.asset_binding.includes("only-weak") || plan!.presentation_class !== "AUTHENTIC_PRODUCT_SURFACE");
  assert.equal(plan!.presentation_class, "PRODUCT_OUTCOME_WORLD");
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
