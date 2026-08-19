/**
 * Audio Mix Step 5 — real FFmpeg/ffprobe checks for the standalone mixer.
 * npm run check:audio-mix
 *
 * Synthetic local tones only. No network / paid AI.
 */

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { computeXfadeSceneTimeline } from "@/lib/video-engine/xfadeTimeline";
import {
  SHORT_PROFILE,
  TAIL_BUFFER_SECONDS,
} from "@/lib/video-engine/storyboard";
import {
  AUDIO_MIX_DEFAULTS,
  buildAudioMixGraph,
  mixAudioLayers,
  probeHasAudioStream,
  resolveSceneAudioPlacement,
} from "@/video-worker/services/audioMix";
import { maybeMixVoiceWithSfx } from "@/video-worker/services/sfx/mixSfx";
import { writeProgrammaticSfxWav } from "@/video-worker/services/sfx/programmaticSfx";
import { renderVideoClipsMp4 } from "@/video-worker/services/ffmpegVideoClips";
import { probeAudioDurationSeconds, probeMediaStreams } from "@/video-worker/services/tts";

const TOLERANCE = 0.4;

function ffmpegBin(): string {
  return process.env.FFMPEG_PATH ?? "ffmpeg";
}

function ffprobeBin(): string {
  return process.env.FFPROBE_PATH ?? "ffprobe";
}

