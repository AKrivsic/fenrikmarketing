// Dependency-free check for the audio-master video timeline
// (lib/video-engine/storyboard.ts). Runs via Node's built-in type stripping +
// the "@/" alias loader:
//   npm run check:video-sync
//
// Content Quality Sprint — Video Sync Fix. Verifies that when a REAL voiceover
// duration is supplied, the beat timeline (and therefore the subtitle timeline,
// which shares the same beat durations) sums to exactly that duration, so
// subtitles / images never pre-empt the voice and -shortest never cuts audio.
// Also verifies the legacy words-per-second estimate is unchanged when no audio
// duration is provided.

import assert from "node:assert/strict";
import {
  buildStoryboard,
  SHORT_PROFILE,
  type StoryboardBeat,
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

// Replicates the renderer's xfade timeline math (jobRunner.buildSubtitleTimeline
// and ffmpeg.buildMultiBeatArgs): each transition overlaps the running timeline
// by transitionSeconds, so the final cumulative length is the true video /
// subtitle duration.
function timelineTotalSeconds(
  beats: StoryboardBeat[],
  transitionSeconds: number,
): number {
  if (beats.length === 0) return 0;
  let cumulative = beats[0].durationSeconds;
  for (let i = 1; i < beats.length; i++) {
    const td = Math.min(transitionSeconds, beats[i].durationSeconds / 2);
    cumulative = cumulative - td + beats[i].durationSeconds;
  }
  return cumulative;
}

const SAMPLE_NARRATION =
  "Your kitchen still smells after you clean it. The problem is the sponge. " +
  "It traps grease and spreads it around. Swap it weekly and rinse hot. " +
  "We tested this across forty flats. The smell was gone in a day. " +
  "Try it tonight and tell us how it went.";

// --- 1. audio is the master timeline (typical 30s short) -------------------

section("audio-master timeline (measured duration drives the sum)");

check("beat timeline sums to the measured audio duration (30s)", () => {
  const beats = buildStoryboard({
    voiceoverText: SAMPLE_NARRATION,
    sceneIds: ["s1", "s2", "s3"],
    audioDurationSeconds: 30,
  });
  const total = timelineTotalSeconds(beats, SHORT_PROFILE.transitionSeconds);
  assert.ok(
    Math.abs(total - 30) < 0.1,
    `expected ~30s, got ${total.toFixed(3)}s`,
  );
});

check("long audio is NOT capped at maxDurationSeconds (90s)", () => {
  const beats = buildStoryboard({
    voiceoverText: SAMPLE_NARRATION,
    sceneIds: ["s1", "s2"],
    audioDurationSeconds: 90,
  });
  const total = timelineTotalSeconds(beats, SHORT_PROFILE.transitionSeconds);
  assert.ok(
    Math.abs(total - 90) < 0.1,
    `expected ~90s (no 45s cap), got ${total.toFixed(3)}s`,
  );
});

check("short audio sums exactly (12s)", () => {
  const beats = buildStoryboard({
    voiceoverText: SAMPLE_NARRATION,
    sceneIds: ["s1"],
    audioDurationSeconds: 12,
  });
  const total = timelineTotalSeconds(beats, SHORT_PROFILE.transitionSeconds);
  assert.ok(
    Math.abs(total - 12) < 0.1,
    `expected ~12s, got ${total.toFixed(3)}s`,
  );
});

check("beat count stays within the profile range when audio-driven", () => {
  const beats = buildStoryboard({
    voiceoverText: SAMPLE_NARRATION,
    sceneIds: ["s1", "s2"],
    audioDurationSeconds: 30,
  });
  assert.ok(beats.length >= SHORT_PROFILE.minBeats);
  assert.ok(beats.length <= SHORT_PROFILE.maxBeats);
});

check("each beat carries one subtitle segment (text present)", () => {
  const beats = buildStoryboard({
    voiceoverText: SAMPLE_NARRATION,
    sceneIds: ["s1", "s2"],
    audioDurationSeconds: 30,
  });
  // Every beat should map to a narration segment so cues stay in sync; the hook
  // beat is always populated, the rest may merge/split but must not be empty for
  // a multi-sentence narration.
  assert.ok(beats.every((b) => typeof b.text === "string"));
  assert.ok(beats[0].text.trim().length > 0);
});

// --- 2. backward compatibility: no audio -> legacy estimate ----------------

section("legacy fallback (no measured duration)");

check("without audio duration, total is clamped to the profile window", () => {
  const beats = buildStoryboard({
    voiceoverText: SAMPLE_NARRATION,
    sceneIds: ["s1", "s2"],
  });
  const total = timelineTotalSeconds(beats, SHORT_PROFILE.transitionSeconds);
  assert.ok(
    total >= SHORT_PROFILE.minDurationSeconds - 1 &&
      total <= SHORT_PROFILE.maxDurationSeconds + 1,
    `expected within [${SHORT_PROFILE.minDurationSeconds}, ${SHORT_PROFILE.maxDurationSeconds}], got ${total.toFixed(3)}s`,
  );
});

check("invalid audio duration (0 / NaN) falls back to estimate", () => {
  const zero = buildStoryboard({
    voiceoverText: SAMPLE_NARRATION,
    sceneIds: ["s1"],
    audioDurationSeconds: 0,
  });
  const totalZero = timelineTotalSeconds(zero, SHORT_PROFILE.transitionSeconds);
  assert.ok(totalZero <= SHORT_PROFILE.maxDurationSeconds + 1);

  const nan = buildStoryboard({
    voiceoverText: SAMPLE_NARRATION,
    sceneIds: ["s1"],
    audioDurationSeconds: Number.NaN,
  });
  const totalNaN = timelineTotalSeconds(nan, SHORT_PROFILE.transitionSeconds);
  assert.ok(totalNaN <= SHORT_PROFILE.maxDurationSeconds + 1);
});

// --- summary ---------------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
