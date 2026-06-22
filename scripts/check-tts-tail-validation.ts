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

// Production-shaped fixtures (multi-sentence voiceovers from failed jobs).
const FENRIK_CHAT_BODY =
  "The before and after here isn't gradual — it's a cliff edge.";
const FENRIK_CHAT_TAIL = "Try the live preview at fenrik.chat.";

check(
  "production: fenrik.chat script vs fenric chat whisper tail",
  () => {
    const words: WordTimestamp[] = [
      { word: "edge", start: 18, end: 18.3 },
      { word: "Try", start: 18.4, end: 18.6 },
      { word: "the", start: 18.6, end: 18.7 },
      { word: "live", start: 18.7, end: 18.9 },
      { word: "preview", start: 18.9, end: 19.2 },
      { word: "at", start: 19.2, end: 19.3 },
      { word: "fenric", start: 19.3, end: 19.5 },
      { word: "chat", start: 19.5, end: 19.8 },
    ];
    assert.equal(
      validateScriptTailInTranscript(
        `${FENRIK_CHAT_BODY} ${FENRIK_CHAT_TAIL}`,
        words,
      ),
      true,
    );
  },
);

check("production: sign-up in script vs signup in whisper", () => {
  const words: WordTimestamp[] = [
    { word: "stress", start: 10, end: 10.3 },
    { word: "Try", start: 10.4, end: 10.6 },
    { word: "the", start: 10.6, end: 10.7 },
    { word: "preview", start: 10.7, end: 11 },
    { word: "no", start: 11, end: 11.1 },
    { word: "signup", start: 11.1, end: 11.4 },
    { word: "needed", start: 11.4, end: 11.7 },
  ];
  assert.equal(
    validateScriptTailInTranscript(
      "Fenrik.chat builds yours in about a minute. No code. No stress. Try the preview — no sign-up needed.",
      words,
    ),
    true,
  );
});

check("production: né vs ne in Czech tail tokens", () => {
  const words: WordTimestamp[] = [
    { word: "tým", start: 12, end: 12.2 },
    { word: "řeší", start: 12.2, end: 12.5 },
    { word: "práci", start: 12.5, end: 12.8 },
    { word: "ne", start: 12.8, end: 13 },
    { word: "to", start: 13, end: 13.1 },
    { word: "kdo", start: 13.1, end: 13.2 },
    { word: "uklidí", start: 13.2, end: 13.5 },
    { word: "kuchyňku", start: 13.5, end: 14 },
  ];
  const voiceover =
    "Když úklid běží pravidelně a spolehlivě, manažer se ráno věnuje práci. Tým taky. Napište nám – ať váš tým řeší práci, né to, kdo uklidí kuchyňku.";
  assert.equal(validateScriptTailInTranscript(voiceover, words), true);
});

check("production: transcript ends before final sentence still fails", () => {
  const words: WordTimestamp[] = [
    { word: "slow", start: 20, end: 20.3 },
    { word: "You", start: 20.4, end: 20.5 },
    { word: "just", start: 20.5, end: 20.6 },
    { word: "didn't", start: 20.6, end: 20.8 },
    { word: "know", start: 20.8, end: 21 },
    { word: "what", start: 21, end: 21.1 },
    { word: "it", start: 21.1, end: 21.2 },
    { word: "actually", start: 21.2, end: 21.5 },
    { word: "meant", start: 21.5, end: 21.7 },
    { word: "And", start: 21.8, end: 21.9 },
    { word: "you", start: 21.9, end: 22 },
    { word: "couldn't", start: 22, end: 22.3 },
    { word: "afford", start: 22.3, end: 22.5 },
    { word: "to", start: 22.5, end: 22.6 },
    { word: "guess", start: 22.6, end: 22.8 },
    { word: "wrong", start: 22.8, end: 23 },
  ];
  const voiceover =
    "The message was short. The stakes weren't. You weren't slow. You just didn't know what it actually meant. And you couldn't afford to guess wrong. That's the part nobody talks about.";
  assert.equal(validateScriptTailInTranscript(voiceover, words), false);
});

check("production: missing Try it free CTA still fails", () => {
  const words: WordTimestamp[] = [
    { word: "problem", start: 18, end: 18.4 },
    { word: "Fenrik", start: 18.5, end: 18.8 },
    { word: "shows", start: 18.8, end: 19 },
    { word: "you", start: 19, end: 19.1 },
    { word: "exactly", start: 19.1, end: 19.4 },
    { word: "who", start: 19.4, end: 19.5 },
    { word: "said", start: 19.5, end: 19.7 },
    { word: "what", start: 19.7, end: 19.9 },
    { word: "and", start: 19.9, end: 20 },
    { word: "what", start: 20, end: 20.1 },
    { word: "was", start: 20.1, end: 20.2 },
    { word: "actually", start: 20.2, end: 20.5 },
    { word: "settled", start: 20.5, end: 20.9 },
  ];
  const voiceover =
    "Forgetting who agreed to what isn't a memory problem. It's a credibility problem. Fenrik shows you exactly who said what, and what was actually settled. Try it free.";
  assert.equal(validateScriptTailInTranscript(voiceover, words), false);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
