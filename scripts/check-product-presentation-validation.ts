// npm run check:product-presentation-validation
import assert from "node:assert/strict";
import type { AssetRef } from "@/lib/ai/prompts/generateContentPackage";
import {
  FORBIDDEN_PRESENTATION_FORMS,
  PRODUCT_PRESENTATION_VERSION,
  type ProductPresentationPlan,
} from "@/lib/product-presentation/types";
import { validateProductPresentationPackage } from "@/lib/product-presentation/validateProductPresentation";
import { validateStoryIntegrity } from "@/lib/creative-candidates/storyIntegrity";
import { validateProductDemonstrationIntegrity } from "@/lib/creative-candidates/productDemonstrationIntegrity";
import type { CreativeCandidate } from "@/lib/creative-candidates/types";

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

function basePlan(
  partial: Partial<ProductPresentationPlan>,
): ProductPresentationPlan {
  return {
    version: PRODUCT_PRESENTATION_VERSION,
    should_show_product_appearance: false,
    presentation_class: "NO_PRODUCT_APPEARANCE",
    fidelity_tier: "none",
    asset_binding: [],
    appearance_claim: "NONE",
    value_proof_mode: "via_story_without_product_pixels",
    forbidden_forms: [...FORBIDDEN_PRESENTATION_FORMS],
    reveal_ceiling: "NO_PRODUCT_VISUAL",
    compatible_with_reveal: true,
    rationale: ["test"],
    ...partial,
  };
}

function eligibleUi(id = "ui-elig"): AssetRef {
  return {
    id,
    title: "UI",
    asset_class: "static",
    media_type: "image",
    product_role: "product_ui",
    asset_quality: "high",
    provenance_class: "client_upload",
    authenticity_for_product_claim: "eligible",
  };
}

function weakUi(id = "ui-weak"): AssetRef {
  return {
    id,
    title: "Weak UI",
    asset_class: "static",
    media_type: "image",
    product_role: "product_ui",
    asset_quality: "high",
    provenance_class: "scraped",
    authenticity_for_product_claim: "weak",
  };
}

function logo(id = "logo-1"): AssetRef {
  return {
    id,
    title: "Logo",
    asset_class: "static",
    media_type: "image",
    product_role: "logo",
    asset_quality: "high",
    provenance_class: "client_upload",
    authenticity_for_product_claim: "ineligible",
  };
}

function minimalWinner(): CreativeCandidate {
  return {
    candidateId: "c-test",
    family: "direct_product_world",
    coreIdea: "Customer hands ask a question; product answers",
    emotionalReaction: "relief",
    hookLine: "Questions go unanswered.",
    openingSituation: "Customer hands typing a question on a phone",
    visualPromise: "Hands on phone unanswered thread",
    storyProgression: "Problem → answer → booking",
    productConnection: "Product answers the visitor",
    ending: "Visitor books",
    expectedViewerQuestion: "What happens next?",
    familiarityRisk: "medium",
    memorabilityReason: "hands",
    creativeDNA: {
      world: "Customer hands on a phone unanswered thread",
      mainCharacter: "Customer hands",
      coreConflict: "Unanswered questions",
      productRole: "Answers the visitor",
      viewerQuestion: "What happens next?",
      endingIntent: "Visitor gets an answer",
      immutableRules: ["Stay in phone world"],
    },
    creativeDnaSource: "model",
  };
}

const outcomeScenes = [
  {
    source: "ai",
    image_prompt: "Customer hands holding a phone with an unanswered question",
  },
  {
    source: "ai",
    image_prompt: "Visitor looks relieved after receiving a clear answer in the world",
  },
  {
    source: "ai",
    image_prompt: "Visitor completes a booking confirmation on paper at the desk",
  },
];

console.log("check:product-presentation-validation");

