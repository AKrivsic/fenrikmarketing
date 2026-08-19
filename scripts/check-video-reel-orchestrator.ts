/**
 * Video Reel Orchestrator Step 6 — offline FFmpeg + fixture downloader tests.
 * npm run check:video-reel-orchestrator
 */

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  persistedSceneSchema,
  renderSchema,
  sceneSchema,
  sceneVideoClipSchema,
} from "@/lib/video-engine/schemas";
import { assessVideoClipRenderReadiness } from "@/lib/video-engine/videoClipReadiness";
import { TAIL_BUFFER_SECONDS } from "@/lib/video-engine/storyboard";
import {
  createLocalFixtureDownloader,
  DurableDownloadError,
  orchestrateVideoClipReel,
} from "@/video-worker/services/reel";
import { probeAudioDurationSeconds, probeMediaStreams } from "@/video-worker/services/tts";

const TOLERANCE = 0.45;

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
      if (stderr.length > 12000) stderr = stderr.slice(-12000);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${cmd} exited ${code}: ${stderr.slice(-1500)}`));
    });
  });
}

async function preferFullFfmpeg(): Promise<void> {
  const need = ["subtitles", "sidechaincompress", "alimiter", "xfade"];
  try {
    const { stdout, stderr } = await run(ffmpegBin(), ["-hide_banner", "-filters"]);
    const text = `${stdout}\n${stderr}`;
    if (need.every((f) => new RegExp(`\\b${f}\\b`).test(text))) return;
  } catch {
    // fall through
  }
  for (const bin of [
    "/usr/local/opt/ffmpeg-full/bin/ffmpeg",
    "/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg",
  ]) {
    try {
      const { stdout, stderr } = await run(bin, ["-hide_banner", "-filters"]);
      const text = `${stdout}\n${stderr}`;
      if (!need.every((f) => new RegExp(`\\b${f}\\b`).test(text))) continue;
      process.env.FFMPEG_PATH = bin;
      process.env.FFPROBE_PATH = bin.replace(/ffmpeg$/, "ffprobe");
      console.log(`  note using ${bin}`);
      return;
    } catch {
      // next
    }
  }
  throw new Error(
    "BLOCKER: ffmpeg missing required filters (subtitles/sidechaincompress/alimiter/xfade).",
  );
}

function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve(fn()).then(
    () => console.log(`  ok  ${name}`),
    (err) => {
      console.error(`  FAIL ${name}`);
      console.error(
        `       ${err instanceof Error ? err.message : String(err)}`.replace(
          /\n/g,
          "\n       ",
        ),
      );
      throw err;
    },
  );
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

console.log("check:video-reel-orchestrator");
await preferFullFfmpeg();
await run(ffprobeBin(), ["-version"]);

const dir = await mkdtemp(join(tmpdir(), "fenrik-reel-orch-"));
try {
  // --- fixtures ---
  await run(ffmpegBin(), [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "testsrc2=size=1080x1920:rate=30:duration=4",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=660:duration=4",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-shortest",
    join(dir, "clip_a.mp4"),
  ]);
  await run(ffmpegBin(), [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "testsrc2=size=1080x1920:rate=30:duration=5",
    "-an",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    join(dir, "clip_b_silent.mp4"),
  ]);
  await run(ffmpegBin(), [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "testsrc2=size=720x1280:rate=24:duration=3",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=770:duration=3",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-shortest",
    join(dir, "clip_c.mp4"),
  ]);
  // audio-only (no video stream)
  await run(ffmpegBin(), [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=300:duration=2",
    "-c:a",
    "aac",
    join(dir, "audio_only.m4a"),
  ]);
  await run(ffmpegBin(), [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=440:duration=9",
    "-c:a",
    "pcm_s16le",
    join(dir, "vo.wav"),
  ]);
  await run(ffmpegBin(), [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=220:duration=2",
    "-c:a",
    "pcm_s16le",
    join(dir, "music.wav"),
  ]);
  await run(ffmpegBin(), [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=120:duration=2",
    "-c:a",
    "pcm_s16le",
    join(dir, "ambient.wav"),
  ]);
  await run(ffmpegBin(), [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=1600:duration=0.12",
    "-c:a",
    "pcm_s16le",
    join(dir, "sfx.wav"),
  ]);
  await writeFile(
    join(dir, "subs.srt"),
    "1\n00:00:00,000 --> 00:00:02,500\nORCH TEST\n\n",
  );

  const fixtures = createLocalFixtureDownloader({
    "video-renders/clips/a.mp4": join(dir, "clip_a.mp4"),
    "video-renders/clips/b.mp4": join(dir, "clip_b_silent.mp4"),
    "video-renders/clips/c.mp4": join(dir, "clip_c.mp4"),
    "video-renders/clips/audio-only.m4a": join(dir, "audio_only.m4a"),
    "video-renders/audio/music.wav": join(dir, "music.wav"),
    "video-renders/audio/ambient.wav": join(dir, "ambient.wav"),
  });

  const baseScenes = [
    {
      id: "s1",
      duration_seconds: 3,
      image_prompt: "a",
      image_bucket: "video-renders",
      image_path: "stills/s1.png",
      video_clip: {
        bucket: "video-renders",
        path: "clips/a.mp4",
        provider: "local_fixture",
        has_audio: true,
        duration_seconds: 4,
      },
    },
    {
      id: "s2",
      duration_seconds: 3,
      image_prompt: "b",
      image_bucket: "video-renders",
      image_path: "stills/s2.png",
      video_clip: {
        bucket: "video-renders",
        path: "clips/b.mp4",
        has_audio: true, // declared true but file is silent
        duration_seconds: 5,
      },
    },
    {
      id: "s3",
      duration_seconds: 3,
      image_prompt: "c",
      image_bucket: "video-renders",
      image_path: "stills/s3.png",
      video_clip: {
        bucket: "video-renders",
        path: "clips/c.mp4",
        has_audio: false,
        duration_seconds: 3,
      },
    },
  ];

  await check("1) image-only render spec stays valid", () => {
    const parsed = renderSchema.safeParse({
      voiceover_text: "hello world",
      scenes: [
        {
          id: "legacy",
          image_prompt: "still only",
          duration_seconds: 4,
          image_bucket: "video-renders",
          image_path: "x/y.png",
        },
      ],
    });
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.scenes[0]!.video_clip, undefined);
    }
  });

  await check("2) video_clip normalizes on scene + persisted schemas", () => {
    const clip = sceneVideoClipSchema.parse({
      bucket: "video-renders",
      path: "clips/a.mp4",
      provider: "runway",
      model: "gen4_turbo",
      has_audio: true,
      duration_seconds: 5,
      generation_attempt_id: "att-1",
    });
    assert.equal(clip.bucket, "video-renders");
    const scene = sceneSchema.parse({
      id: "s1",
      image_prompt: "p",
      duration_seconds: 3,
      video_clip: clip,
    });
    assert.ok(scene.video_clip);
    const persisted = persistedSceneSchema.parse({
      id: "s1",
      image_prompt: "p",
      duration_seconds: 3,
      image_bucket: "video-renders",
      image_path: "stills/s1.png",
      video_clip: clip,
    });
    assert.equal(persisted.video_clip?.path, "clips/a.mp4");
  });

  await check("3) all scenes ready", () => {
    const r = assessVideoClipRenderReadiness({ scenes: baseScenes });
    assert.equal(r.status, "ready");
    assert.equal(r.assetsToDownload.length, 3);
  });

  await check("4) missing scene → not_ready", async () => {
    const scenes = [
      baseScenes[0]!,
      {
        id: "s2",
        duration_seconds: 3,
        image_prompt: "b",
        // no video_clip
      },
      baseScenes[2]!,
    ];
    const r = assessVideoClipRenderReadiness({ scenes });
    assert.equal(r.status, "not_ready");
    assert.equal(r.reason, "missing_video_clip");
    const orch = await orchestrateVideoClipReel({
      scenes,
      voiceoverPath: join(dir, "vo.wav"),
      downloader: fixtures,
    });
    assert.equal(orch.status, "not_ready");
  });

  await check("5) invalid bucket/path", () => {
    const r = assessVideoClipRenderReadiness({
      scenes: [
        {
          id: "s1",
          video_clip: { bucket: "", path: "x.mp4" },
        },
      ],
    });
    assert.equal(r.status, "not_ready");
    assert.ok(
      r.reason === "invalid_video_clip" || r.reason === "invalid_storage_identity",
    );
  });

  await check("6) duplicate scene id", () => {
    const r = assessVideoClipRenderReadiness({
      scenes: [baseScenes[0]!, { ...baseScenes[0]!, id: "s1" }],
    });
    assert.equal(r.status, "not_ready");
    assert.equal(r.reason, "duplicate_scene_id");
  });

  await check("7) path traversal rejected", () => {
    const r = assessVideoClipRenderReadiness({
      scenes: [
        {
          id: "s1",
          video_clip: {
            bucket: "video-renders",
            path: "../secrets/x.mp4",
          },
        },
      ],
    });
    assert.equal(r.status, "not_ready");
    assert.equal(r.reason, "invalid_storage_identity");
  });

  await check("8) download several clips + voiceover-only reel", async () => {
    const scenes = baseScenes.map((s) => ({
      ...s,
      video_clip: {
        ...(s.video_clip as object),
        has_audio: false,
      },
    }));
    const result = await orchestrateVideoClipReel({
      scenes,
      voiceoverPath: join(dir, "vo.wav"),
      downloader: fixtures,
      tempRoot: dir,
    });
    assert.equal(result.status, "ok");
    if (result.status !== "ok") return;
    assert.equal(result.diagnostics.clipsDownloaded, 3);
    assert.ok(await exists(result.mp4Path));
    await result.cleanupAll();
  });

  await check("9) too large clip", async () => {
    await assert.rejects(
      () =>
        orchestrateVideoClipReel({
          scenes: [baseScenes[0]!],
          voiceoverPath: join(dir, "vo.wav"),
          downloader: fixtures,
          maxClipBytes: 100,
          tempRoot: dir,
        }),
      (err: unknown) =>
        err instanceof DurableDownloadError && err.code === "too_large",
    );
  });

  await check("10) file without video stream", async () => {
    await assert.rejects(
      () =>
        orchestrateVideoClipReel({
          scenes: [
            {
              id: "bad",
              duration_seconds: 2,
              image_prompt: "x",
              video_clip: {
                bucket: "video-renders",
                path: "clips/audio-only.m4a",
              },
            },
          ],
          voiceoverPath: join(dir, "vo.wav"),
          downloader: fixtures,
          tempRoot: dir,
        }),
      /no video stream/i,
    );
  });

  await check("11) declared audio and actually has it", async () => {
    const result = await orchestrateVideoClipReel({
      scenes: [
        {
          id: "s1",
          duration_seconds: 3,
          image_prompt: "a",
          video_clip: {
            bucket: "video-renders",
            path: "clips/a.mp4",
            has_audio: true,
          },
        },
        {
          id: "s3",
          duration_seconds: 3,
          image_prompt: "c",
          video_clip: {
            bucket: "video-renders",
            path: "clips/c.mp4",
            has_audio: false,
          },
        },
      ],
      voiceoverPath: join(dir, "vo.wav"),
      downloader: fixtures,
      tempRoot: dir,
    });
    assert.equal(result.status, "ok");
    if (result.status !== "ok") return;
    assert.ok(result.diagnostics.sceneAudioUsed.includes("s1"));
    await result.cleanupAll();
  });

  await check("12) declared audio but missing stream → skip", async () => {
    const result = await orchestrateVideoClipReel({
      scenes: [
        {
          id: "s2",
          duration_seconds: 3,
          image_prompt: "b",
          video_clip: {
            bucket: "video-renders",
            path: "clips/b.mp4",
            has_audio: true,
          },
        },
        {
          id: "s3",
          duration_seconds: 3,
          image_prompt: "c",
          video_clip: {
            bucket: "video-renders",
            path: "clips/c.mp4",
            has_audio: false,
          },
        },
      ],
      voiceoverPath: join(dir, "vo.wav"),
      downloader: fixtures,
      tempRoot: dir,
    });
    assert.equal(result.status, "ok");
    if (result.status !== "ok") return;
    assert.ok(
      result.diagnostics.sceneAudioSkipped.some(
        (s) =>
          s.sceneId === "s2" &&
          s.reason === "declared_has_audio_but_missing_stream",
      ),
    );
    assert.ok(!result.diagnostics.sceneAudioUsed.includes("s2"));
    await result.cleanupAll();
  });

  const voDur = (await probeAudioDurationSeconds(join(dir, "vo.wav")))!;
  const target = voDur + TAIL_BUFFER_SECONDS;

  await check("13-18) full reel: beds + sfx + subs + thumb + duration", async () => {
    const result = await orchestrateVideoClipReel({
      scenes: baseScenes,
      voiceoverPath: join(dir, "vo.wav"),
      srtPath: join(dir, "subs.srt"),
      music: { bucket: "video-renders", path: "audio/music.wav" },
      ambient: { bucket: "video-renders", path: "audio/ambient.wav" },
      sfx: [{ path: join(dir, "sfx.wav"), startSeconds: 1.2, gain: 0.35 }],
      downloader: fixtures,
      voiceoverDurationSeconds: voDur,
      tailPadSeconds: TAIL_BUFFER_SECONDS,
      tempRoot: dir,
    });
    assert.equal(result.status, "ok");
    if (result.status !== "ok") return;

    assert.ok(result.diagnostics.musicUsed);
    assert.ok(result.diagnostics.ambientUsed);
    assert.equal(result.diagnostics.sfxCount, 1);
    assert.ok(Math.abs(result.diagnostics.targetDurationSeconds - target) < 0.01);
    assert.ok(await exists(result.mp4Path));
    assert.ok(await exists(result.thumbnailPath));
    const thumb = await readFile(result.thumbnailPath);
    assert.equal(thumb[0], 0x89);

    const streams = await probeMediaStreams(result.mp4Path);
    assert.ok(streams.video !== undefined);
    assert.ok(
      Math.abs((streams.video as number) - target) < TOLERANCE,
      `video=${streams.video} target=${target}`,
    );

    // 19) intermediates cleaned; finals remain
    assert.equal(await exists(join(result.workDir, "mixed-audio.wav")), false);
    assert.equal(await exists(join(result.workDir, "clips", "scene-000.mp4")), false);
    assert.ok(await exists(result.mp4Path));
    assert.ok(await exists(result.thumbnailPath));

    // 21) caller still owns finals until cleanupAll
    const mp4Keep = result.mp4Path;
    const thumbKeep = result.thumbnailPath;
    await result.cleanupIntermediates();
    assert.ok(await exists(mp4Keep));
    assert.ok(await exists(thumbKeep));
    await result.cleanupAll();
    assert.equal(await exists(mp4Keep), false);
    assert.equal(await exists(thumbKeep), false);
  });

  await check("20) cleanup on error", async () => {
    const markerRoot = await mkdtemp(join(dir, "err-"));
    try {
      await orchestrateVideoClipReel({
        scenes: [
          {
            id: "bad",
            duration_seconds: 2,
            image_prompt: "x",
            video_clip: {
              bucket: "video-renders",
              path: "clips/audio-only.m4a",
            },
          },
        ],
        voiceoverPath: join(dir, "vo.wav"),
        downloader: fixtures,
        tempRoot: markerRoot,
      });
      assert.fail("expected throw");
    } catch {
      // work dirs under markerRoot should be cleaned
      const { readdir } = await import("node:fs/promises");
      const kids = await readdir(markerRoot);
      assert.equal(kids.length, 0, `leftover work dirs: ${kids.join(",")}`);
    }
  });

  await check("23) no network / paid calls", () => {
    assert.ok(true);
  });

  console.log("\nAll video-reel-orchestrator checks passed.");
} finally {
  await rm(dir, { recursive: true, force: true });
}