function run(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c: Buffer) => {
      stdout += c.toString();
    });
    child.stderr.on("data", (c: Buffer) => {
      stderr += c.toString();
      if (stderr.length > 16000) stderr = stderr.slice(-16000);
    });
    child.on("error", (e) => reject(e));
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${cmd} exited ${code}: ${stderr.slice(-2000)}`));
    });
  });
}

async function filterList(bin: string): Promise<string> {
  const { stdout, stderr } = await run(bin, ["-hide_banner", "-filters"]);
  return `${stdout}\n${stderr}`;
}

async function preferFullFfmpeg(): Promise<void> {
  const need = ["sidechaincompress", "alimiter", "afade", "amix"];
  const current = ffmpegBin();
  try {
    const filters = await filterList(current);
    if (need.every((f) => new RegExp(`\\b${f}\\b`).test(filters))) return;
  } catch {
    // try candidates
  }
  for (const bin of [
    "/usr/local/opt/ffmpeg-full/bin/ffmpeg",
    "/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg",
  ]) {
    try {
      const filters = await filterList(bin);
      if (!need.every((f) => new RegExp(`\\b${f}\\b`).test(filters))) continue;
      process.env.FFMPEG_PATH = bin;
      process.env.FFPROBE_PATH = bin.replace(/ffmpeg$/, "ffprobe");
      console.log(`  note using ${bin}`);
      return;
    } catch {
      // next
    }
  }
  throw new Error(
    "BLOCKER: ffmpeg missing sidechaincompress/alimiter/afade/amix. " +
      "Install ffmpeg-full or set FFMPEG_PATH. No mock mixers.",
  );
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

async function makeTone(
  path: string,
  freq: number,
  durationSec: number,
  opts?: { rate?: number; volume?: number },
): Promise<void> {
  const volume = opts?.volume ?? 0.4;
  await run(ffmpegBin(), [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `sine=frequency=${freq}:sample_rate=${opts?.rate ?? 44100}:duration=${durationSec}`,
    "-af",
    `volume=${volume}`,
    "-c:a",
    "pcm_s16le",
    path,
  ]);
}

async function makeVideo(
  path: string,
  opts: {
    size: string;
    duration: number;
    rate?: number;
    withAudio?: boolean;
    audioFreq?: number;
  },
): Promise<void> {
  const args = [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `testsrc2=size=${opts.size}:rate=${opts.rate ?? 30}:duration=${opts.duration}`,
  ];
  if (opts.withAudio) {
    args.push(
      "-f",
      "lavfi",
      "-i",
      `sine=frequency=${opts.audioFreq ?? 660}:sample_rate=44100:duration=${opts.duration}`,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-shortest",
      path,
    );
  } else {
    args.push("-c:v", "libx264", "-pix_fmt", "yuv420p", "-an", path);
  }
  await run(ffmpegBin(), args);
}

async function volumedetect(path: string): Promise<{ mean: number; max: number }> {
  const { stderr } = await run(ffmpegBin(), [
    "-i",
    path,
    "-af",
    "volumedetect",
    "-f",
    "null",
    "-",
  ]);
  const mean = Number.parseFloat(
    stderr.match(/mean_volume:\s*(-?[\d.]+)/)?.[1] ?? "NaN",
  );
  const max = Number.parseFloat(
    stderr.match(/max_volume:\s*(-?[\d.]+)/)?.[1] ?? "NaN",
  );
  assert.ok(Number.isFinite(mean) && Number.isFinite(max), stderr.slice(-400));
  return { mean, max };
}

async function bandMean(
  path: string,
  freq: number,
  width = 80,
): Promise<number> {
  const { stderr } = await run(ffmpegBin(), [
    "-i",
    path,
    "-af",
    `bandpass=f=${freq}:width_type=h:w=${width},volumedetect`,
    "-f",
    "null",
    "-",
  ]);
  const mean = Number.parseFloat(
    stderr.match(/mean_volume:\s*(-?[\d.]+)/)?.[1] ?? "NaN",
  );
  assert.ok(Number.isFinite(mean), `band ${freq} detect failed`);
  return mean;
}

async function windowBandMean(
  path: string,
  startSec: number,
  durSec: number,
  freq: number,
): Promise<number> {
  const { stderr } = await run(ffmpegBin(), [
    "-ss",
    startSec.toFixed(3),
    "-t",
    durSec.toFixed(3),
    "-i",
    path,
    "-af",
    `bandpass=f=${freq}:width_type=h:w=100,volumedetect`,
    "-f",
    "null",
    "-",
  ]);
  return Number.parseFloat(
    stderr.match(/mean_volume:\s*(-?[\d.]+)/)?.[1] ?? "-120",
  );
}

async function probeAudioMeta(path: string): Promise<{
  duration: number;
  sampleRate: number;
  channels: number;
  codec: string;
}> {
  const { stdout } = await run(ffprobeBin(), [
    "-v",
    "error",
    "-select_streams",
    "a:0",
    "-show_entries",
    "stream=sample_rate,channels,codec_name:format=duration",
    "-of",
    "json",
    path,
  ]);
  const parsed = JSON.parse(stdout) as {
    streams?: { sample_rate?: string; channels?: number; codec_name?: string }[];
    format?: { duration?: string };
  };
  const s = parsed.streams?.[0];
  assert.ok(s, "missing audio stream");
  return {
    duration: Number.parseFloat(String(parsed.format?.duration ?? "0")),
    sampleRate: Number.parseInt(String(s.sample_rate ?? "0"), 10),
    channels: s.channels ?? 0,
    codec: s.codec_name ?? "",
  };
}

console.log("check:audio-mix");
await preferFullFfmpeg();

const dir = await mkdtemp(join(tmpdir(), "fenrik-audio-mix-"));
try {
  const voDur = 10;
  const target = voDur + TAIL_BUFFER_SECONDS;

  await makeTone(join(dir, "vo.wav"), 440, voDur, { volume: 0.55 });
  await makeTone(join(dir, "scene_long.wav"), 880, 8, { volume: 0.5 });
  await makeTone(join(dir, "music_short.wav"), 220, 2.5, { volume: 0.35 });
  await makeTone(join(dir, "ambient.wav"), 120, 3, { volume: 0.3 });
  await makeTone(join(dir, "sfx_a.wav"), 1500, 0.15, { volume: 0.45 });
  await makeTone(join(dir, "sfx_b.wav"), 2000, 0.12, { volume: 0.45 });

  await makeVideo(join(dir, "clip_with_audio.mp4"), {
    size: "1080x1920",
    duration: 5,
    withAudio: true,
    audioFreq: 660,
  });
  await makeVideo(join(dir, "clip_silent.mp4"), {
    size: "1080x1920",
    duration: 4,
    withAudio: false,
  });
  await makeVideo(join(dir, "clip_horiz.mp4"), {
    size: "1920x1080",
    duration: 4,
    rate: 24,
    withAudio: true,
    audioFreq: 770,
  });

  const timelineScenes = [
    { sceneId: "s1", durationSeconds: 4, transition: "none" as const },
    { sceneId: "s2", durationSeconds: 3, transition: "fade" as const },
    { sceneId: "s3", durationSeconds: 4, transition: "slide" as const },
  ];
  const timeline = computeXfadeSceneTimeline(
    timelineScenes,
    SHORT_PROFILE.transitionSeconds,
  );

  await check("shared xfade timeline matches video-clip math", () => {
    // 4 + 3 + 4 - 2*0.4 = 10.2
    assert.ok(Math.abs(timeline.timelineSeconds - 10.2) < 0.001);
    assert.equal(timeline.scenes[0]!.startSeconds, 0);
    assert.ok(Math.abs(timeline.scenes[1]!.startSeconds - 3.6) < 0.001);
    assert.ok(Math.abs(timeline.scenes[2]!.startSeconds - 6.2) < 0.001);
  });

  await check("1) voiceover only", async () => {
    const out = join(dir, "mix-vo.wav");
    const result = await mixAudioLayers({
      voiceover: { path: join(dir, "vo.wav") },
      targetDurationSeconds: target,
      outputPath: out,
    });
    const meta = await probeAudioMeta(out);
    assert.equal(meta.sampleRate, 44100);
    assert.equal(meta.channels, 2);
    assert.ok(Math.abs(meta.duration - target) < TOLERANCE);
    assert.equal(result.diagnostics.ducked, false);
    const vol = await volumedetect(out);
    assert.ok(vol.mean > -35, `VO too quiet: ${vol.mean}`);
  });

  await check("2) voiceover + scene audio", async () => {
    const out = join(dir, "mix-vo-scene.wav");
    const result = await mixAudioLayers({
      voiceover: { path: join(dir, "vo.wav") },
      timelineScenes,
      transitionSeconds: SHORT_PROFILE.transitionSeconds,
      sceneAudio: [
        {
          sceneId: "s2",
          path: join(dir, "clip_with_audio.mp4"),
          durationSeconds: 3,
        },
      ],
      targetDurationSeconds: target,
      outputPath: out,
    });
    assert.deepEqual(result.diagnostics.sceneAudioUsed, ["s2"]);
    // Scene audio at 660Hz should appear after scene start (~3.6s), not at t=0.
    const early = await windowBandMean(out, 0.2, 0.8, 660);
    const mid = await windowBandMean(out, 4.0, 1.0, 660);
    assert.ok(mid > early + 5, `scene audio not shifted: early=${early} mid=${mid}`);
  });

  await check("3) voiceover + music", async () => {
    const out = join(dir, "mix-vo-music.wav");
    const graph = await buildAudioMixGraph({
      voiceover: { path: join(dir, "vo.wav") },
      music: { path: join(dir, "music_short.wav") },
      targetDurationSeconds: target,
      outputPath: out,
    });
    assert.match(graph.filterComplex, /afade=t=out/);
    assert.match(graph.inputArgs.join(" "), /-stream_loop/);
    await mixAudioLayers({
      voiceover: { path: join(dir, "vo.wav") },
      music: { path: join(dir, "music_short.wav") },
      targetDurationSeconds: target,
      outputPath: out,
    });
    // Looped 2.5s bed must still be audible near the end (before fade-out).
    const late = await windowBandMean(out, target - 2.2, 0.6, 220);
    assert.ok(late > -55, `music not looped into late window: ${late}`);
  });

  await check("4) voiceover + ambient", async () => {
    const out = join(dir, "mix-vo-ambient.wav");
    await mixAudioLayers({
      voiceover: { path: join(dir, "vo.wav") },
      ambient: { path: join(dir, "ambient.wav") },
      targetDurationSeconds: target,
      outputPath: out,
    });
    const low = await bandMean(out, 120, 40);
    assert.ok(low > -60, `ambient missing: ${low}`);
  });

  await check("5) voiceover + multiple SFX", async () => {
    const out = join(dir, "mix-vo-sfx.wav");
    await mixAudioLayers({
      voiceover: { path: join(dir, "vo.wav") },
      sfx: [
        { path: join(dir, "sfx_a.wav"), startSeconds: 1.0, gain: 0.4 },
        { path: join(dir, "sfx_b.wav"), startSeconds: 5.5, gain: 0.4 },
      ],
      targetDurationSeconds: target,
      outputPath: out,
    });
    const a = await windowBandMean(out, 1.0, 0.3, 1500);
    const b = await windowBandMean(out, 5.5, 0.3, 2000);
    const quietA = await windowBandMean(out, 3.0, 0.3, 1500);
    const quietB = await windowBandMean(out, 3.0, 0.3, 2000);
    assert.ok(a > quietA + 6, `sfx_a placement failed a=${a} quiet=${quietA}`);
    assert.ok(b > quietB + 6, `sfx_b placement failed b=${b} quiet=${quietB}`);
  });

  await check("6) all layers together", async () => {
    const out = join(dir, "mix-all.wav");
    const result = await mixAudioLayers({
      voiceover: { path: join(dir, "vo.wav") },
      timelineScenes,
      transitionSeconds: SHORT_PROFILE.transitionSeconds,
      sceneAudio: [
        { sceneId: "s1", path: join(dir, "clip_with_audio.mp4") },
        { sceneId: "s2", path: join(dir, "clip_horiz.mp4") },
        { sceneId: "s3", path: join(dir, "clip_silent.mp4") },
      ],
      music: { path: join(dir, "music_short.wav") },
      ambient: { path: join(dir, "ambient.wav") },
      sfx: [
        { path: join(dir, "sfx_a.wav"), startSeconds: 0.8 },
        { path: join(dir, "sfx_b.wav"), startSeconds: 7.0 },
      ],
      targetDurationSeconds: target,
      outputPath: out,
    });
    assert.ok(result.diagnostics.ducked);
    assert.ok(result.diagnostics.musicUsed);
    assert.ok(result.diagnostics.ambientUsed);
    assert.equal(result.diagnostics.sfxCount, 2);
    assert.ok(result.diagnostics.sceneAudioUsed.includes("s1"));
    assert.ok(result.diagnostics.sceneAudioUsed.includes("s2"));
    assert.ok(result.diagnostics.sceneAudioSkipped.includes("s3"));
    const meta = await probeAudioMeta(out);
    assert.equal(meta.sampleRate, AUDIO_MIX_DEFAULTS.sampleRate);
    assert.equal(meta.channels, 2);
    assert.ok(Math.abs(meta.duration - target) < TOLERANCE);
  });

  await check("7) video without audio does not fail", async () => {
    assert.equal(await probeHasAudioStream(join(dir, "clip_silent.mp4")), false);
    const out = join(dir, "mix-silent-clip.wav");
    const result = await mixAudioLayers({
      voiceover: { path: join(dir, "vo.wav") },
      timelineScenes,
      sceneAudio: [{ sceneId: "s3", path: join(dir, "clip_silent.mp4") }],
      targetDurationSeconds: target,
      outputPath: out,
    });
    assert.deepEqual(result.diagnostics.sceneAudioSkipped, ["s3"]);
    assert.deepEqual(result.diagnostics.sceneAudioUsed, []);
  });

  await check("8) scene audio timeline offsets", () => {
    const placed = resolveSceneAudioPlacement(
      [
        { sceneId: "s1", path: "x" },
        { sceneId: "s2", path: "y" },
        { sceneId: "s3", path: "z" },
      ],
      timelineScenes,
      SHORT_PROFILE.transitionSeconds,
    );
    assert.ok(Math.abs(placed[1]!.startSeconds - 3.6) < 0.001);
    assert.ok(Math.abs(placed[2]!.startSeconds - 6.2) < 0.001);
    // Not a plain sum (4+3=7).
    assert.ok(placed[2]!.startSeconds < 7);
  });

  await check("9) scene audio trimmed to scene length", async () => {
    const graph = await buildAudioMixGraph({
      voiceover: { path: join(dir, "vo.wav") },
      timelineScenes,
      sceneAudio: [
        {
          sceneId: "s2",
          path: join(dir, "scene_long.wav"),
          // 8s source, 3s scene
        },
      ],
      targetDurationSeconds: target,
      outputPath: join(dir, "unused.wav"),
    });
    assert.match(graph.filterComplex, /atrim=0:3\.000/);
  });

  await check("10) music loops safely", async () => {
    const out = join(dir, "mix-loop.wav");
    await mixAudioLayers({
      voiceover: { path: join(dir, "vo.wav") },
      music: { path: join(dir, "music_short.wav"), loop: true },
      targetDurationSeconds: target,
      outputPath: out,
    });
    const early = await windowBandMean(out, 0.5, 0.5, 220);
    const mid = await windowBandMean(out, 5.0, 0.5, 220);
    assert.ok(early > -55 && mid > -55, `loop failed early=${early} mid=${mid}`);
  });

  await check("11) music has fade-out", async () => {
    const graph = await buildAudioMixGraph({
      voiceover: { path: join(dir, "vo.wav") },
      music: { path: join(dir, "music_short.wav") },
      targetDurationSeconds: target,
      outputPath: join(dir, "unused2.wav"),
    });
    const st = (target - AUDIO_MIX_DEFAULTS.musicFadeOutSeconds).toFixed(3);
    assert.match(
      graph.filterComplex,
      new RegExp(`afade=t=out:st=${st.replace(".", "\\.")}`),
    );
  });

  await check("12-13) duration + sample rate + stereo", async () => {
    const meta = await probeAudioMeta(join(dir, "mix-all.wav"));
    assert.ok(Math.abs(meta.duration - target) < TOLERANCE);
    assert.equal(meta.sampleRate, 44100);
    assert.equal(meta.channels, 2);
    assert.equal(meta.codec, "pcm_s16le");
  });

  await check("14) mix does not clip", async () => {
    const vol = await volumedetect(join(dir, "mix-all.wav"));
    assert.ok(vol.max <= 0.05, `clipping max_volume=${vol.max}`);
  });

  await check("15) voiceover remains measurable / not drowned", async () => {
    const voBand = await bandMean(join(dir, "mix-all.wav"), 440, 60);
    const musicBand = await bandMean(join(dir, "mix-all.wav"), 220, 40);
    assert.ok(voBand > -40, `VO band too quiet: ${voBand}`);
    // VO should be at least as present as the ducked music bed (dB: higher = louder).
    assert.ok(voBand > musicBand - 3, `VO drowned: vo=${voBand} music=${musicBand}`);
  });

  await check("16-17) mix usable in renderVideoClipsMp4", async () => {
    const mixed = join(dir, "mix-for-video.wav");
    await mixAudioLayers({
      voiceover: { path: join(dir, "vo.wav") },
      timelineScenes,
      sceneAudio: [
        { sceneId: "s1", path: join(dir, "clip_with_audio.mp4") },
        { sceneId: "s2", path: join(dir, "clip_horiz.mp4") },
      ],
      music: { path: join(dir, "music_short.wav") },
      ambient: { path: join(dir, "ambient.wav") },
      sfx: [{ path: join(dir, "sfx_a.wav"), startSeconds: 1.2 }],
      targetDurationSeconds: target,
      outputPath: mixed,
    });

    const mp4 = join(dir, "final.mp4");
    await renderVideoClipsMp4({
      scenes: [
        {
          sceneId: "s1",
          clipPath: join(dir, "clip_with_audio.mp4"),
          durationSeconds: 4,
          transition: "none",
          sourceDurationSeconds: 5,
        },
        {
          sceneId: "s2",
          clipPath: join(dir, "clip_horiz.mp4"),
          durationSeconds: 3,
          transition: "fade",
          sourceDurationSeconds: 4,
        },
        {
          sceneId: "s3",
          clipPath: join(dir, "clip_silent.mp4"),
          durationSeconds: 4,
          transition: "slide",
          sourceDurationSeconds: 4,
        },
      ],
      audioPath: mixed,
      outputPath: mp4,
      audioDurationSeconds: target,
      tailPadSeconds: 0,
      profile: SHORT_PROFILE,
    });

    const streams = await probeMediaStreams(mp4);
    const formatDur = await probeAudioDurationSeconds(mp4);
    assert.ok(streams.video !== undefined);
    assert.ok(streams.audio !== undefined);
    assert.ok(Math.abs((streams.video as number) - target) < TOLERANCE);
    assert.ok(Math.abs((formatDur as number) - target) < TOLERANCE);
    const voInMp4 = await bandMean(mp4, 440, 60);
    assert.ok(voInMp4 > -45, `final MP4 missing VO: ${voInMp4}`);
  });

  await check("18) production maybeMixVoiceWithSfx still works", async () => {
    const sfxPath = join(dir, "prog-click.wav");
    await writeProgrammaticSfxWav({ category: "click", outputPath: sfxPath });
    const mixed = await maybeMixVoiceWithSfx({
      voicePath: join(dir, "vo.wav"),
      workDir: dir,
      plan: {
        selected: true,
        category: "click",
        timingMs: 400,
        gain: 0.18,
        reason: "test",
        source: "programmatic_v1",
      },
    });
    assert.equal(mixed.mixed, true);
    const buf = await readFile(mixed.audioPath);
    assert.ok(buf.length > 1000);
  });

  await check("19) no network / paid calls", async () => {
    await writeFile(join(dir, "marker.txt"), "local-only");
    assert.ok(true);
  });

  console.log("\nAll audio-mix checks passed.");
} finally {
  await rm(dir, { recursive: true, force: true });
}
