// Product Demonstration Integrity (Sprint 4C)
//   npm run check:product-demonstration-integrity

import assert from "node:assert/strict";
import {
  buildCreativeCandidatePromptBlock,
  buildProductDemonstrationPromptBlock,
  derivePrimaryActor,
  detectProductDemonstration,
  detectSemanticProductDemonstration,
  PRODUCT_DEMONSTRATION_INTEGRITY_PROMPT_HEADER,
  productDemonstrationRepairAppendix,
  validateProductDemonstrationIntegrity,
  validateStoryIntegrity,
} from "@/lib/creative-candidates";
import type { CreativeCandidate, CreativeCandidatePlan } from "@/lib/creative-candidates/types";

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
    coreIdea:
      "Handheld urgency: Close on a customer's hands sending an urgent question; reply thread shows seen with no answer",
    emotionalReaction: "tension",
    hookLine: "Urgent question dies in silence.",
    openingSituation:
      "Handheld urgency: Close on a customer's hands sending an urgent question to a beauty salon website; reply thread shows seen with no answer during peak demand overload.",
    visualPromise:
      "Film the opening as a scroll-stop frame: Urgent question dies in silence. Setting must stay business website moment / empty reply thread.",
    storyProgression:
      "Hold the opening situation → widen unanswered chat → AI chatbot answers the visitor → visitor stays and books",
    productConnection:
      "AI chatbot platform for websites answers the urgent booking question on the website chat",
    ending:
      "Next website visitor who needed an answer gets an answer even when the owner cannot.",
    expectedViewerQuestion: "What happens to the unanswered question?",
    familiarityRisk: "medium",
    memorabilityReason: "Handheld urgency",
    creativeDNA: {
      world:
        "Close on a customer's hands sending an urgent question; empty reply thread on a phone",
      mainCharacter: "A website visitor's hands sending an urgent question",
      coreConflict: "Unable to answer customer questions when offline",
      productRole: "AI chatbot platform for websites answers the website moment",
      viewerQuestion: "What happens to the person in: Urgent question dies in silence?",
      endingIntent:
        "Show that visitors receive a real answer via the AI assistant while the opening world remains",
      immutableRules: [
        "Do not relocate the primary story away from handheld chat urgency",
        "Do not replace the main character: website visitor's hands",
        "Do not turn the middle into a laptop analytics montage",
        "Do not resolve only with a happy expression; show visitors receive answers",
      ],
    },
    creativeDnaSource: "model",
  };
}

const PACKAGE_CTA =
  "Create your AI assistant — let your website answer while the salon is closed.";

/** Exact failure shape from production audit 9d9fa60b (prompt texts). */
function nineDScenes(): unknown[] {
  return [
    {
      source: "ai",
      image_prompt:
        "Home kitchen. Close on a person's hands holding a smartphone — the phone screen glows softly, showing a chat interface with a sent message bubble and a small seen indicator beneath it. No reply bubble. The screen is quiet. The hands are still, waiting.",
    },
    {
      source: "ai",
      image_prompt:
        "Home kitchen. Three-quarter angle on a professional figure — gender-neutral, business-casual — standing at a kitchen counter holding a coffee cup, scrolling a phone. Expression mildly puzzled. Soft glow suggesting analytics or inbox.",
    },
    {
      source: "ai",
      image_prompt:
        "Person's hand holding a phone — three faded chat thread previews as abstract rounded shapes, each progressively greyed out suggesting unanswered conversations.",
    },
    {
      source: "ai",
      image_prompt:
        "Professional figure at the kitchen counter, expression calm and quietly pleased — looking at their phone with a small smile. Soft notification indicator, abstract shape suggesting a new message received. Floating chat icon vibe.",
    },
  ];
}

check("prompt block includes Product Demonstration Integrity header + PRIMARY_ACTOR", () => {
  const block = buildProductDemonstrationPromptBlock(handheldWinner());
  assert.ok(block.includes(PRODUCT_DEMONSTRATION_INTEGRITY_PROMPT_HEADER));
  assert.ok(block.includes("PRIMARY_ACTOR"));
  assert.ok(block.includes("PRODUCT_DEMO") || block.includes("product_demo"));
  assert.ok(block.includes("ai_answer_visible") || block.includes("AI answer"));
  assert.ok(block.includes("Forbidden") || block.includes("NOT ALLOWED") || block.includes("empty bubbles"));
});

