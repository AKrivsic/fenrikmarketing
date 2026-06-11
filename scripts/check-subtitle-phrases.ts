// Dependency-free check for the phrase-caption subtitle pipeline
// (video-worker/services/phraseCaptions.ts). Runs via Node's built-in type
// stripping + the "@/" alias loader:
//   npm run check:subtitle-phrases
//
// Subtitle Quality Sprint. Verifies that captions are PHRASE-style (2–5 words,
// natural boundaries, no single-word karaoke, no full-sentence blocks), that
// every cue clears the minimum on-screen duration, and that the cue timeline is
// continuous (no gaps, no overlaps) and covers the entire voiceover timeline.

import assert from "node:assert/strict";
import {
  buildPhraseCues,
  splitIntoPhrases,
  timelineTotalSeconds,
  MIN_CUE_SECONDS,
  MIN_WORDS_PER_PHRASE,
  MAX_WORDS_PER_PHRASE,
  LAST_CUE_TAIL_HOLD_SECONDS,
} from "@/video-worker/services/phraseCaptions";
import {
  buildStoryboard,
  SHORT_PROFILE,
  TAIL_BUFFER_SECONDS,
} from "@/lib/video-engine/storyboard";

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

const NARRATION =
  "Hosté právě parkují před domem. Byt vypadá čistě, ale hosté to poznají. " +
  "Stačí jedna věc a celý dojem se zlepší. Zkuste to ještě dnes a uvidíte rozdíl.";

const EN_NARRATION =
  "Your kitchen still smells after you clean it. The problem is the sponge. " +
  "It traps grease and spreads it around. Swap it weekly and rinse hot. " +
  "We tested this across forty flats. The smell was gone in a day. " +
  "Try it tonight and tell us how it went.";

// --- 1. phrase segmentation ------------------------------------------------

section("1. phrase segmentation (2–5 words, natural boundaries)");

check("a 5-word sentence becomes multiple phrases, not one block", () => {
  const phrases = splitIntoPhrases("Hosté právě parkují před domem.");
  assert.ok(
    phrases.length >= 2,
    `expected the sentence to be split, got ${JSON.stringify(phrases)}`,
  );
});

check("every phrase is 2–5 words (no full-sentence blocks)", () => {
  const phrases = splitIntoPhrases(NARRATION);
  for (const phrase of phrases) {
    const n = wordCount(phrase);
    assert.ok(
      n <= MAX_WORDS_PER_PHRASE,
      `phrase "${phrase}" has ${n} words (> ${MAX_WORDS_PER_PHRASE})`,
    );
  }
});

check("no single-word karaoke captions for multi-word narration", () => {
  for (const text of [NARRATION, EN_NARRATION]) {
    const phrases = splitIntoPhrases(text);
    for (const phrase of phrases) {
      assert.ok(
        wordCount(phrase) >= MIN_WORDS_PER_PHRASE,
        `phrase "${phrase}" is a single word`,
      );
    }
  }
});

check("phrases break at punctuation boundaries (preserved)", () => {
  // "Byt vypadá čistě, ale hosté to poznají." should break around the comma.
  const phrases = splitIntoPhrases(
    "Byt vypadá čistě, ale hosté to poznají.",
  );
  assert.ok(
    phrases.some((p) => p.endsWith(",") || p.endsWith("čistě,")),
    `expected a comma boundary, got ${JSON.stringify(phrases)}`,
  );
  // Concatenating phrases reproduces the original words (punctuation kept).
  assert.equal(
    phrases.join(" ").replace(/\s+/g, " ").trim(),
    "Byt vypadá čistě, ale hosté to poznají.",
  );
});

check("phrase concatenation preserves all narration words in order", () => {
  const phrases = splitIntoPhrases(EN_NARRATION);
  assert.equal(
    phrases.join(" ").replace(/\s+/g, " ").trim(),
    EN_NARRATION.replace(/\s+/g, " ").trim(),
  );
});

check("a very short input stays a single caption (no forced split)", () => {
  assert.deepEqual(splitIntoPhrases("Stop now"), ["Stop now"]);
  assert.deepEqual(splitIntoPhrases("Go"), ["Go"]);
});

// --- 2. cue building over the audio-master timeline ------------------------

section("2. phrase cues over the measured timeline");

function buildCues(audioDurationSeconds: number) {
  const beats = buildStoryboard({
    voiceoverText: EN_NARRATION,
    sceneIds: ["s1", "s2", "s3"],
    audioDurationSeconds,
  });
  const result = buildPhraseCues({
    beats,
    transitionSeconds: SHORT_PROFILE.transitionSeconds,
  });
  const total = timelineTotalSeconds(beats, SHORT_PROFILE.transitionSeconds);
  return { ...result, total };
}

check("produces many short phrase cues (not one per beat)", () => {
  const { cues } = buildCues(22);
  assert.ok(
    cues.length >= 8,
    `expected phrase-level cues, got only ${cues.length}`,
  );
});

