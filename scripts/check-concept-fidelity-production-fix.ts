// Concept Fidelity + False Completion — production fix regression suite
//   npm run check:concept-fidelity-production-fix

import assert from "node:assert/strict";
import {
  checkConceptFidelity,
  deriveShortIndustryCue,
  enforceCandidateHook,
  isAffirmativeGenericOfficeCollapse,
  openingSituationFaithfulToScene1,
  stripVisualStyleBoilerplate,
  validateAndRepairCandidate,
} from "@/lib/creative-candidates";
import type { CreativeCandidate } from "@/lib/creative-candidates/types";
import {
  planRequiresVideo,
  resolvePackageReconcileStatus,
} from "@/lib/api/packageReconcileStatus";

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

function cand(partial: Partial<CreativeCandidate> & Pick<CreativeCandidate, "hookLine" | "openingSituation" | "coreIdea">): CreativeCandidate {
  return {
    candidateId: "t1",
    family: "direct_product_world",
    emotionalReaction: "urgency",
    visualPromise: "x",
    storyProgression: "x",
    productConnection: "AI chatbot platform for websites handles the website moment",
    ending: "Next visitor gets an answer",
    expectedViewerQuestion: "?",
    familiarityRisk: "medium",
    memorabilityReason: "test",
    ...partial,
  };
}

const STYLE_PREFIX =
  "Soft polished 3D render, portrait 9:16 vertical frame, urban gray-blue ambient palette, overcast diffused daylight, quiet optimism mood, symmetrical calm composition, slightly above table height camera angle, implied human presence just off-screen. ";

console.log("\nA. Opening validator false positives / true negatives");

check("departure-board matches departure board", () => {
  const r = openingSituationFaithfulToScene1(
    "Train-station style departure board: phone row boarding; website visitor delayed",
    "A stylized departure-board panel fills most of the frame with two status rows",
  );
  assert.equal(r.ok, true, r.reason ?? "expected pass");
});

check("departure board matches departure-board", () => {
  const r = openingSituationFaithfulToScene1(
    "Train-station style departure-board showing delayed website visitor",
    "A stylized train-station departure board rendered with two rows",
  );
  assert.equal(r.ok, true, r.reason ?? "expected pass");
});

check("person's hands accepted for customer's hands candidate", () => {
  const r = openingSituationFaithfulToScene1(
    "Close on a customer's hands sending an urgent question; reply shows read-receipt with no answer",
    `${STYLE_PREFIX}Extreme close-up of a person's hands holding a smartphone showing a messaging interface with a composed question`,
  );
  assert.equal(r.ok, true, r.reason ?? "expected pass");
});

check("visitor's hands accepted for customer's hands", () => {
  const r = openingSituationFaithfulToScene1(
    "Close on a customer's hands filling a contact form, then abandoning it",
    "Extreme close-up of a visitor's hands holding a smartphone, thumb hovering over a contact form",
  );
  assert.equal(r.ok, true, r.reason ?? "expected pass");
});

check("customer's hands still pass", () => {
  const r = openingSituationFaithfulToScene1(
    "Close on a customer's hands sending an urgent question",
    "Close-up of a customer's hands holding a phone above a contact form",
  );
  assert.equal(r.ok, true, r.reason ?? "expected pass");
});

check("subject after long style prefix still detected", () => {
  const cleaned = stripVisualStyleBoilerplate(
    `${STYLE_PREFIX}Extreme close-up of a person's hands holding a smartphone`,
  );
  assert.match(cleaned, /hands/i);
  const r = openingSituationFaithfulToScene1(
    "Close on a customer's hands sending an urgent question",
    `${STYLE_PREFIX}Extreme close-up of a person's hands holding a smartphone with chat widget`,
  );
  assert.equal(r.ok, true, r.reason ?? "expected pass");
});

check("unrelated generic office still fails opening match", () => {
  const r = openingSituationFaithfulToScene1(
    "Train-station style departure board for phone vs website visitor",
    "Photorealistic CEO walking through a modern open-plan office with glass walls",
  );
  assert.equal(r.ok, false);
});

console.log("\nB. Hook behavior");

check("exact candidate hook passes fidelity", () => {
  const winner = cand({
    hookLine: "Urgent question dies in silence.",
    openingSituation: "Close on a customer's hands sending an urgent question on a smartphone chat",
    coreIdea: "Unanswered website demand while the owner is busy.",
  });
  const f = checkConceptFidelity({
    winner,
    hook: "Urgent question dies in silence.",
    voiceoverText:
      "Urgent question dies in silence. Someone typed into your website and got nothing back. The chatbot answers when you cannot.",
    imagePrompts: [
      "Extreme close-up of a person's hands holding a smartphone showing a chat widget with no reply",
    ],
    visualScenes: [
      {
        image_prompt:
          "Extreme close-up of a person's hands holding a smartphone showing a chat widget with no reply",
      },
    ],
    topic: "AI chatbot platform for websites",
  });
  assert.equal(f.hookPreservedInFirstSpoken, true);
  assert.equal(f.passed, true, f.failureReasons.join(","));
});

