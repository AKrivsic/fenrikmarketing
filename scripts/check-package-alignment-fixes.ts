// Package alignment fixes (PRODUCT_DEMO VO + on-screen CTA SoT)
//   npm run check:package-alignment-fixes

import assert from "node:assert/strict";
import {
  alignOnScreenCtaContract,
  alignProductDemoNarration,
  voiceoverContradictsProductDemo,
} from "@/lib/content-package/alignProductDemoNarration";
import {
  validateProductDemonstrationIntegrity,
  validateStoryIntegrity,
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

function fenrikWinner(): CreativeCandidate {
  return {
    candidateId: "c3-direct_product_world-div",
    family: "direct_product_world",
    coreIdea:
      "Handheld urgency: Close on a customer's hands sending an urgent financing question; reply thread shows seen with no answer",
    emotionalReaction: "tension",
    hookLine: "Urgent question dies in silence.",
    openingSituation:
      "Handheld urgency: Close on a customer's hands sending an urgent financing question to a dealership website; reply thread shows seen with no answer.",
    visualPromise:
      "Film the opening as a scroll-stop frame: Urgent question dies in silence. Setting must stay business website moment / empty reply thread.",
    storyProgression:
      "Hold the opening situation → widen unanswered form → AI chatbot answers the visitor → lead captured → habit close",
    productConnection:
      "AI chatbot platform for websites answers the urgent financing question on the website chat",
    ending: "That silence isn't a bad weekend. It's a habit.",
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

const AUDIT_VO =
  "Urgent question dies in silence. Not one of them got an answer. Someone had a financing question. They waited. Nothing. So they clicked over to a competitor — and bought there. Multiply that by sixty visitors in two days. The dealership never saw it happen. No alert. No record. Just a contact form, sitting there, quietly losing every single one. That silence isn't a bad weekend. It's a habit.";

const AUDIT_SCRIPT = `HOOK (0–3s): Hands on phone. Voiceover: 'Urgent question dies in silence.'
PRODUCT DEMO (15–21s): The same dealership website — now with an AI chat widget open. A visitor types a financing question. An answer appears immediately. A lead capture prompt follows. Voiceover: 'Just a contact form, sitting there, quietly losing every single one.' CTA text on screen.
CLOSE: Closed lot. Voiceover: 'That silence isn't a bad weekend. It's a habit.'`;

const DEMO_SCENES = [
  {
    source: "ai" as const,
    image_prompt:
      "Customer's hands holding a smartphone sending an urgent financing question to a dealership website chat",
  },
  {
    source: "ai" as const,
    image_prompt:
      "Same smartphone chat thread shows the visitor message with seen status and empty reply space — waiting",
  },
  {
    source: "ai" as const,
    image_prompt: "Empty contact form sitting on a dealership website at night",
  },
  {
    type: "PRODUCT_DEMO" as const,
    id: "scene-product-demo",
    payload: {
      type: "product_demo" as const,
      actor_id: "visitor_1",
      conversation_id: "conv_1",
      question_visible: true as const,
      ai_answer_visible: true as const,
      outcome_visible: true as const,
      outcome_type: "lead_captured" as const,
      visitor_question: "Do you offer financing on this SUV?",
      ai_answer: "Yes — we have several financing options. I can help you start.",
      outcome_label: "Lead captured",
      brand_name: "Fenrik.chat",
      demo_variant: "after_hours_response" as const,
    },
  },
  {
    source: "ai" as const,
    image_prompt:
      "Same visitor's hands on the same phone as the answered chat confirms a booking lead is captured — conversation continues",
  },
];

check("audit VO contradicts PRODUCT_DEMO before align", () => {
  assert.equal(
    voiceoverContradictsProductDemo({
      voiceoverText: AUDIT_VO,
      visualScenes: DEMO_SCENES,
    }),
    true,
  );
});

check("alignProductDemoNarration replaces problem line over demo", () => {
  const aligned = alignProductDemoNarration({
    voiceoverText: AUDIT_VO,
    visualScenes: DEMO_SCENES,
    videoScript: AUDIT_SCRIPT,
  });
  assert.equal(aligned.changed, true);
  assert.ok(
    aligned.reasons.includes("replaced_problem_narration_over_product_demo") ||
      aligned.reasons.includes("inserted_product_demo_solution_narration"),
  );
  assert.ok(
    /website answers|lead is captured|gets a reply/i.test(aligned.voiceover_text),
  );
  assert.ok(
    !voiceoverContradictsProductDemo({
      voiceoverText: aligned.voiceover_text,
      visualScenes: DEMO_SCENES,
    }),
    `still contradicts: ${aligned.voiceover_text}`,
  );
  assert.ok(
    !/Just a contact form, sitting there, quietly losing/i.test(
      aligned.voiceover_text,
    ),
  );
  assert.ok(aligned.script);
  assert.ok(
    !/Just a contact form, sitting there/i.test(aligned.script!),
    `script still has problem VO: ${aligned.script}`,
  );
});

check("alignOnScreenCtaContract strips invented on-screen CTA", () => {
  const cta = alignOnScreenCtaContract({
    videoScript: AUDIT_SCRIPT,
    visualScenes: DEMO_SCENES,
  });
  assert.equal(cta.changed, true);
  assert.ok(cta.script);
  assert.ok(!/CTA\s+(text\s+)?on\s+screen/i.test(cta.script!));
});

check("aligned package: Story Integrity passes without CTA warning", () => {
  const aligned = alignProductDemoNarration({
    voiceoverText: AUDIT_VO,
    visualScenes: DEMO_SCENES,
    videoScript: AUDIT_SCRIPT,
  });
  const cta = alignOnScreenCtaContract({
    videoScript: aligned.script,
    visualScenes: DEMO_SCENES,
  });
  const story = validateStoryIntegrity({
    winner: fenrikWinner(),
    packageCta: "Create your AI assistant today.",
    hook: "Urgent question dies in silence.",
    voiceoverText: aligned.voiceover_text,
    visualScenes: DEMO_SCENES,
  });
  assert.equal(
    story.passed,
    true,
    `story failed: ${JSON.stringify(story.violations, null, 2)}`,
  );
  assert.ok(!story.warnings.some((w) => w.code === "cta_mismatch"));
  assert.equal(
    story.ctaMatch.evidence,
    "onscreen_cta_not_requested_skip_spoken_cta_check",
  );
  assert.ok(cta.script === null || !/CTA\s+(text\s+)?on\s+screen/i.test(cta.script));
});

check("aligned package: Product Demonstration Integrity passes", () => {
  const aligned = alignProductDemoNarration({
    voiceoverText: AUDIT_VO,
    visualScenes: DEMO_SCENES,
  });
  const pdi = validateProductDemonstrationIntegrity({
    winner: fenrikWinner(),
    voiceoverText: aligned.voiceover_text,
    visualScenes: DEMO_SCENES,
  });
  assert.equal(
    pdi.passed,
    true,
    `PDI failed: ${JSON.stringify(pdi.violations, null, 2)}`,
  );
});

check("typed CTA scene still warns on spoken CTA mismatch", () => {
  const scenes = [
    ...DEMO_SCENES,
    {
      type: "CTA" as const,
      payload: {
        headline: "Create your AI assistant",
        subcopy: "Start answering after hours.",
      },
    },
  ];
  const aligned = alignProductDemoNarration({
    voiceoverText: AUDIT_VO,
    visualScenes: scenes,
  });
  const story = validateStoryIntegrity({
    winner: fenrikWinner(),
    packageCta: "Create your AI assistant — let your website answer.",
    hook: "Urgent question dies in silence.",
    voiceoverText: aligned.voiceover_text,
    visualScenes: scenes,
  });
  assert.equal(
    story.passed,
    true,
    `story failed: ${JSON.stringify(story.violations, null, 2)}`,
  );
  assert.ok(story.warnings.some((w) => w.code === "cta_mismatch"));
});

console.log(`\npackage-alignment-fixes: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