check("AUTHENTIC without eligible binding → fail", () => {
  const prev = process.env.PRODUCT_PRESENTATION_DECISION_ENABLED;
  process.env.PRODUCT_PRESENTATION_DECISION_ENABLED = "true";
  try {
    const result = validateProductPresentationPackage({
      plan: basePlan({
        should_show_product_appearance: true,
        presentation_class: "AUTHENTIC_PRODUCT_SURFACE",
        fidelity_tier: "authentic_asset",
        appearance_claim: "AUTHENTIC",
        value_proof_mode: "via_authentic_appearance",
        asset_binding: [],
        reveal_ceiling: "REAL_ASSET",
      }),
      assets: [eligibleUi()],
    });
    assert.equal(result.active, true);
    assert.equal(result.passed, false);
    assert.ok(
      result.violations.some((v) => v.code === "authentic_without_eligible_binding"),
    );
  } finally {
    if (prev === undefined) delete process.env.PRODUCT_PRESENTATION_DECISION_ENABLED;
    else process.env.PRODUCT_PRESENTATION_DECISION_ENABLED = prev;
  }
});

check("AUTHENTIC with eligible binding → pass", () => {
  const prev = process.env.PRODUCT_PRESENTATION_DECISION_ENABLED;
  process.env.PRODUCT_PRESENTATION_DECISION_ENABLED = "true";
  try {
    const result = validateProductPresentationPackage({
      plan: basePlan({
        should_show_product_appearance: true,
        presentation_class: "AUTHENTIC_PRODUCT_SURFACE",
        fidelity_tier: "authentic_asset",
        appearance_claim: "AUTHENTIC",
        value_proof_mode: "via_authentic_appearance",
        asset_binding: ["ui-elig"],
        reveal_ceiling: "REAL_ASSET",
      }),
      visualScenes: [
        { source: "asset", asset_id: "ui-elig", used_as: "framed screen insert" },
      ],
      assets: [eligibleUi("ui-elig")],
    });
    assert.equal(result.passed, true);
  } finally {
    if (prev === undefined) delete process.env.PRODUCT_PRESENTATION_DECISION_ENABLED;
    else process.env.PRODUCT_PRESENTATION_DECISION_ENABLED = prev;
  }
});

check("AUTHENTIC bound to weak asset → fail", () => {
  const prev = process.env.PRODUCT_PRESENTATION_DECISION_ENABLED;
  process.env.PRODUCT_PRESENTATION_DECISION_ENABLED = "true";
  try {
    const result = validateProductPresentationPackage({
      plan: basePlan({
        should_show_product_appearance: true,
        presentation_class: "AUTHENTIC_PRODUCT_SURFACE",
        fidelity_tier: "authentic_asset",
        appearance_claim: "AUTHENTIC",
        value_proof_mode: "via_authentic_appearance",
        asset_binding: ["ui-weak"],
        reveal_ceiling: "REAL_ASSET",
      }),
      assets: [weakUi("ui-weak")],
    });
    assert.equal(result.passed, false);
    assert.ok(
      result.violations.some((v) => v.code === "authentic_binding_not_eligible"),
    );
  } finally {
    if (prev === undefined) delete process.env.PRODUCT_PRESENTATION_DECISION_ENABLED;
    else process.env.PRODUCT_PRESENTATION_DECISION_ENABLED = prev;
  }
});