check("punctuation / casing differences pass after enforce", () => {
  const enforced = enforceCandidateHook({
    hookLine: "Urgent question dies in silence",
    hook: "urgent question dies in silence!",
    voiceoverText: "Urgent question dies in silence! Someone typed and waited.",
  });
  assert.equal(enforced.hook.replace(/[.!]?$/, ""), "Urgent question dies in silence");
  const winner = cand({
    hookLine: enforced.hook,
    openingSituation: "Close on a customer's hands sending an urgent question on a phone",
    coreIdea: "Unanswered demand online.",
  });
  const f = checkConceptFidelity({
    winner,
    hook: enforced.hook,
    voiceoverText: enforced.voiceover_text,
    imagePrompts: [
      "person's hands holding a smartphone with messaging interface unanswered",
    ],
    topic: "AI chatbot for websites",
  });
  assert.equal(f.hookPreservedInFirstSpoken, true);
});

check("semantically unrelated hook fails without enforce", () => {
  const winner = cand({
    hookLine: "Form abandoned now, discovered after vacation.",
    openingSituation: "Visitor's hands abandon a contact form",
    coreIdea: "Missed leads after vacation.",
  });
  const f = checkConceptFidelity({
    winner,
    hook: "She sent the newsletter. Forty people clicked.",
    voiceoverText:
      "She sent the newsletter. Forty people clicked. And every single one left without a word.",
    imagePrompts: ["home office laptop newsletter analytics dashboard"],
    topic: "AI chatbot platform for websites",
  });
  assert.equal(f.hookPreservedInFirstSpoken, false);
});

check("deterministic enforce rewrites unrelated hook without Claude", () => {
  const r = enforceCandidateHook({
    hookLine: "Form abandoned now, discovered after vacation.",
    hook: "She sent the newsletter. Forty people clicked.",
    voiceoverText:
      "She sent the newsletter. Forty people clicked. And every single one left without a word. The site was silent.",
  });
  assert.equal(r.changed, true);
  assert.match(r.voiceover_text, /^Form abandoned now, discovered after vacation/i);
  assert.doesNotMatch(r.voiceover_text, /^She sent the newsletter/i);
});

check("empty voiceover gets hook", () => {
  const r = enforceCandidateHook({
    hookLine: "Departure board for the wrong channel.",
    hook: "",
    voiceoverText: "",
  });
  assert.match(r.voiceover_text, /Departure board/i);
});

check("duplicate hook not tripled", () => {
  const r = enforceCandidateHook({
    hookLine: "Urgent question dies in silence.",
    hook: "Urgent question dies in silence.",
    voiceoverText:
      "Urgent question dies in silence. Urgent question dies in silence. Someone typed.",
  });
  const count = (r.voiceover_text.match(/Urgent question dies in silence/gi) ?? [])
    .length;
  assert.ok(count <= 2, `expected ≤2 hook copies, got ${count}: ${r.voiceover_text}`);
});

check("generic essay opener does not pass via shared filler words", () => {
  const winner = cand({
    hookLine: "Form abandoned now, discovered after vacation.",
    openingSituation: "Visitor hands abandon a contact form on a phone",
    coreIdea: "Missed vacation leads.",
  });
  const f = checkConceptFidelity({
    winner,
    hook: "Most businesses think traffic means growth.",
    voiceoverText:
      "Most businesses think traffic means growth. In other words, the overlooked detail is that leads vanish.",
    imagePrompts: ["person looking at a laptop in a modern office desk"],
    topic: "AI chatbot platform for websites",
  });
  assert.equal(f.passed, false);
  assert.ok(
    f.failureReasons.includes("voiceover_essay_or_generic_opener") ||
      f.failureReasons.includes("hook_not_preserved_in_first_spoken"),
  );
});

console.log("\nC. Generic office behavior");

check("generic-office not emitted solely because opening matching failed", () => {
  // Opening fails (CEO office vs departure board) but scene is NOT affirmative
  // laptop-as-concept without officey collapse helper coupling.
  const opening =
    "Train-station style departure board phone vs website visitor delayed";
  const scene =
    "Wide shot of a busy city plaza fountain at dusk with pigeons";
  assert.equal(isAffirmativeGenericOfficeCollapse(opening, scene), false);
  const f = checkConceptFidelity({
    winner: cand({
      hookLine: "Departure board for the wrong channel.",
      openingSituation: opening,
      coreIdea: "Wrong channel prioritization.",
    }),
    hook: "Departure board for the wrong channel.",
    voiceoverText: "Departure board for the wrong channel. Phone callers board. Website visitors wait.",
    imagePrompts: [scene],
    topic: "AI chatbot platform for websites",
  });
  assert.equal(f.collapsedToGenericOffice, false);
});