check("candidate prompt embeds product demonstration integrity", () => {
  const plan = {
    version: "creative-candidates@3.0",
    creativeDivergence: {
      version: "creative-divergence@2.1",
      clusters: [],
      survivors: [],
      rejected: [],
    },
    generatedCandidates: [handheldWinner()],
    candidateScores: [],
    rejectedCandidates: [],
    selectedCandidate: handheldWinner(),
    comparativeJudge: {
      mostLikelyToStopScrolling: "c3",
      leastInterchangeable: "c3",
      clearestMentalImage: "c3",
      mostMemorableInOneHour: "c3",
      bestProductTopicFit: "c3",
      winnerId: "c3-direct_product_world-div",
      winnerReason: "test",
    },
    finalScriptFidelity: null,
    finalStoryboardFidelity: null,
    regenerationReason: null,
  } as unknown as CreativeCandidatePlan;
  const block = buildCreativeCandidatePromptBlock(plan);
  assert.ok(block.includes(PRODUCT_DEMONSTRATION_INTEGRITY_PROMPT_HEADER));
  assert.ok(block.includes("PRIMARY_ACTOR"));
});

check("derivePrimaryActor locks visitor hands", () => {
  const actor = derivePrimaryActor(handheldWinner());
  assert.ok(/hands|visitor/i.test(actor.label));
  assert.ok(actor.continuityAnchors.includes("hands") || actor.continuityAnchors.includes("visitor"));
  assert.ok(actor.lockedAttributes.includes("hands_focus"));
});

check("FALSE POSITIVE FIXED: No reply bubble is NOT an AI answer", () => {
  const demo = detectSemanticProductDemonstration({
    winner: handheldWinner(),
    voiceoverText:
      "Someone typed an urgent question. Fenrik.chat answers for you. Create your AI assistant today. Every unanswered visitor is a lead you can't chase.",
    sceneTexts: [
      "Hands holding phone with sent message. No reply bubble. Waiting.",
      "Owner smiling at phone with soft notification indicator abstract shape",
    ],
  });
  assert.equal(demo.answerPresent, false);
  assert.ok(demo.narrationOnlySignals.includes("answer_in_voiceover_only"));
});

check("FALSE POSITIVE FIXED: bare lead in problem VO is NOT a visual result", () => {
  const demo = detectSemanticProductDemonstration({
    winner: handheldWinner(),
    voiceoverText:
      "Every unanswered visitor is a lead you can't chase — because you never got their name.",
    sceneTexts: [
      "Customer's hands sending an urgent question into website chat",
      "Same phone waiting with empty reply space",
    ],
  });
  assert.equal(demo.resultPresent, false);
});

check("9d9fa60b BEFORE shape fails product demonstration integrity", () => {
  const result = validateProductDemonstrationIntegrity({
    winner: handheldWinner(),
    voiceoverText:
      "Someone typed an urgent question into your website last night. Fenrik.chat answers for you. Create your AI assistant today.",
    visualScenes: nineDScenes(),
  });
  assert.equal(result.passed, false);
  const codes = new Set(result.violations.map((v) => v.code));
  assert.ok(
    codes.has("answer_not_visual") || codes.has("answer_narration_only"),
    `codes=${[...codes]}`,
  );
  assert.ok(
    codes.has("primary_actor_identity_changed") ||
      codes.has("fake_success_resolution") ||
      codes.has("floating_icon_replaces_interaction") ||
      codes.has("resolution_not_product_solving"),
    `codes=${[...codes]}`,
  );
});

check("Story Integrity also rejects 9d9fa60b false product demo PASS", () => {
  const result = validateStoryIntegrity({
    winner: handheldWinner(),
    packageCta: PACKAGE_CTA,
    hook: "Someone typed an urgent question into your website last night",
    voiceoverText:
      "Someone typed an urgent question into your website last night. Hit send. And waited. Fenrik.chat answers for you. Create your AI assistant — let your website answer while the salon is closed.",
    visualScenes: nineDScenes(),
  });
  assert.equal(result.productDemonstration.present, false);
  assert.equal(result.passed, false);
  assert.ok(
    result.violations.some((v) => v.code === "product_demonstration_missing"),
  );
});

