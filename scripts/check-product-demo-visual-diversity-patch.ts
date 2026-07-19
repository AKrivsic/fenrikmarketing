// Prompt-assembly regression for the approved PRODUCT_DEMO / visual diversity
// patch (stale AI-still demo sequence removed; IMAGE progression restored).
//   npm run check:product-demo-visual-diversity-patch

import assert from "node:assert/strict";
import type { Project } from "@/lib/supabase/types";
import { buildGenerateContentPackagePrompt } from "@/lib/ai/prompts/generateContentPackage";
import {
  buildCreativeCandidatePromptBlock,
} from "@/lib/creative-candidates/promptBlocks";
import type {
  CreativeCandidate,
  CreativeCandidatePlan,
} from "@/lib/creative-candidates/types";

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  FAIL ${name}`);
    console.error(`       ${message.replace(/\n/g, "\n       ")}`);
  }
}

function section(title: string): void {
  console.log(`\n${title}`);
}

function buildProject(): Project {
  return {
    id: "p-patch-1",
    owner_id: "u-1",
    name: "Fenrik.chat",
    type: "saas",
    language: "en",
    enabled_languages: [],
    market_scope: "global",
    target_audience: {},
    goal_type: "lead_generation",
    product_is: ["AI website chat"],
    product_is_not: [],
    product_strengths: ["instant answers"],
    pain_points: ["unanswered website questions"],
    forbidden_claims: [],
    tone_of_voice: {},
    platforms: ["tiktok", "instagram"],
    publishing_rules: {},
    default_cta: null,
    knowledge: {},
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  } as Project;
}

function winner(): CreativeCandidate {
  return {
    candidateId: "c-patch",
    family: "direct_product_world",
    coreIdea: "Hands send a booking question on phone chat",
    emotionalReaction: "relief",
    hookLine: "Questions die unanswered.",
    openingSituation:
      "Close on a customer's hands sending an urgent question to a salon website chat",
    visualPromise: "Handheld chat urgency",
    storyProgression: "ask → AI answers → lead captured",
    productConnection: "Fenrik AI answers on the website",
    ending: "Visitor books",
    expectedViewerQuestion: "Will they get an answer?",
    familiarityRisk: "medium",
    memorabilityReason: "Hands + chat",
    creativeDNA: {
      world: "phone chat",
      mainCharacter: "A website visitor's hands",
      coreConflict: "unanswered questions",
      productRole: "AI chatbot answers",
      viewerQuestion: "Will they get an answer?",
      endingIntent: "lead captured",
      immutableRules: [
        "Keep handheld chat world",
        "Do not relocate into a generic office",
        "Product proves the answer on the same conversation",
      ],
    },
    creativeDnaSource: "model",
  };
}

function candidatePlan(): CreativeCandidatePlan {
  const w = winner();
  return {
    selectedCandidate: w,
    comparativeJudge: {
      mostLikelyToStopScrolling: w.candidateId,
      leastInterchangeable: w.candidateId,
      clearestMentalImage: w.candidateId,
      mostMemorableInOneHour: w.candidateId,
      bestProductTopicFit: w.candidateId,
      winnerId: w.candidateId,
      winnerReason: "Clearest product demonstration path",
    },
  } as CreativeCandidatePlan;
}

function videoPrompt(extra?: {
  creativeCandidatePromptBlock?: string;
}): string {
  return buildGenerateContentPackagePrompt({
    project: buildProject(),
    funnelStage: "problem_aware",
    topic: "Unanswered website chat",
    angle: "Visitors leave without a reply",
    availableAssets: [],
    requireVideo: true,
    creativeCandidatePromptBlock:
      extra?.creativeCandidatePromptBlock ??
      buildCreativeCandidatePromptBlock(candidatePlan()),
  });
}

section("TEST 1 — stale demo sequence removed");

check("prompt does not contain PRODUCT DEMONSTRATION STILLS", () => {
  assert.equal(videoPrompt().includes("PRODUCT DEMONSTRATION STILLS"), false);
});

check("prompt does not require SAME thread AI-still sequence", () => {
  const prompt = videoPrompt();
  assert.equal(/\bSAME thread\b/i.test(prompt), false);
  assert.equal(
    /1\)\s*Question\s*—\s*visitor typing/i.test(prompt),
    false,
  );
  assert.equal(
    /3\)\s*Visible AI answer/i.test(prompt),
    false,
  );
  assert.equal(
    /4\)\s*Visible useful result/i.test(prompt),
    false,
  );
});

section("TEST 2 — same-device mandates removed");

check("prompt does not contain Prefer: same hands", () => {
  assert.equal(/Prefer:\s*same hands/i.test(videoPrompt()), false);
});

check("prompt does not contain same kitchen-or-street", () => {
  assert.equal(videoPrompt().includes("same kitchen-or-street"), false);
});

check("prompt does not contain mandatory for every still", () => {
  assert.equal(videoPrompt().includes("mandatory for every still"), false);
});

check("prompt does not contain Forbidden for variety", () => {
  assert.equal(videoPrompt().includes("Forbidden for variety"), false);
});

check("prompt does not mandate same phone across every IMAGE", () => {
  const prompt = videoPrompt();
  assert.equal(
    /SAME person OR continue the same phone/i.test(prompt),
    false,
  );
  assert.equal(/Prefer:\s*same hands\s*\/\s*same phone/i.test(prompt), false);
  // Explicit "do not require the same phone" is the approved anti-mandate.
  assert.ok(
    /Do not require the same phone, hands, location, or framing/i.test(prompt),
  );
  const staleSamePhoneLines = prompt
    .split("\n")
    .filter((line) => /same phone/i.test(line))
    .filter((line) => !/do not require the same phone/i.test(line));
  assert.equal(
    staleSamePhoneLines.length,
    0,
    `unexpected same-phone lines: ${staleSamePhoneLines.join(" | ")}`,
  );
});

section("TEST 3 — actor anti-swap remains");

check("prompt still forbids unexplained human identity changes", () => {
  const prompt = videoPrompt();
  assert.ok(prompt.includes("PRIMARY_ACTOR IDENTITY CONTINUITY"));
  assert.ok(
    /different human face|identity mid-package|without an explicit narrative reason/i.test(
      prompt,
    ),
  );
});

section("TEST 4 — structured PRODUCT_DEMO ownership");

check("candidate block assigns Q/A/result to structured PRODUCT_DEMO", () => {
  const block = buildCreativeCandidatePromptBlock(candidatePlan());
  assert.ok(/structured PRODUCT_DEMO/i.test(block));
  assert.ok(/visitor question/i.test(block));
  assert.ok(/AI answer/i.test(block));
  assert.ok(/useful result/i.test(block));
  assert.equal(
    /visuals must show Question → AI answer → useful result/i.test(block),
    false,
  );
  assert.ok(/ordinary IMAGE[\s\S]*must not recreate the complete demo sequence/i.test(block));
});

check("package prompt does not instruct IMAGE full ask→answer→result sequence", () => {
  const prompt = videoPrompt();
  assert.ok(
    /complete visible product demonstration belongs to structured PRODUCT_DEMO/i.test(
      prompt,
    ),
  );
  assert.ok(
    /Do not recreate the complete ask→answer→result sequence in IMAGE scenes/i.test(
      prompt,
    ),
  );
  assert.equal(
    /sent bubble → empty waiting space →[\s\S]*Question → AI answer → Result/i.test(
      prompt,
    ),
    false,
  );
});

check("assembled package prompt includes structured PRODUCT_DEMO ownership", () => {
  const prompt = videoPrompt();
  assert.ok(/structured PRODUCT_DEMO/i.test(prompt));
});

section("TEST 5 — visual progression");

check("prompt includes strengthened IMAGE progression wording", () => {
  const prompt = videoPrompt();
  assert.ok(/VISUAL PROGRESSION \(consecutive IMAGE scenes\)/i.test(prompt));
  assert.ok(/at least two meaningful axes/i.test(prompt));
  assert.ok(/NOT sufficient alone/i.test(prompt));
  assert.ok(/small hand gesture/i.test(prompt));
  assert.ok(/slightly[\s\S]*moved phone|moved phone/i.test(prompt));
});

check("prompt does not require changing Identity treatment axes", () => {
  const prompt = videoPrompt();
  assert.ok(
    /Do NOT require changing Creative Identity treatment/i.test(prompt),
  );
  assert.ok(/lighting/i.test(prompt));
  assert.ok(/camera language/i.test(prompt));
  assert.ok(/composition treatment/i.test(prompt));
  assert.ok(/color treatment/i.test(prompt));
});

section("source search — obsolete strings absent from assembled prompt");

check("assembled prompt has no obsolete Sprint 4C AI-still contracts", () => {
  const prompt = videoPrompt();
  const forbidden = [
    "PRODUCT DEMONSTRATION STILLS",
    "mandatory for every still",
    "Prefer: same hands",
    "same kitchen-or-street",
    "Forbidden for variety",
  ];
  for (const phrase of forbidden) {
    assert.equal(
      prompt.includes(phrase),
      false,
      `obsolete phrase still in prompt: ${phrase}`,
    );
  }
});

console.log(
  `\n${failed === 0 ? "PASS" : "FAIL"}: ${passed} passed, ${failed} failed`,
);
process.exit(failed === 0 ? 0 : 1);
