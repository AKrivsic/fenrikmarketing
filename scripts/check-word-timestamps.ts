// Dependency-free check for Word Timestamp Subtitles V1.
// Runs via Node's built-in type stripping + the "@/" alias loader:
//   npm run check:word-timestamps
//
// Verifies the REAL-timing subtitle path:
//   - whisper verbose_json word parsing/sanitizing
//   - language-hint normalization (CZ/EN/DE/FR/ES/IT, multilingual)
//   - phrase grouping is unchanged (2–5 word phrases, NOT word-by-word)
//   - phrase timing comes from real word timestamps (start = first word start,
//     end >= last word end)
//   - cue track is monotonic, gap-free and overlap-free
//   - the alignment FALLS BACK (returns null) on empty/low-confidence input
//
// The existing proportional subtitle tests (check:subtitle-phrases) must keep
// passing; they are a separate script and are not modified here.

import assert from "node:assert/strict";
import {
  buildPhraseCuesFromWords,
  splitIntoPhrases,
  MIN_CUE_SECONDS,
  MIN_WORDS_PER_PHRASE,
  MAX_WORDS_PER_PHRASE,
} from "@/video-worker/services/phraseCaptions";
import {
  sanitizeWhisperWords,
  normalizeLanguageHint,
} from "@/video-worker/services/wordTimestamps";
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
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  FAIL ${name}`);
    console.error(`       ${message.replace(/\n/g, "\n       ")}`);
  }
}

function section(title: string): void {
  console.log(`\n${title}`);
}

function wordCount(phrase: string): number {
  return phrase.trim().split(/\s+/).filter(Boolean).length;
}

const EN_NARRATION =
  "Your kitchen still smells after you clean it. The problem is the sponge. " +
  "It traps grease and spreads it around. Swap it weekly and rinse hot. " +
  "Try it tonight and tell us how it went.";

const CZ_NARRATION =
  "Hosté právě parkují před domem. Byt vypadá čistě, ale hosté to poznají. " +
  "Stačí jedna věc a celý dojem se zlepší. Zkuste to ještě dnes a uvidíte rozdíl.";

// Synthesizes whisper-style word timestamps for a narration: one entry per
// whitespace token (1:1 with the narration token stream), each WORD_DUR long
// with a WORD_GAP of silence between words. WORD_DUR + WORD_GAP are chosen so
// every 2-word phrase comfortably clears MIN_CUE_SECONDS, which keeps the cue
// start exactly equal to the first word's start (no min-duration clamping).
const WORD_DUR = 0.6;
const WORD_GAP = 0.1;

function tokensOf(text: string): string[] {
  return text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
}

function synthWords(text: string): WordTimestamp[] {
  const tokens = tokensOf(text);
  const out: WordTimestamp[] = [];
  let clock = 0;
  for (const token of tokens) {
    out.push({ word: token, start: clock, end: clock + WORD_DUR });
    clock += WORD_DUR + WORD_GAP;
  }
  return out;
}

// Replays the phrase boundaries against the synthetic token clock to derive the
// expected first-word-start / last-word-end for each phrase.
function expectedPhraseTimes(text: string): { start: number; end: number }[] {
  const tokens = tokensOf(text);
  const times = synthWords(text);
  const phrases = splitIntoPhrases(text);
  const result: { start: number; end: number }[] = [];
  let idx = 0;
  for (const phrase of phrases) {
    const count = tokensOf(phrase).length;
    const first = times[idx];
    const last = times[idx + count - 1];
    assert.ok(first && last, "synthetic token range out of bounds");
    result.push({ start: first.start, end: last.end });
    idx += count;
  }
  assert.equal(idx, tokens.length, "phrase tokens did not cover all tokens");
  return result;
}

// --- 1. whisper timestamp parsing ------------------------------------------

section("1. whisper verbose_json word parsing / sanitizing");

check("parses valid words and preserves text + timing", () => {
  const words = sanitizeWhisperWords([
    { word: "Hello", start: 0, end: 0.4 },
    { word: "world", start: 0.4, end: 0.9 },
  ]);
  assert.equal(words.length, 2);
  assert.deepEqual(words[0], { word: "Hello", start: 0, end: 0.4 });
});

check("drops empty, non-finite, negative and inverted entries", () => {
  const words = sanitizeWhisperWords([
    { word: "  ", start: 0, end: 1 }, // empty text
    { word: "a", start: "x", end: 1 }, // non-numeric start
    { word: "b", start: 1, end: 0.5 }, // end < start
    { word: "c", start: -1, end: 2 }, // negative start
    { word: "ok", start: 1, end: 2 }, // valid
  ]);
  assert.equal(words.length, 1);
  assert.equal(words[0].word, "ok");
});

check("coerces numeric strings and sorts by start", () => {
  const words = sanitizeWhisperWords([
    { word: "second", start: "1.0", end: "1.5" },
    { word: "first", start: "0.0", end: "0.5" },
  ]);
  assert.deepEqual(
    words.map((w) => w.word),
    ["first", "second"],
  );
});

check("non-array input yields an empty list (never throws)", () => {
  assert.deepEqual(sanitizeWhisperWords(undefined), []);
  assert.deepEqual(sanitizeWhisperWords(null), []);
  assert.deepEqual(sanitizeWhisperWords("nope"), []);
});

// --- 2. multilingual language hint -----------------------------------------

section("2. language hint normalization (CZ/EN/DE/FR/ES/IT)");

check("maps every supported language to its ISO-639-1 code", () => {
  assert.equal(normalizeLanguageHint("cz"), "cs");
  assert.equal(normalizeLanguageHint("cs"), "cs");
  assert.equal(normalizeLanguageHint("en"), "en");
  assert.equal(normalizeLanguageHint("de"), "de");
  assert.equal(normalizeLanguageHint("fr"), "fr");
  assert.equal(normalizeLanguageHint("es"), "es");
  assert.equal(normalizeLanguageHint("it"), "it");
});

check("is case-insensitive and strips region/locale suffixes", () => {
  assert.equal(normalizeLanguageHint("CZ"), "cs");
  assert.equal(normalizeLanguageHint("en-US"), "en");
  assert.equal(normalizeLanguageHint("de_DE"), "de");
  assert.equal(normalizeLanguageHint("  Fr  "), "fr");
});

check("returns undefined for unsupported / non-string input", () => {
  assert.equal(normalizeLanguageHint("pl"), undefined);
  assert.equal(normalizeLanguageHint(""), undefined);
  assert.equal(normalizeLanguageHint(42), undefined);
  assert.equal(normalizeLanguageHint(undefined), undefined);
});

// --- 3. phrase grouping is unchanged (style) -------------------------------

section("3. phrase grouping uses the existing 2–5 word phrase style");

check("cue count equals the phrase count (not one cue per word)", () => {
  const phrases = splitIntoPhrases(EN_NARRATION);
  const result = buildPhraseCuesFromWords({
    voiceoverText: EN_NARRATION,
    words: synthWords(EN_NARRATION),
  });
  assert.ok(result, "expected aligned cues");
  assert.equal(result!.cues.length, phrases.length);
});

check("every cue is a 2–5 word phrase (no word-by-word karaoke)", () => {
  const result = buildPhraseCuesFromWords({
    voiceoverText: EN_NARRATION,
    words: synthWords(EN_NARRATION),
  });
  assert.ok(result);
  for (const cue of result!.cues) {
    const n = wordCount(cue.text);
    assert.ok(
      n >= MIN_WORDS_PER_PHRASE && n <= MAX_WORDS_PER_PHRASE,
      `cue "${cue.text}" has ${n} words`,
    );
  }
});

check("cue texts equal splitIntoPhrases (style is identical)", () => {
  const result = buildPhraseCuesFromWords({
    voiceoverText: EN_NARRATION,
    words: synthWords(EN_NARRATION),
  });
  assert.ok(result);
  assert.deepEqual(
    result!.cues.map((c) => c.text),
    splitIntoPhrases(EN_NARRATION),
  );
});

// --- 4. timing comes from real word timestamps -----------------------------

section("4. phrase timing follows real word timestamps");

check("cue start = first word start, cue end >= last word end", () => {
  const expected = expectedPhraseTimes(EN_NARRATION);
  const total = synthWords(EN_NARRATION).reduce((m, w) => Math.max(m, w.end), 0) + 2;
  const result = buildPhraseCuesFromWords({
    voiceoverText: EN_NARRATION,
    words: synthWords(EN_NARRATION),
    totalSeconds: total,
  });
  assert.ok(result);
  result!.cues.forEach((cue, i) => {
    assert.ok(
      Math.abs(cue.startSeconds - expected[i].start) < 1e-6,
      `cue ${i} start ${cue.startSeconds} != first word start ${expected[i].start}`,
    );
    assert.ok(
      cue.endSeconds >= expected[i].end - 1e-6,
      `cue ${i} end ${cue.endSeconds} < last word end ${expected[i].end}`,
    );
  });
});

check("the last cue ends at the last spoken word", () => {
  const expected = expectedPhraseTimes(EN_NARRATION);
  const total = synthWords(EN_NARRATION).reduce((m, w) => Math.max(m, w.end), 0) + 2;
  const result = buildPhraseCuesFromWords({
    voiceoverText: EN_NARRATION,
    words: synthWords(EN_NARRATION),
    totalSeconds: total,
  });
  assert.ok(result);
  const lastCue = result!.cues[result!.cues.length - 1];
  const lastExpected = expected[expected.length - 1];
  assert.ok(
    Math.abs(lastCue.endSeconds - lastExpected.end) < 1e-6,
    `last cue ends at ${lastCue.endSeconds}, expected ${lastExpected.end}`,
  );
});

// --- 5/6/7. monotonic, no overlaps, no gaps --------------------------------

section("5–7. monotonic order, no overlaps, no gaps");

for (const [label, narration] of [
  ["EN", EN_NARRATION],
  ["CZ", CZ_NARRATION],
] as const) {
  check(`${label}: cue starts are strictly increasing (monotonic)`, () => {
    const result = buildPhraseCuesFromWords({
      voiceoverText: narration,
      words: synthWords(narration),
    });
    assert.ok(result);
    for (let i = 1; i < result!.cues.length; i++) {
      assert.ok(
        result!.cues[i].startSeconds > result!.cues[i - 1].startSeconds,
        `cue ${i} start not after cue ${i - 1}`,
      );
    }
  });

  check(`${label}: no overlaps and no gaps (contiguous track)`, () => {
    const result = buildPhraseCuesFromWords({
      voiceoverText: narration,
      words: synthWords(narration),
    });
    assert.ok(result);
    for (let i = 1; i < result!.cues.length; i++) {
      const gap =
        result!.cues[i].startSeconds - result!.cues[i - 1].endSeconds;
      assert.ok(Math.abs(gap) < 1e-6, `gap/overlap of ${gap}s before cue ${i}`);
    }
  });

  check(`${label}: every cue clears the minimum on-screen duration`, () => {
    const result = buildPhraseCuesFromWords({
      voiceoverText: narration,
      words: synthWords(narration),
    });
    assert.ok(result);
    for (const cue of result!.cues) {
      const dur = cue.endSeconds - cue.startSeconds;
      assert.ok(
        dur >= MIN_CUE_SECONDS - 1e-6,
        `cue "${cue.text}" lasts ${dur.toFixed(3)}s`,
      );
    }
  });
}

check("Czech diacritics survive grouping and alignment", () => {
  const result = buildPhraseCuesFromWords({
    voiceoverText: CZ_NARRATION,
    words: synthWords(CZ_NARRATION),
  });
  assert.ok(result);
  const joined = result!.cues.map((c) => c.text).join(" ");
  assert.ok(joined.includes("čistě"), "lost Czech diacritics in cue text");
});

// --- 8. fallback path ------------------------------------------------------

section("8. fallback (returns null so the caller uses proportional timing)");

check("empty word list -> null", () => {
  const result = buildPhraseCuesFromWords({
    voiceoverText: EN_NARRATION,
    words: [],
  });
  assert.equal(result, null);
});

check("empty narration -> null", () => {
  const result = buildPhraseCuesFromWords({
    voiceoverText: "   ",
    words: synthWords(EN_NARRATION),
  });
  assert.equal(result, null);
});

check("transcript that does not match the narration -> null", () => {
  // Whisper heard something unrelated (e.g. wrong audio): alignment confidence
  // is below the threshold, so we fall back rather than emit garbage timing.
  const mismatched = synthWords(
    "zzz qqq xyz foo bar baz qux lorem ipsum dolor sit amet consectetur",
  );
  const result = buildPhraseCuesFromWords({
    voiceoverText: EN_NARRATION,
    words: mismatched,
  });
  assert.equal(result, null);
});

check("tolerates a few extra (hallucinated) transcript words", () => {
  // Whisper sometimes prepends filler/hallucinated tokens. The greedy aligner's
  // look-ahead window should skip them and still align the real narration.
  const words = synthWords(`um uh ${EN_NARRATION}`);
  const result = buildPhraseCuesFromWords({
    voiceoverText: EN_NARRATION,
    words,
  });
  assert.ok(result, "expected alignment to survive a few extra words");
  assert.deepEqual(
    result!.cues.map((c) => c.text),
    splitIntoPhrases(EN_NARRATION),
  );
});

check("tolerates a dropped unique word (still aligns)", () => {
  // Drop one unique interior word ("sponge"); no repeated-word cascade, so the
  // alignment stays well above the confidence threshold.
  const words = synthWords(EN_NARRATION).filter(
    (w) => w.word.replace(/[^\p{L}]/gu, "").toLowerCase() !== "sponge",
  );
  const result = buildPhraseCuesFromWords({
    voiceoverText: EN_NARRATION,
    words,
  });
  assert.ok(result, "expected alignment to survive a dropped unique word");
});

// --- summary ---------------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