check("AFTER: continuous same-actor ask→answer→result passes", () => {
  const scenes = [
    {
      source: "ai",
      image_prompt:
        "Same website visitor's hands holding a smartphone sending an urgent booking question into website chat — message bubble sent",
    },
    {
      type: "PRODUCT_DEMO",
      payload: {
        type: "product_demo",
        actor_id: "primary_actor",
        conversation_id: "conv-demo-1",
        question_visible: true,
        ai_answer_visible: true,
        outcome_visible: true,
        outcome_type: "lead_captured",
        visitor_question: "Do you have availability tomorrow?",
        ai_answer:
          "Yes — we have openings tomorrow morning and afternoon. Want me to hold a slot?",
        outcome_label: "Lead captured",
        brand_name: "Fenrik.chat",
      },
    },
  ];
  const result = validateProductDemonstrationIntegrity({
    winner: handheldWinner(),
    voiceoverText:
      "Urgent question dies in silence. She typed it Saturday night. Your site said nothing. Then the AI assistant replies. She stays and books. Create your AI assistant — let your website answer while the salon is closed.",
    visualScenes: scenes,
  });
  assert.equal(
    result.passed,
    true,
    `unexpected violations: ${JSON.stringify(result.violations, null, 2)}`,
  );
  assert.equal(result.productDemonstration.present, true);
  assert.equal(result.productDemonstration.structuredBeatPresent, true);
});

check("smiling owner resolution alone fails", () => {
  const result = validateProductDemonstrationIntegrity({
    winner: handheldWinner(),
    voiceoverText:
      "She asked. Fenrik answered. Create your AI assistant today.",
    visualScenes: [
      {
        source: "ai",
        image_prompt:
          "Visitor hands sending an urgent question into website chat on a phone",
      },
      {
        source: "ai",
        image_prompt:
          "Professional figure at kitchen counter with a small smile looking at phone — quietly pleased success pose",
      },
    ],
  });
  assert.equal(result.passed, false);
  const codes = new Set(result.violations.map((v) => v.code));
  assert.ok(
    codes.has("structured_beat_missing") ||
      codes.has("fake_success_resolution") ||
      codes.has("resolution_not_product_solving") ||
      codes.has("answer_not_visual"),
  );
});

check("floating chat icon replaces interaction fails", () => {
  const result = validateProductDemonstrationIntegrity({
    winner: handheldWinner(),
    voiceoverText: "Create your AI assistant today.",
    visualScenes: [
      {
        source: "ai",
        image_prompt:
          "Visitor hands sending urgent question into website chat",
      },
      {
        source: "ai",
        image_prompt:
          "Same phone with floating chat icon above the screen suggesting success",
      },
    ],
  });
  assert.equal(result.passed, false);
  assert.ok(
    result.violations.some(
      (v) => v.code === "floating_icon_replaces_interaction",
    ),
  );
});

check("narration-only product claim is not enough", () => {
  const demo = detectProductDemonstration({
    winner: handheldWinner(),
    voiceoverText:
      "Fenrik.chat answers for you. Every visitor gets an answer. Create your AI assistant today.",
    sceneTexts: [
      "Hands holding a blank glowing phone in a kitchen",
      "Owner smiling at phone",
    ],
  });
  assert.equal(demo.present, false);
  assert.equal(demo.answerPresent, false);
});

check("repair appendix lists failure codes", () => {
  const integrity = validateProductDemonstrationIntegrity({
    winner: handheldWinner(),
    voiceoverText: "Create your AI assistant today.",
    visualScenes: nineDScenes(),
  });
  const appendix = productDemonstrationRepairAppendix(
    handheldWinner(),
    integrity,
  );
  assert.ok(appendix.includes("PRODUCT DEMONSTRATION INTEGRITY REPAIR"));
  assert.ok(appendix.includes("PRIMARY_ACTOR"));
  assert.ok(/answer|resolution|actor/i.test(appendix));
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