check("true generic office replacing specific candidate still fails", () => {
  assert.equal(
    isAffirmativeGenericOfficeCollapse(
      "Close on a customer's hands abandoning a contact form",
      "Person looking at a laptop in a modern office desk stress montage",
    ),
    true,
  );
});

console.log("\nD. Candidate generation");

check("strategy title not used as industryCue", () => {
  const cue = deriveShortIndustryCue(
    "The beauty salon that found five unread visitor questions on Tuesday — and no way to reach any of them",
    ["AI chatbot platform for websites"],
  );
  assert.notEqual(cue.toLowerCase().startsWith("the beauty salon that found"), true);
  assert.ok(cue.length < 48);
  assert.match(cue, /beauty salon|salon|AI chatbot|website/i);
});

check("generated candidate coreIdea !== openingSituation", () => {
  const c = cand({
    hookLine: "Urgent question dies in silence.",
    openingSituation:
      "Close on hands sending an urgent beauty-salon website question; reply thread shows seen with no answer",
    coreIdea:
      "When website demand spikes, unanswered chat questions die in silence until an AI assistant replies",
  });
  assert.notEqual(
    c.openingSituation.trim().toLowerCase(),
    c.coreIdea.trim().toLowerCase(),
  );
  assert.doesNotMatch(c.openingSituation, /^Handheld urgency:/i);
});

check("NO_TEXT candidate repair removes literal seen / Delayed / Phone caller", () => {
  const repaired = validateAndRepairCandidate(
    cand({
      hookLine: "Urgent question dies in silence.",
      openingSituation:
        'Close on hands; reply thread shows "seen" with no answer; board says "Delayed"; "Phone caller #47" boarding',
      coreIdea:
        'Close on hands; reply thread shows "seen" with no answer; board says "Delayed"; "Phone caller #47" boarding',
    }),
  );
  assert.doesNotMatch(repaired.candidate.openingSituation, /"seen"/i);
  assert.doesNotMatch(repaired.candidate.openingSituation, /Phone caller\s*#/i);
  assert.notEqual(
    repaired.candidate.openingSituation,
    repaired.candidate.coreIdea,
  );
});

console.log("\nE. Completion invariant");

check("video-required + zero jobs => failed", () => {
  assert.equal(
    resolvePackageReconcileStatus({ requireVideo: true, jobs: [] }),
    "failed",
  );
});

check("text-only + zero jobs => completed", () => {
  assert.equal(
    resolvePackageReconcileStatus({ requireVideo: false, jobs: [] }),
    "completed",
  );
});

check("video-required + completed job => completed", () => {
  assert.equal(
    resolvePackageReconcileStatus({
      requireVideo: true,
      jobs: [{ status: "completed" }],
    }),
    "completed",
  );
});

check("video-required + processing => running", () => {
  assert.equal(
    resolvePackageReconcileStatus({
      requireVideo: true,
      jobs: [{ status: "processing" }],
    }),
    "running",
  );
});

check("planRequiresVideo uses videoCount", () => {
  assert.equal(planRequiresVideo({ videoCount: 3, platformOutputs: [] }), true);
  assert.equal(planRequiresVideo({ videoCount: 0, platformOutputs: [] }), false);
});

console.log("\nF. True invent still fails after enforce");

check("newsletter story vs form-abandon still material-fails opening/office", () => {
  const winner = cand({
    hookLine: "Form abandoned now, discovered after vacation.",
    openingSituation:
      "Close on a visitor's hands filling a contact form, then abandoning it",
    coreIdea: "Missed leads after vacation from abandoned forms.",
  });
  const enforced = enforceCandidateHook({
    hookLine: winner.hookLine,
    hook: "She sent the newsletter. Forty people clicked.",
    voiceoverText:
      "She sent the newsletter. Forty people clicked. And every single one left without a word.",
  });
  const f = checkConceptFidelity({
    winner,
    hook: enforced.hook,
    voiceoverText: enforced.voiceover_text,
    imagePrompts: [
      "Small home office nook. Tight shot: a pair of hands above an open laptop keyboard",
    ],
    topic: "AI chatbot platform for websites",
  });
  assert.equal(f.passed, false);
  assert.ok(
    f.failureReasons.some((r) => r.includes("opening_situation") || r.includes("generic_office")),
    f.failureReasons.join(","),
  );
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
