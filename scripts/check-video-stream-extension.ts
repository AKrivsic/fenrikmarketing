// Video Stream Extension V2 — integration check (spawns ffmpeg when available).
// npm run check:video-stream-extension
//
// Reproduces the production failure mode: xfade timeline ~15.7s, audio target
// 29.916s — intermediate VIDEO must reach the target, not stop at the beat sum.

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import {
  buildMultiBeatArgs,
  computeXfadeTimelineSeconds,
  type RenderBeat,
  type RenderMp4Input,
} from "@/video-worker/services/ffmpeg";
import { probeMediaStreams } from "@/video-worker/services/tts";
import { SHORT_PROFILE } from "@/lib/video-engine/storyboard";

const TOLERANCE = 0.25;
const AUDIO_TARGET = 29.916;

function ffmpegBin(): string {
  return process.env.FFMPEG_PATH ?? "ffmpeg";
}

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    child.stderr.on("data", (chunk: Buffer) => {
      err += chunk.toString();
      if (err.length > 8000) err = err.slice(-8000);
    });
    child.on("error", (e) => reject(e));
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited ${code}: ${err}`));
    });
  });
}

function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve(fn()).then(
    () => console.log(`  ok  ${name}`),
    (err) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  FAIL ${name}`);
      console.error(`       ${message.replace(/\n/g, "\n       ")}`);
      throw err;
    },
  );
}

// Beat durations chosen so xfade total is ~15.7s (well under 29.916s audio).
const beats: RenderBeat[] = [
  { sceneId: "s1", motion: "zoom_in", transition: "none", durationSeconds: 5.2 },
  { sceneId: "s2", motion: "pan_right", transition: "fade", durationSeconds: 5.2 },
  { sceneId: "s3", motion: "zoom_out", transition: "fade", durationSeconds: 5.5 },
];

const timeline = computeXfadeTimelineSeconds(beats, SHORT_PROFILE.transitionSeconds);
assert.ok(
  timeline < AUDIO_TARGET - 1,
  `fixture timeline ${timeline} must be clearly shorter than audio ${AUDIO_TARGET}`,
);

const dir = join(process.cwd(), ".video-worker-tmp", "stream-extension-check");
await mkdir(dir, { recursive: true });

for (let i = 1; i <= 3; i++) {
  await run(ffmpegBin(), [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "color=c=red:s=1080x1920:d=1",
    "-frames:v",
    "1",
    join(dir, `s${i}.png`),
  ]);
}
await run(ffmpegBin(), [
  "-y",
  "-f",
  "lavfi",
  "-i",
  "anullsrc=r=44100:cl=stereo",
  "-t",
  AUDIO_TARGET.toFixed(3),
  join(dir, "vo.mp3"),
]);

const intermediatePath = join(dir, "intermediate.mp4");

const input: RenderMp4Input = {
  images: [
    { sceneId: "s1", imagePath: join(dir, "s1.png") },
    { sceneId: "s2", imagePath: join(dir, "s2.png") },
    { sceneId: "s3", imagePath: join(dir, "s3.png") },
  ],
  beats,
  audioPath: join(dir, "vo.mp3"),
  outputPath: intermediatePath,
  targetDurationSeconds: AUDIO_TARGET,
  audioDurationSeconds: AUDIO_TARGET,
  profile: {
    width: SHORT_PROFILE.width,
    height: SHORT_PROFILE.height,
    fps: SHORT_PROFILE.fps,
    transitionSeconds: SHORT_PROFILE.transitionSeconds,
  },
};

await run(ffmpegBin(), buildMultiBeatArgs(input, beats));

await check("intermediate video stream reaches the audio target", async () => {
  const streams = await probeMediaStreams(intermediatePath);
  assert.equal(typeof streams.video, "number");
  assert.equal(typeof streams.audio, "number");
  assert.ok(
    (streams.video as number) >= AUDIO_TARGET - TOLERANCE,
    `intermediate video ${streams.video} < target ${AUDIO_TARGET}`,
  );
  assert.ok(
    (streams.audio as number) >= AUDIO_TARGET - TOLERANCE,
    `intermediate audio ${streams.audio} < target ${AUDIO_TARGET}`,
  );
});

// Production-shaped case: beat-sum timeline undershoots measured audio (26.13s
// xfade vs ~29.9s audio). Extension must not leave the video at the xfade length.
const prodBeats: RenderBeat[] = [
  { sceneId: "s1", motion: "zoom_in", transition: "none", durationSeconds: 4.8 },
  { sceneId: "s2", motion: "pan_right", transition: "fade", durationSeconds: 4.8 },
  { sceneId: "s3", motion: "zoom_out", transition: "fade", durationSeconds: 4.8 },
  { sceneId: "s1", motion: "zoom_in", transition: "fade", durationSeconds: 4.8 },
  { sceneId: "s2", motion: "pan_right", transition: "fade", durationSeconds: 4.8 },
  { sceneId: "s3", motion: "zoom_out", transition: "fade", durationSeconds: 5.2 },
];
const prodIntermediate = join(dir, "intermediate-prod-shape.mp4");
const prodTimeline = computeXfadeTimelineSeconds(prodBeats, SHORT_PROFILE.transitionSeconds);
assert.ok(
  prodTimeline < AUDIO_TARGET - 2,
  `prod fixture timeline ${prodTimeline} should be well below audio`,
);
const prodInput: RenderMp4Input = {
  ...input,
  outputPath: prodIntermediate,
};
await run(ffmpegBin(), buildMultiBeatArgs(prodInput, prodBeats));

await check("production-shaped xfade undershoot is extended to audio target", async () => {
  const streams = await probeMediaStreams(prodIntermediate);
  assert.equal(typeof streams.video, "number");
  const video = streams.video as number;
  assert.ok(
    video >= AUDIO_TARGET - TOLERANCE,
    `video ${video} stuck near xfade (${prodTimeline.toFixed(3)}), expected ~${AUDIO_TARGET}`,
  );
  assert.ok(
    video > prodTimeline + 1,
    `video ${video} must exceed beat-sum timeline ${prodTimeline.toFixed(3)}`,
  );
});

console.log(
  `\nVideo stream extension check passed (xfade ${timeline.toFixed(3)}s / prod-shape ${prodTimeline.toFixed(3)}s -> target ${AUDIO_TARGET}s)`,
);