check("minimum on-screen duration is honoured (no flashing)", () => {
  const { cues } = buildCues(22);
  for (const cue of cues) {
    const dur = cue.endSeconds - cue.startSeconds;
    assert.ok(
      dur >= MIN_CUE_SECONDS - 1e-6,
      `cue "${cue.text}" lasts ${dur.toFixed(3)}s (< ${MIN_CUE_SECONDS}s)`,
    );
  }
});

check("timing is continuous (each cue starts where the previous ends)", () => {
  const { cues } = buildCues(22);
  for (let i = 1; i < cues.length; i++) {
    assert.ok(
      Math.abs(cues[i].startSeconds - cues[i - 1].endSeconds) < 1e-6,
      `discontinuity between cue ${i - 1} and ${i}`,
    );
  }
});

check("no overlaps and no gaps between cues", () => {
  const { cues } = buildCues(18);
  for (let i = 1; i < cues.length; i++) {
    const gap = cues[i].startSeconds - cues[i - 1].endSeconds;
    assert.ok(gap >= -1e-6, `cue ${i} overlaps the previous (gap ${gap})`);
    assert.ok(gap <= 1e-6, `gap before cue ${i} (${gap}s)`);
  }
});

check("cues cover the entire voiceover timeline (0 -> total)", () => {
  const { cues, total } = buildCues(22);
  assert.ok(cues.length > 0, "expected cues");
  assert.ok(
    Math.abs(cues[0].startSeconds - 0) < 1e-6,
    `first cue starts at ${cues[0].startSeconds}, expected 0`,
  );
  assert.ok(
    Math.abs(cues[cues.length - 1].endSeconds - total) < 1e-6,
    `last cue ends at ${cues[cues.length - 1].endSeconds}, expected ${total}`,
  );
});

check("the cue total equals the audio-master timeline total", () => {
  const { totalSeconds, total } = buildCues(22);
  assert.ok(
    Math.abs(totalSeconds - total) < 1e-6,
    `totalSeconds ${totalSeconds} != timeline ${total}`,
  );
});

check("sum of cue durations equals the timeline (mass is conserved)", () => {
  const { cues, total } = buildCues(19);
  const sum = cues.reduce((acc, c) => acc + (c.endSeconds - c.startSeconds), 0);
  assert.ok(
    Math.abs(sum - total) < 1e-6,
    `cue durations sum to ${sum.toFixed(3)}, expected ${total.toFixed(3)}`,
  );
});

// --- 3. Subtitle Tail Timing Fix V1 — speech window vs silent tail ----------

section("3. subtitle tail timing (cues cover speech, not the silent tail)");

// Production-shaped storyboard: the last beat carries the TAIL_BUFFER_SECONDS
// silent hold, so the beat timeline = speech + tail (exactly what the renderer
// pads the video to). Subtitles must be timed against the SPEECH window only.
function buildTailFixCues(audioDurationSeconds: number) {
  const beats = buildStoryboard({
    voiceoverText: EN_NARRATION,
    sceneIds: ["s1", "s2", "s3"],
    audioDurationSeconds,
    tailBufferSeconds: TAIL_BUFFER_SECONDS,
  });
  const timelineTotal = timelineTotalSeconds(
    beats,
    SHORT_PROFILE.transitionSeconds,
  );
  const result = buildPhraseCues({
    beats,
    transitionSeconds: SHORT_PROFILE.transitionSeconds,
    speechDurationSeconds: audioDurationSeconds,
    tailBufferSeconds: TAIL_BUFFER_SECONDS,
  });
  return { ...result, timelineTotal };
}

check("proportional cues end at speechDuration, not speechDuration + tail", () => {
  // Requirement example: audioDuration = 29.916, tail = 1.5 -> cover ~0..29.916,
  // NOT 0..31.416.
  const speech = 29.916;
  const { cues, totalSeconds, timelineTotal } = buildTailFixCues(speech);
  const lastEnd = cues[cues.length - 1].endSeconds;
  assert.ok(
    Math.abs(timelineTotal - (speech + TAIL_BUFFER_SECONDS)) < 0.05,
    `fixture timeline should be speech+tail (~${(speech + TAIL_BUFFER_SECONDS).toFixed(3)}), got ${timelineTotal.toFixed(3)}`,
  );
  assert.ok(
    lastEnd <= speech + 0.5 + 1e-6,
    `last cue ends at ${lastEnd.toFixed(3)}, expected <= ${(speech + 0.5).toFixed(3)} (must not reach ${(speech + TAIL_BUFFER_SECONDS).toFixed(3)})`,
  );
  assert.ok(
    lastEnd >= speech - 1e-6,
    `last cue ends at ${lastEnd.toFixed(3)}, expected >= speechDuration ${speech}`,
  );
  assert.ok(
    Math.abs(totalSeconds - lastEnd) < 1e-6,
    "totalSeconds should equal the last cue end",
  );
});

