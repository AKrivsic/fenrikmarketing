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

const FR_CTA = "Inscrivez-vous gratuitement.";
const FR_BODY =
  "Fenrik lit tout le fil pour que vous ne répondiez jamais dans le vide.";

check("extractExpectedTailTokens splits hyphenated French CTA", () => {
  assert.deepEqual(extractExpectedTailTokens(`${FR_BODY} ${FR_CTA}`), [
    "inscrivez",
    "vous",
    "gratuitement",
  ]);
});

check("validateScriptTailInTranscript accepts FR hyphen CTA from whisper", () => {
  const words: WordTimestamp[] = [
    { word: "vide", start: 18, end: 18.4 },
    { word: "Inscrivez", start: 18.5, end: 19 },
    { word: "vous", start: 19, end: 19.3 },
    { word: "gratuitement", start: 19.3, end: 20 },
  ];
  assert.equal(
    validateScriptTailInTranscript(`${FR_BODY} ${FR_CTA}`, words),
    true,
  );
});

check(
  "validateScriptTailInTranscript accepts merged FR token via concat fallback",
  () => {
    const words: WordTimestamp[] = [
      { word: "inscrivez", start: 0, end: 0.4 },
      { word: "vous", start: 0.4, end: 0.7 },
      { word: "gratuitement", start: 0.7, end: 1.2 },
    ];
    assert.equal(
      validateScriptTailInTranscript(
        "Body. Inscrivezvous gratuitement.",
        words,
      ),
      true,
    );
  },
);

check("validateScriptTailInTranscript accepts sign up vs whisper signup", () => {
  const words: WordTimestamp[] = [
    { word: "the", start: 0, end: 0.2 },
    { word: "preview", start: 0.2, end: 0.4 },
    { word: "no", start: 0.4, end: 0.5 },
    { word: "signup", start: 0.5, end: 0.9 },
    { word: "needed", start: 0.9, end: 1.2 },
  ];
  assert.equal(
    validateScriptTailInTranscript(
      "Try the preview no sign up needed.",
      words,
    ),
    true,
  );
});

check(
  "validateScriptTailInTranscript accepts fenric chat vs script fenrikchat",
  () => {
    const words: WordTimestamp[] = [
      { word: "try", start: 0, end: 0.2 },
      { word: "it", start: 0.2, end: 0.3 },
      { word: "at", start: 0.3, end: 0.35 },
      { word: "fenric", start: 0.35, end: 0.5 },
      { word: "chat", start: 0.5, end: 0.7 },
    ];
    assert.equal(
      validateScriptTailInTranscript(
        "Opens fast. Try it at fenrikchat.",
        words,
      ),
      true,
    );
  },
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
