// Presentation integrity (PPD era — no PRODUCT_DEMO requirements)
//   npm run check:product-demonstration-integrity

import assert from "node:assert/strict";
import {
  buildProductDemonstrationPromptBlock,
  derivePrimaryActor,
  PRODUCT_DEMONSTRATION_INTEGRITY_PROMPT_HEADER,
  productDemonstrationRepairAppendix,
  validateProductDemonstrationIntegrity,
} from "@/lib/creative-candidates";
import type { CreativeCandidate } from "@/lib/creative-candidates/types";

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    console.error(` FAIL ${name}`, err);
  }
}

function handheldWinner(): CreativeCandidate {
  return {
    candidateId: "c3-direct_product_world-div",
    family: "direct_product_world",
    coreIdea: "Handheld urgency",
    emotionalReaction: "tension",
    hookLine: "Urgent question dies in silence.",
    openingSituation:
      "Handheld urgency: Close on a customer's hands sending an urgent question to a beauty salon website; reply thread shows seen with no answer.",
    visualPromise: "Film handheld chat urgency",
    storyProgression: "Hold → answer → book",
    productConnection: "AI chatbot answers on the website chat",
    ending: "Next visitor gets an answer",
    expectedViewerQuestion: "What happens to the unanswered question?",
    familiarityRisk: "medium",
    memorabilityReason: "Handheld urgency",
    creativeDNA: {
      world: "Hands sending urgent question; empty reply thread on phone",
      mainCharacter: "A website visitor's hands sending an urgent question",
      coreConflict: "Unable to answer when offline",
      productRole: "AI chatbot answers",
      viewerQuestion: "Q",
      endingIntent: "Show real answer",
      immutableRules: [],
    },
    creativeDnaSource: "model",
  };
}

check("prompt block includes presentation integrity + PPD authority", () => {
  const block = buildProductDemonstrationPromptBlock(handheldWinner());
  assert.ok(block.includes(PRODUCT_DEMONSTRATION_INTEGRITY_PROMPT_HEADER));
  assert.ok(block.includes("PRIMARY_ACTOR"));
  assert.ok(block.includes("Product Presentation Decision"));
  assert.ok(!/"type": "PRODUCT_DEMO"/i.test(block));
});

check("derivePrimaryActor locks hands-focused subject", () => {
  const actor = derivePrimaryActor(handheldWinner());
  assert.ok(actor.label.toLowerCase().includes("hands") || actor.label.includes("visitor"));
  assert.ok(actor.continuityAnchors.includes("hands") || actor.continuityAnchors.includes("hand"));
});

check("continuous chat IMAGE scenes pass without structured PRODUCT_DEMO", () => {
  const result = validateProductDemonstrationIntegrity({
    winner: handheldWinner(),
    voiceoverText:
      "Urgent question dies in silence. Then the AI assistant replies with availability and she books.",
    visualScenes: [
      {
        source: "ai",
        image_prompt:
          "Customer's hands holding a smartphone sending an urgent booking question to a beauty salon website chat",
      },
      {
        source: "ai",
        image_prompt:
          "Website chat widget: AI reply appears instantly with availability as blurred bubbles",
      },
      {
        source: "ai",
        image_prompt:
          "Same visitor's hands on the same phone as booking lead is captured — conversation continues",
      },
    ],
  });
  assert.equal(result.passed, true, JSON.stringify(result.violations));
});

check("floating chat icon replaces interaction fails", () => {
  const result = validateProductDemonstrationIntegrity({
    winner: handheldWinner(),
    voiceoverText: "Then the site answers.",
    visualScenes: [
      {
        source: "ai",
        image_prompt:
          "Customer's hands holding a smartphone sending a question to a salon website chat",
      },
      {
        source: "ai",
        image_prompt:
          "Floating chat icon sticker hovering over a phone screen instead of a real chat interaction",
      },
    ],
  });
  assert.equal(result.passed, false);
  assert.ok(
    result.violations.some((v) => v.code === "floating_icon_replaces_interaction"),
  );
});

check("conflicting human identity fails", () => {
  const result = validateProductDemonstrationIntegrity({
    winner: handheldWinner(),
    voiceoverText: "Urgent question dies in silence.",
    visualScenes: [
      {
        source: "ai",
        image_prompt:
          "Customer's hands holding a smartphone sending an urgent booking question",
      },
      {
        source: "ai",
        image_prompt:
          "Professional figure in a suit with furrowed brow smiling at a laptop — different human identity",
      },
    ],
  });
  assert.equal(result.passed, false);
  assert.ok(
    result.violations.some((v) => v.code === "primary_actor_identity_changed"),
  );
});

check("repair appendix lists failure codes", () => {
  const integrity = validateProductDemonstrationIntegrity({
    winner: handheldWinner(),
    voiceoverText: "vo",
    visualScenes: [
      { source: "ai", image_prompt: "hands on phone chat" },
      { source: "ai", image_prompt: "floating chat icon sticker on screen" },
    ],
  });
  const appendix = productDemonstrationRepairAppendix(
    handheldWinner(),
    integrity,
  );
  assert.ok(appendix.includes("PRODUCT PRESENTATION INTEGRITY REPAIR"));
  assert.ok(appendix.includes("floating_icon"));
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