check("the final cue is not delayed into the tail (start <= speechDuration)", () => {
  const speech = 22;
  const { cues } = buildTailFixCues(speech);
  const last = cues[cues.length - 1];
  assert.ok(
    last.startSeconds <= speech + 1e-6,
    `last cue starts at ${last.startSeconds.toFixed(3)}, expected <= speechDuration ${speech}`,
  );
});

check("the last cue holds at most LAST_CUE_TAIL_HOLD_SECONDS past speech", () => {
  const speech = 22;
  const { cues } = buildTailFixCues(speech);
  const lastEnd = cues[cues.length - 1].endSeconds;
  assert.ok(
    lastEnd <= speech + LAST_CUE_TAIL_HOLD_SECONDS + 1e-6,
    `last cue end ${lastEnd.toFixed(3)} exceeds speech + hold ${(speech + LAST_CUE_TAIL_HOLD_SECONDS).toFixed(3)}`,
  );
});

check("every non-final cue stays inside the speech window", () => {
  const speech = 22;
  const { cues } = buildTailFixCues(speech);
  for (let i = 0; i < cues.length - 1; i++) {
    assert.ok(
      cues[i].endSeconds <= speech + 1e-6,
      `cue ${i} ends at ${cues[i].endSeconds.toFixed(3)}, past speechDuration ${speech}`,
    );
  }
});

check("full coverage, no gaps inside the speech window (0 -> last end)", () => {
  const { cues, totalSeconds } = buildTailFixCues(22);
  assert.ok(cues.length > 0, "expected cues");
  assert.ok(Math.abs(cues[0].startSeconds) < 1e-6, "first cue must start at 0");
  for (let i = 1; i < cues.length; i++) {
    assert.ok(
      Math.abs(cues[i].startSeconds - cues[i - 1].endSeconds) < 1e-6,
      `discontinuity between cue ${i - 1} and ${i}`,
    );
  }
  assert.ok(
    Math.abs(cues[cues.length - 1].endSeconds - totalSeconds) < 1e-6,
    "last cue end must equal totalSeconds",
  );
});

check("speech window is reported in the result for diagnostics", () => {
  const speech = 22;
  const { speechDurationSeconds } = buildTailFixCues(speech);
  assert.ok(
    Math.abs(speechDurationSeconds - speech) < 1e-6,
    `expected speechDurationSeconds ${speech}, got ${speechDurationSeconds}`,
  );
});

check("every cue clears the minimum on-screen duration (no flashing)", () => {
  const { cues } = buildTailFixCues(22);
  for (const cue of cues) {
    const dur = cue.endSeconds - cue.startSeconds;
    assert.ok(
      dur >= MIN_CUE_SECONDS - 1e-6,
      `cue "${cue.text}" lasts ${dur.toFixed(3)}s (< ${MIN_CUE_SECONDS}s)`,
    );
  }
});

check("legacy path (no speechDuration) still covers the full beat timeline", () => {
  // Backward compatibility: without speechDurationSeconds/tailBufferSeconds the
  // cues cover the whole beat timeline exactly (unchanged behaviour).
  const beats = buildStoryboard({
    voiceoverText: EN_NARRATION,
    sceneIds: ["s1", "s2"],
    audioDurationSeconds: 22,
  });
  const total = timelineTotalSeconds(beats, SHORT_PROFILE.transitionSeconds);
  const { cues, totalSeconds } = buildPhraseCues({
    beats,
    transitionSeconds: SHORT_PROFILE.transitionSeconds,
  });
  assert.ok(
    Math.abs(totalSeconds - total) < 1e-6,
    `legacy totalSeconds ${totalSeconds} != timeline ${total}`,
  );
  assert.ok(
    Math.abs(cues[cues.length - 1].endSeconds - total) < 1e-6,
    "legacy last cue must end exactly at the beat timeline",
  );
});

// --- 4. edge cases ---------------------------------------------------------

section("4. edge cases");

check("empty narration yields no cues (and never throws)", () => {
  const beats = buildStoryboard({
    voiceoverText: "Some words here for beats",
    sceneIds: ["s1"],
    audioDurationSeconds: 16,
  }).map((b) => ({ ...b, text: "" }));
  const { cues } = buildPhraseCues({
    beats,
    transitionSeconds: SHORT_PROFILE.transitionSeconds,
  });
  assert.equal(cues.length, 0);
});

check("a tiny timeline degrades gracefully without overlaps", () => {
  const beats = buildStoryboard({
    voiceoverText: EN_NARRATION,
    sceneIds: ["s1"],
    audioDurationSeconds: 4,
  });
  const { cues } = buildPhraseCues({
    beats,
    transitionSeconds: SHORT_PROFILE.transitionSeconds,
    minCueSeconds: MIN_CUE_SECONDS,
  });
  for (let i = 1; i < cues.length; i++) {
    assert.ok(cues[i].startSeconds >= cues[i - 1].endSeconds - 1e-6);
  }
});

// --- summary ---------------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