check("outcome presentation without product → valid when PPD allows", () => {
  const prev = process.env.PRODUCT_PRESENTATION_DECISION_ENABLED;
  process.env.PRODUCT_PRESENTATION_DECISION_ENABLED = "true";
  try {
    const plan = basePlan({
      presentation_class: "PRODUCT_OUTCOME_WORLD",
      fidelity_tier: "non_product_visual",
      appearance_claim: "NON_PRODUCT",
      value_proof_mode: "via_world_outcome",
      reveal_ceiling: "PRODUCT_OUTCOME",
    });
    const ppd = validateProductPresentationPackage({
      plan,
      visualScenes: outcomeScenes,
      assets: [],
    });
    assert.equal(ppd.passed, true);
    assert.equal(ppd.value_proof_without_product_demo, true);

    const si = validateStoryIntegrity({
      winner: minimalWinner(),
      voiceoverText:
        "Questions go unanswered. Then the visitor gets clarity and books.",
      packageCta: "Book a visit",
      visualScenes: outcomeScenes,
      productPresentation: plan,
    });
    assert.equal(si.passed, true);
    assert.ok(
      !si.violations.some((v) => v.code === "product_demonstration_missing"),
    );

    const pdi = validateProductDemonstrationIntegrity({
      winner: minimalWinner(),
      voiceoverText:
        "Questions go unanswered. Then the visitor gets clarity and books.",
      visualScenes: outcomeScenes,
      productPresentation: plan,
    });
    assert.equal(pdi.passed, true);
    assert.ok(
      !pdi.violations.some((v) => v.code === "structured_beat_missing"),
    );
  } finally {
    if (prev === undefined) delete process.env.PRODUCT_PRESENTATION_DECISION_ENABLED;
    else process.env.PRODUCT_PRESENTATION_DECISION_ENABLED = prev;
  }
});

check("logo presentation → cannot be AUTHENTIC", () => {
  const prev = process.env.PRODUCT_PRESENTATION_DECISION_ENABLED;
  process.env.PRODUCT_PRESENTATION_DECISION_ENABLED = "true";
  try {
    const result = validateProductPresentationPackage({
      plan: basePlan({
        should_show_product_appearance: true,
        presentation_class: "AUTHENTIC_PRODUCT_SURFACE",
        fidelity_tier: "authentic_asset",
        appearance_claim: "AUTHENTIC",
        value_proof_mode: "via_authentic_appearance",
        asset_binding: ["logo-1"],
        reveal_ceiling: "REAL_ASSET",
      }),
      assets: [logo("logo-1")],
    });
    assert.equal(result.passed, false);
    assert.ok(
      result.violations.some(
        (v) =>
          v.code === "logo_cannot_be_authentic" ||
          v.code === "authentic_binding_not_eligible",
      ),
    );
  } finally {
    if (prev === undefined) delete process.env.PRODUCT_PRESENTATION_DECISION_ENABLED;
    else process.env.PRODUCT_PRESENTATION_DECISION_ENABLED = prev;
  }
});

check("synthetic UI → fail", () => {
  const prev = process.env.PRODUCT_PRESENTATION_DECISION_ENABLED;
  process.env.PRODUCT_PRESENTATION_DECISION_ENABLED = "true";
  try {
    const result = validateProductPresentationPackage({
      plan: basePlan({
        presentation_class: "ABSTRACT_MECHANISM",
        fidelity_tier: "non_product_visual",
        appearance_claim: "NON_PRODUCT",
        value_proof_mode: "via_abstract_mechanism",
        reveal_ceiling: "ABSTRACT_PRODUCT_SYSTEM",
      }),
      visualScenes: [
        {
          source: "ai",
          image_prompt:
            "A synthetic product UI dashboard invented as the product screenshot",
        },
      ],
    });
    assert.equal(result.passed, false);
    assert.ok(
      result.violations.some((v) => v.code === "synthetic_product_ui_forbidden"),
    );
  } finally {
    if (prev === undefined) delete process.env.PRODUCT_PRESENTATION_DECISION_ENABLED;
    else process.env.PRODUCT_PRESENTATION_DECISION_ENABLED = prev;
  }
});

check("SI does not require legacy PRODUCT_DEMO chat proof", () => {
  const si = validateStoryIntegrity({
    winner: minimalWinner(),
    voiceoverText: "A calm story about booking without showing the product.",
    packageCta: "Book a visit",
    visualScenes: outcomeScenes,
    productPresentation: basePlan({
      presentation_class: "PRODUCT_OUTCOME_WORLD",
      appearance_claim: "NON_PRODUCT",
      value_proof_mode: "via_world_outcome",
      reveal_ceiling: "PRODUCT_OUTCOME",
    }),
  });
  assert.equal(si.passed, true);
  assert.ok(
    !si.violations.some((v) => v.code === "product_demonstration_missing"),
  );
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
