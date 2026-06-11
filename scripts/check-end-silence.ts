// Dependency-free check for the Subtitle Reliability V1 render contract. Runs via
// Node's built-in type stripping + the "@/" alias loader:
//   npm run check:end-silence
//
// Contract (Parts A + B):
//   * AUDIO is the single source of truth: when a target duration is provided
//     the renderer forces it with an explicit -t (NOT -shortest / filtergraph
//     convergence). The audio is padded indefinitely (apad) and the final video
//     frame is frozen so both streams always reach the target.
//   * Subtitles are burned in a DEDICATED second pass (buildSubtitleBurnArgs);
//     libass NEVER touches the xfade graph (no subtitles= inside the intermediate
//     filter_complex).
// This inspects the ffmpeg arg/filtergraph construction only (no ffmpeg spawn).

import assert from "node:assert/strict";
import {
  buildMultiBeatArgs,
  buildSingleImageArgs,
  buildSubtitleBurnArgs,
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
  { sceneId: "s3", motion: "zoom_out", transition: "fade", durationSeconds: 6.5 },
];

const TARGET = 26.0 + TAIL_BUFFER_SECONDS;

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
  targetDurationSeconds: TARGET,
  profile: { width: 1080, height: 1920, fps: 30, transitionSeconds: 0.4 },
};

function filterOf(args: string[]): string {
  const i = args.indexOf("-filter_complex");
  assert.ok(i >= 0 && args[i + 1], "expected a -filter_complex arg");
  return args[i + 1];
}

// --- 1. explicit duration target ------------------------------------------

section("multi-beat intermediate: explicit -t target, audio is the master");

const withTarget = buildMultiBeatArgs(baseInput, beats);
const targetFilter = filterOf(withTarget);

check("output is forced to the exact target with -t (not -shortest)", () => {
  // The output -t is the LAST -t (per-beat inputs also use -t before -i).
  const tIdx = withTarget.lastIndexOf("-t");
  assert.ok(tIdx >= 0, "expected an output -t");
  assert.equal(withTarget[tIdx + 1], TARGET.toFixed(3));
  assert.ok(!withTarget.includes("-shortest"), "must NOT rely on -shortest");
});

check("audio is padded indefinitely (apad) so it always reaches the target", () => {
  assert.ok(
    targetFilter.includes("apad[aout]"),
    `expected indefinite apad in: ${targetFilter}`,
  );
  const mapIdx = withTarget.lastIndexOf("-map");
  assert.equal(withTarget[mapIdx + 1], "[aout]");
});

check("the final video frame is frozen (cloned) past the timeline", () => {
  assert.ok(
    /tpad=stop_mode=clone:stop_duration=\d/.test(targetFilter),
    `expected a tpad clone hold in: ${targetFilter}`,
  );
});

check("NO subtitles are rendered inside the xfade graph", () => {
  assert.ok(
    !targetFilter.includes("subtitles="),
    `intermediate filter must be subtitle-free: ${targetFilter}`,
  );
});

// --- 2. dedicated subtitle pass -------------------------------------------

section("dedicated subtitle burn pass (libass touches the final video only)");

const burnArgs = buildSubtitleBurnArgs("/tmp/out.mp4.intermediate.mp4", "/tmp/vo.srt", "/tmp/out.mp4");

check("subtitle pass burns the SRT and copies audio verbatim", () => {
  assert.ok(burnArgs.some((a) => a.startsWith("subtitles=")), "expected subtitles= filter");
  const caIdx = burnArgs.indexOf("-c:a");
  assert.equal(burnArgs[caIdx + 1], "copy", "audio must be stream-copied");
  assert.equal(burnArgs[burnArgs.length - 1], "/tmp/out.mp4");
});

// --- 3. single-image path also honours the target -------------------------

section("single-image intermediate path");

const single = buildSingleImageArgs({
  ...baseInput,
  beats: undefined,
  images: [{ sceneId: "s1", imagePath: "/tmp/s1.png" }],
  targetDurationSeconds: 22.0,
});
const singleFilter = filterOf(single);

check("single-image path forces -t and pads the audio (apad)", () => {
  const tIdx = single.indexOf("-t");
  assert.ok(tIdx >= 0 && single[tIdx + 1] === (22.0).toFixed(3));
  assert.ok(singleFilter.includes("apad[aout]"), `expected apad in: ${singleFilter}`);
  assert.ok(single.includes("-loop"));
  assert.ok(!singleFilter.includes("subtitles="), "no subtitles in intermediate");
});

// --- 4. backward compatibility: no target -> legacy -shortest -------------

section("backward compatibility (no target)");

const noTarget = buildMultiBeatArgs(
  { ...baseInput, targetDurationSeconds: undefined },
  beats,
);
const noTargetFilter = filterOf(noTarget);

check("falls back to -shortest + apad=pad_dur when no target is provided", () => {
  assert.ok(noTarget.includes("-shortest"));
  assert.ok(
    noTargetFilter.includes(`apad=pad_dur=${TAIL_BUFFER_SECONDS.toFixed(3)}`),
    `expected legacy apad pad_dur in: ${noTargetFilter}`,
  );
  assert.ok(!noTargetFilter.includes("subtitles="));
});

// --- summary ---------------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
