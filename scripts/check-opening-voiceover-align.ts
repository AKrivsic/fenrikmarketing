/**
 * Opening Impact ↔ voiceover_text align (apostrophe / whitespace prefix compare).
 *   npm run check:opening-voiceover-align
 */

import assert from "node:assert/strict";
import {
  alignOpeningVoiceover,
  normalizeForOpeningPrefixCompare,
} from "@/lib/content-pipeline/alignOpeningVoiceover";

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

const CURLY = "\u2019"; // ’
const STRAIGHT = "\u0027"; // '

check("A. exact match — opening not prepended", () => {
  const opening = "I have been sitting all day.";
  const voiceover = "I have been sitting all day. My back feels stiff.";
  const result = alignOpeningVoiceover({ opening, voiceover });
  assert.equal(result.prepended, false);
  assert.equal(result.voiceover_text, voiceover);
  assert.equal(result.hook, opening);
});

check("B. curly vs straight apostrophe — AlignRight production case", () => {
  const opening = `I${CURLY}ve stood up from my desk the same way every day for two years. Today, my lower back decided to renegotiate.`;
  const voiceover = `I${STRAIGHT}ve stood up from my desk the same way every day for two years. Today, my lower back decided to renegotiate. Four hours of video calls.`;
  const result = alignOpeningVoiceover({ opening, voiceover });
  assert.equal(result.prepended, false);
  assert.equal(result.voiceover_text, voiceover);
  assert.equal(result.hook, opening);
  // Resulting VO begins once with the Claude (straight) opening, not doubled.
  const firstBlock = `I${STRAIGHT}ve stood up from my desk the same way every day for two years. Today, my lower back decided to renegotiate.`;
  assert.ok(result.voiceover_text.startsWith(firstBlock));
  assert.equal(
    result.voiceover_text.indexOf(firstBlock),
    result.voiceover_text.lastIndexOf(firstBlock),
  );
});

check("C. reverse apostrophe direction — opening not prepended", () => {
  const opening = `I${STRAIGHT}ve stood up from my desk.`;
  const voiceover = `I${CURLY}ve stood up from my desk. Four hours of video calls.`;
  const result = alignOpeningVoiceover({ opening, voiceover });
  assert.equal(result.prepended, false);
  assert.equal(result.voiceover_text, voiceover);
  assert.equal(result.hook, opening);
});

check("D. whitespace variation — opening not prepended", () => {
  const opening = "I have been sitting all day.";
  const voiceover = "I  have\nbeen   sitting all day. My back feels stiff.";
  const result = alignOpeningVoiceover({ opening, voiceover });
  assert.equal(result.prepended, false);
  assert.equal(result.voiceover_text, voiceover);
  assert.ok(
    normalizeForOpeningPrefixCompare(voiceover).startsWith(
      normalizeForOpeningPrefixCompare(opening),
    ),
  );
});

check("E. genuinely missing opening — prepend exactly once", () => {
  const opening = "Your back may be reacting to hours of sitting.";
  const voiceover =
    "Four hours of video calls can leave your back feeling stiff.";
  const result = alignOpeningVoiceover({ opening, voiceover });
  assert.equal(result.prepended, true);
  assert.equal(result.hook, opening);
  assert.equal(result.voiceover_text, `${opening} ${voiceover}`);
  assert.equal(
    result.voiceover_text.split(opening).length - 1,
    1,
  );
});

check("F. empty voiceover — result is opening only", () => {
  const opening = "Your back may be reacting to hours of sitting.";
  const result = alignOpeningVoiceover({ opening, voiceover: "" });
  assert.equal(result.prepended, true);
  assert.equal(result.hook, opening);
  assert.equal(result.voiceover_text, opening);
});

check("G. empty opening — voiceover unchanged", () => {
  const voiceover = "Four hours of video calls can leave your back feeling stiff.";
  const result = alignOpeningVoiceover({ opening: "   ", voiceover });
  assert.equal(result.prepended, false);
  assert.equal(result.hook, "");
  assert.equal(result.voiceover_text, voiceover);
});

check("normalizeForOpeningPrefixCompare maps U+02BC", () => {
  const withModifier = `I\u02BCve been sitting.`;
  const withStraight = `I've been sitting.`;
  assert.equal(
    normalizeForOpeningPrefixCompare(withModifier),
    normalizeForOpeningPrefixCompare(withStraight),
  );
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
