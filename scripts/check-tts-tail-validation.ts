// Dependency-free check for TTS tail token extraction + transcript validation.
//   npm run check:tts-tail-validation

import assert from "node:assert/strict";
import {
  extractExpectedTailTokens,
  validateScriptTailInTranscript,
} from "@/video-worker/services/ttsTailValidation";
import type { WordTimestamp } from "@/lib/ai/types";

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

const LIVEPOLL_TAIL =
  "Start your first poll for free.";

check("extractExpectedTailTokens takes last sentence tail", () => {
  const tail = extractExpectedTailTokens(
    `Earlier body text. ${LIVEPOLL_TAIL}`,
  );
  assert.deepEqual(tail, [
    "start",
    "your",
    "first",
    "poll",
    "for",
    "free",
  ]);
});

check("validateScriptTailInTranscript accepts ordered subsequence", () => {
  const words: WordTimestamp[] = [
    { word: "ever", start: 20, end: 21 },
    { word: "Start", start: 21.2, end: 21.5 },
    { word: "your", start: 21.5, end: 21.7 },
    { word: "first", start: 21.7, end: 22 },
    { word: "poll", start: 22, end: 22.3 },
    { word: "for", start: 22.3, end: 22.5 },
    { word: "free", start: 22.5, end: 23 },
  ];
  assert.equal(
    validateScriptTailInTranscript(LIVEPOLL_TAIL, words),
    true,
  );
});

check("validateScriptTailInTranscript rejects missing CTA tail", () => {
  const words: WordTimestamp[] = [
    { word: "no", start: 20, end: 20.5 },
    { word: "lockouts", start: 20.5, end: 21 },
    { word: "ever", start: 21, end: 22 },
  ];
  assert.equal(
    validateScriptTailInTranscript(
      `Body. ${LIVEPOLL_TAIL}`,
      words,
    ),
    false,
  );
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
