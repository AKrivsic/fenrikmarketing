// Dependency-free check for the end-of-video silence contract. Runs via Node's
// built-in type stripping + the "@/" alias loader:
//   npm run check:end-silence
//
// Required behavior: voiceover ends -> 1.5s silence -> final frame hold -> end.
// The renderer pads the audio with `apad` (the silence) and freezes the FINAL
// frame past the padded audio so `-shortest` ends the file on the audio — the
// voiceover is never truncated and the last subtitle stays readable through the
// hold. This inspects the ffmpeg arg/filtergraph construction (no ffmpeg spawn).

import assert from "node:assert/strict";
import {
  buildMultiBeatArgs,
  buildSingleImageArgs,
  type RenderBeat,
  type RenderMp4Input,
} from "@/video-worker/services/ffmpeg";
import { TAIL_BUFFER_SECONDS } from "@/lib/video-engine/storyboard";

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

const beats: RenderBeat[] = [
  { sceneId: "s1", motion: "zoom_in", transition: "none", durationSeconds: 5 },
  { sceneId: "s2", motion: "pan_right", transition: "fade", durationSeconds: 5 },
  // Last beat already carries the storyboard tail (+1.5s) hold.
  { sceneId: "s3", motion: "zoom_out", transition: "fade", durationSeconds: 6.5 },
];

const baseInput: RenderMp4Input = {
  images: [
    { sceneId: "s1", imagePath: "/tmp/s1.png" },
    { sceneId: "s2", imagePath: "/tmp/s2.png" },
    { sceneId: "s3", imagePath: "/tmp/s3.png" },
  ],
  beats,
  audioPath: "/tmp/vo.mp3",
  srtPath: "/tmp/vo.srt",
  outputPath: "/tmp/out.mp4",
  tailPadSeconds: TAIL_BUFFER_SECONDS,
  profile: { width: 1080, height: 1920, fps: 30, transitionSeconds: 0.4 },
};

function filterOf(args: string[]): string {
  const i = args.indexOf("-filter_complex");
  assert.ok(i >= 0 && args[i + 1], "expected a -filter_complex arg");
  return args[i + 1];
}

// --- 1. tail pad present -> silence + frozen final frame -------------------

section("multi-beat: voiceover + 1.5s silence + final frame hold");

const withTail = buildMultiBeatArgs(baseInput, beats);
const tailFilter = filterOf(withTail);

check("audio is padded with exactly the tail buffer of silence (apad)", () => {
  assert.ok(
    tailFilter.includes(`apad=pad_dur=${TAIL_BUFFER_SECONDS.toFixed(3)}`),
    `expected apad pad_dur=${TAIL_BUFFER_SECONDS.toFixed(3)} in: ${tailFilter}`,
  );
});

check("the final frame is frozen (cloned) past the audio", () => {
  assert.ok(
    /tpad=stop_mode=clone:stop_duration=\d/.test(tailFilter),
    `expected a tpad clone hold in: ${tailFilter}`,
  );
});

check("the freeze is applied AFTER subtitles are burned", () => {
  const sub = tailFilter.indexOf("subtitles=");
  const freeze = tailFilter.indexOf("tpad=stop_mode=clone");
  assert.ok(sub >= 0, "expected burned subtitles");
  assert.ok(freeze > sub, "freeze must clone the subtitled final frame");
});

check("-shortest bounds the muxed file to the (padded) audio", () => {
  assert.ok(withTail.includes("-shortest"));
  // Output maps the padded audio label, not the raw stream.
  const mapIdx = withTail.lastIndexOf("-map");
  assert.equal(withTail[mapIdx + 1], "[aout]");
});

// --- 2. backward compatibility: no tail pad -> historical graph ------------

section("backward compatibility (no tail pad)");

const noTail = buildMultiBeatArgs(
  { ...baseInput, tailPadSeconds: undefined },
  beats,
);
const noTailFilter = filterOf(noTail);

check("no apad and no frozen frame when tail pad is absent", () => {
  assert.ok(!noTailFilter.includes("apad="));
  assert.ok(!noTailFilter.includes("tpad=stop_mode=clone"));
});

check("raw audio stream is mapped directly (historical shape)", () => {
  const mapIdx = noTail.lastIndexOf("-map");
  assert.equal(noTail[mapIdx + 1], `${beats.length}:a`);
});

// --- 3. single-image path keeps padding the audio --------------------------

section("single-image path");

const single = buildSingleImageArgs({
  ...baseInput,
  beats: undefined,
  images: [{ sceneId: "s1", imagePath: "/tmp/s1.png" }],
  durationSeconds: 20,
});
const singleFilter = filterOf(single);

check("single-image path still appends the tail silence (apad)", () => {
  assert.ok(
    singleFilter.includes(`apad=pad_dur=${TAIL_BUFFER_SECONDS.toFixed(3)}`),
    `expected apad in: ${singleFilter}`,
  );
  // The looped still (-loop 1) is already unbounded, so -shortest ends on audio.
  assert.ok(single.includes("-loop") && single.includes("-shortest"));
});

// --- summary ---------------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
