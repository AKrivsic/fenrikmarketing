// Story Integrity (Sprint 4A)
//   npm run check:story-integrity

import assert from "node:assert/strict";
import {
  buildCreativeCandidatePromptBlock,
  buildStoryIntegrityPromptBlock,
  deriveAllowedWorldTokens,
  detectProductDemonstration,
  STORY_INTEGRITY_PROMPT_HEADER,
  storyIntegrityRepairAppendix,
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

check("prompt block includes Story Integrity header", () => {
  const block = buildStoryIntegrityPromptBlock(handheldWinner());
  assert.ok(block.includes(STORY_INTEGRITY_PROMPT_HEADER));
  assert.ok(block.includes("PRODUCT DEMONSTRATION"));
  assert.ok(block.includes("NOT ALLOWED"));
});

check("candidate prompt embeds story integrity", () => {
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
  assert.ok(block.includes(STORY_INTEGRITY_PROMPT_HEADER));
  assert.ok(block.includes("no mid-video metaphor escape"));
});

check("allowed world tokens include handheld chat lexicon", () => {
  const tokens = deriveAllowedWorldTokens(handheldWinner());
  assert.ok(tokens.includes("visitor") || tokens.includes("hands"));
  assert.ok(tokens.includes("chat") || tokens.includes("question"));
});

check("BEFORE: fog silhouettes mid-arc fails abstract_metaphor + product_demo + cta", () => {
  const result = validateStoryIntegrity({
    winner: handheldWinner(),
    packageCta: PACKAGE_CTA,
    hook: "Urgent question dies in silence.",
    voiceoverText:
      "Urgent question dies in silence. She typed it Saturday night. Your site said nothing. Those weren't bounces. They were ready. Your next visitor deserves an answer — even when you're not there.",
    visualScenes: [
      {
        source: "ai",
        image_prompt:
          "Extreme close-up of a person's hands holding a smartphone sending a beauty salon question",
      },
      {
        source: "ai",
        image_prompt:
          "Smartphone screen with empty chat bubble and seen indicator, no reply",
      },
      {
        source: "ai",
        image_prompt:
          "Five softly rendered translucent human silhouettes standing in fog on a quiet urban street",
      },
      {
        source: "ai",
        image_prompt:
          "Featureless mannequin with a warm glowing bubble floating at eye level in fog",
      },
      {
        source: "ai",
        image_prompt:
          "Fenrik.chat landing page Create an AI assistant for your website in 1 minute Starting at $69/month yourcompany.com",
      },
    ],
  });
  assert.equal(result.passed, false);
  const codes = new Set(result.violations.map((v) => v.code));
  assert.ok(codes.has("abstract_metaphor_in_middle"));
  assert.ok(codes.has("product_demonstration_missing"));
  assert.ok(codes.has("cta_mismatch"));
  assert.ok(result.productDemonstration.landingPageOnly);
});

check("AFTER: continuous chat world with ask→answer→result + spoken CTA passes", () => {
  const result = validateStoryIntegrity({
    winner: handheldWinner(),
    packageCta: PACKAGE_CTA,
    hook: "Urgent question dies in silence.",
    voiceoverText:
      "Urgent question dies in silence. She typed it Saturday night — which color treatment, can I book tomorrow. Your site said nothing. No chat. No answer. Then the AI assistant replies with availability. She stays and books. Create your AI assistant — let your website answer while the salon is closed.",
    visualScenes: [
      {
        source: "ai",
        image_prompt:
          "Customer's hands holding a smartphone sending an urgent booking question to a beauty salon website chat",
      },
      {
        source: "ai",
        image_prompt:
          "Same smartphone chat thread shows the visitor message with seen status and empty reply space — waiting",
      },
      {
        source: "ai",
        image_prompt:
          "Website chat widget on the phone screen: AI reply appears instantly — AI chatbot replies with color treatment timing and tomorrow availability as blurred structured bubbles",
      },
      {
        source: "ai",
        image_prompt:
          "Same visitor's hands on the same phone as the answered chat confirms a booking lead is captured — conversation continues",
      },
      {
        source: "asset",
        used_as:
          "Phone screen continues the same chat world showing the AI assistant confirmation — not a disconnected landing page montage",
        asset_id: "demo",
        video_usage: "framed_phone",
      },
    ],
  });
  assert.equal(
    result.passed,
    true,
    `unexpected violations: ${JSON.stringify(result.violations, null, 2)}`,
  );
  assert.equal(result.productDemonstration.present, true);
  assert.equal(result.ctaMatch.voiceoverContainsCta, true);
});

check("landing page alone is not product demonstration", () => {
  const demo = detectProductDemonstration({
    winner: handheldWinner(),
    voiceoverText: "Your website can answer after hours.",
    sceneTexts: [
      "Hands on phone sending a question",
      "Empty reply thread",
      "Create an AI assistant for your website in 1 minute. Starting at $69/month. https://www.yourcompany.com Try the preview first.",
    ],
  });
  assert.equal(demo.landingPageOnly, true);
  assert.equal(demo.present, false);
});

check("airport metaphor rejected when not in selected concept", () => {
  const result = validateStoryIntegrity({
    winner: handheldWinner(),
    packageCta: PACKAGE_CTA,
    voiceoverText:
      "Urgent question dies in silence. Create your AI assistant — let your website answer while the salon is closed.",
    visualScenes: [
      {
        source: "ai",
        image_prompt: "Hands sending a website chat question on a phone",
      },
      {
        source: "ai",
        image_prompt:
          "Train-station style departure board: Phone caller boarding; Website visitor Delayed",
      },
      {
        source: "ai",
        image_prompt:
          "AI chatbot answers the visitor question on the website chat and the lead is captured",
      },
    ],
  });
  assert.equal(result.passed, false);
  assert.ok(
    result.violations.some((v) => v.code === "abstract_metaphor_in_middle"),
  );
});

check("departure-board winner may keep airport imagery", () => {
  const boardWinner: CreativeCandidate = {
    ...handheldWinner(),
    candidateId: "c6-board",
    family: "human_conflict",
    openingSituation:
      "Train-station style departure board: Phone caller #47 boarding; Website visitor stuck on Delayed",
    coreIdea: "Departure board for the wrong channel",
    visualPromise: "Departure board spectacle",
    storyProgression:
      "Board shows delay → visitor leaves → AI answers and board clears",
    creativeDNA: {
      world: "Airport-style departure board comparing phone vs website channels",
      mainCharacter: "The departure board motif",
      coreConflict: "Website visitor delayed while phone callers board",
      productRole: "AI chatbot answers the delayed website visitor",
      viewerQuestion: "Will the delayed visitor ever board?",
      endingIntent: "Show the website visitor getting an answer",
      immutableRules: [
        "Do not relocate away from the departure board",
        "Do not replace the board motif",
        "Do not turn middle into office laptop montage",
      ],
    },
  };
  const result = validateStoryIntegrity({
    winner: boardWinner,
    packageCta: PACKAGE_CTA,
    voiceoverText:
      "Departure board for the wrong channel. Phone callers board. Website visitors stay delayed. The AI assistant answers and the delayed visitor gets through. Create your AI assistant — let your website answer while the salon is closed.",
    visualScenes: [
      {
        source: "ai",
        image_prompt:
          "Train-station style departure board showing phone caller boarding and website visitor delayed",
      },
      {
        source: "ai",
        image_prompt:
          "Same departure board with website visitor row still delayed while phones keep boarding",
      },
      {
        source: "ai",
        image_prompt:
          "AI chatbot answers the website visitor question; the departure board clears the delayed row as a lead is captured",
      },
    ],
  });
  assert.equal(
    result.passed,
    true,
    `board winner should pass: ${JSON.stringify(result.violations, null, 2)}`,
  );
});

check("repair appendix lists failure codes", () => {
  const failed = validateStoryIntegrity({
    winner: handheldWinner(),
    packageCta: PACKAGE_CTA,
    voiceoverText: "Soft poetic close only.",
    visualScenes: [
      { source: "ai", image_prompt: "Hands on phone" },
      {
        source: "ai",
        image_prompt: "Five silhouettes dissolving into fog on a street",
      },
      {
        source: "ai",
        image_prompt: "Create an AI assistant landing page yourcompany.com",
      },
    ],
  });
  const appendix = storyIntegrityRepairAppendix(
    handheldWinner(),
    failed,
    PACKAGE_CTA,
  );
  assert.ok(appendix.includes("STORY INTEGRITY REPAIR"));
  assert.ok(appendix.includes("abstract_metaphor_in_middle") || appendix.includes("product_demonstration"));
  assert.ok(appendix.includes(PACKAGE_CTA));
});

console.log(`\nstory-integrity: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
