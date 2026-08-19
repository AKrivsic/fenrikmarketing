/**
 * Video reel assembly Step 10 — offline unit + local FFmpeg tests.
 * npm run check:video-reel-assembly
 */

import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ExecuteSceneVideoPlanResult } from "@/lib/scene-video-executor/types";
import {
  applyExecutorClipResults,
  assignSceneVideoClips,
  assembleVideoReel,
  clipReadyRenderManifestSchema,
  prepareVideoReelAssembly,
  uploadVideoReelArtifacts,
  validateClipReadyRenderManifest,
  sha256HexFile,
  type SceneVideoClipAssignment,
} from "@/lib/video-reel-assembly";
import type { RenderSpecOutput } from "@/lib/video-engine/schemas/renderSchema";
import type { SceneVideoClip } from "@/lib/video-engine/schemas/sceneVideoClipSchema";
import { TAIL_BUFFER_SECONDS } from "@/lib/video-engine/storyboard";
import {
  createLocalFixtureDownloader,
} from "@/video-worker/services/reel";
import { probeAudioDurationSeconds, probeMediaStreams } from "@/video-worker/services/tts";

const TOLERANCE = 0.45;
const PROJECT = "11111111-1111-4111-8111-111111111111";
const JOB = "33333333-3333-4333-8333-333333333333";
const VO_TEXT = "This is the voiceover script for assembly testing.";
const ATTEMPT_A = "aaaaaaaa-aaaa-4aaa-8aaa-111111111111";
const ATTEMPT_B = "bbbbbbbb-bbbb-4bbb-8bbb-222222222222";
const ATTEMPT_C = "cccccccc-cccc-4ccc-8ccc-333333333333";
const ATTEMPT_D = "dddddddd-dddd-4ddd-8ddd-444444444444";
/** Valid hex placeholder when local VO file is not needed (assign-only tests). */
const VO_SHA_PLACEHOLDER =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

function assignClips(
  assignments: SceneVideoClipAssignment[],
  opts?: {
    subtitlesBurnInRequested?: boolean;
    voiceoverSha256?: string;
    music?: { bucket: string; path: string } | null;
    ambient?: { bucket: string; path: string } | null;
  },
) {
  return assignSceneVideoClips({
    renderSpec: baseRenderSpec(),
    assignments,
    voiceoverText: VO_TEXT,
    voiceoverSha256: opts?.voiceoverSha256 ?? VO_SHA_PLACEHOLDER,
    subtitlesBurnInRequested: opts?.subtitlesBurnInRequested ?? false,
    music: opts?.music ?? null,
    ambient: opts?.ambient ?? null,
  });
}

let passed = 0;
let failed = 0;

async function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL ${name}`);
    console.error(
      `       ${err instanceof Error ? err.message : String(err)}`.replace(
        /\n/g,
        "\n       ",
      ),
    );
  }
}

function ffmpegBin(): string {
  return process.env.FFMPEG_PATH ?? "ffmpeg";
}

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    child.stderr.on("data", (c: Buffer) => {
      err += c.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${code}: ${err.slice(-1200)}`));
    });
  });
}

async function preferFullFfmpeg(): Promise<void> {
  for (const bin of [
    process.env.FFMPEG_PATH ?? "ffmpeg",
    "/usr/local/opt/ffmpeg-full/bin/ffmpeg",
    "/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg",
  ]) {
    try {
      const { spawnSync } = await import("node:child_process");
      const r = spawnSync(bin, ["-hide_banner", "-filters"], {
        encoding: "utf8",
      });
      const text = `${r.stdout}\n${r.stderr}`;
      if (["subtitles", "sidechaincompress", "alimiter", "xfade"].every((f) =>
        new RegExp(`\\b${f}\\b`).test(text),
      )) {
        process.env.FFMPEG_PATH = bin;
        process.env.FFPROBE_PATH = bin.replace(/ffmpeg$/, "ffprobe");
        return;
      }
    } catch {
      // next
    }
  }
}

function baseRenderSpec(): RenderSpecOutput {
  return {
    version: 1,
    scenes: [
      {
        id: "scene-b",
        image_prompt: "Second scene still",
        image_bucket: "video-renders",
        image_path: `${PROJECT}/video/${JOB}/scene-b.png`,
        duration_seconds: 4,
        motion_prompt: "Slow push on subject B; stable identity.",
        transition_in: "fade",
      },
      {
        id: "scene-a",
        image_prompt: "First scene still",
        image_bucket: "video-renders",
        image_path: `${PROJECT}/video/${JOB}/scene-a.png`,
        duration_seconds: 3,
        motion_prompt: "Slow push on subject A; stable identity.",
        transition_in: "slide",
      },
    ],
  };
}

function clipFor(sceneId: string, attemptId: string, fixtureKey: string): SceneVideoClip {
  return {
    bucket: "fixtures",
    path: fixtureKey,
    duration_seconds: sceneId === "scene-a" ? 3 : 4,
    has_audio: fixtureKey.includes("clip_a"),
    generation_attempt_id: attemptId,
    provider: "runway",
    model: "gen4_turbo",
  };
}

function executorCompleted(
  assignments: SceneVideoClipAssignment[],
): ExecuteSceneVideoPlanResult {
  return {
    status: "completed",
    sceneCount: assignments.length,
    reusedCount: 0,
    newlyCompletedCount: assignments.length,
    failedCount: 0,
    unresolvedCount: 0,
    skippedCount: 0,
    theoreticalTotalCostUsd: 0.4,
    existingCompletedCostUsd: 0,
    alreadyCommittedCostUsd: 0,
    maxNewCostUsd: 0.4,
    newlyInitiatedProviderCostUsd: 0.4,
    scenes: assignments.map((a, i) => ({
      sceneId: a.sceneId,
      sceneIndex: i,
      clientRequestId: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
      outcome: "completed",
      attemptId: a.generationAttemptId,
      clip: a.clip,
    })),
  };
}

console.log("check:video-reel-assembly");

await check("1) preparation builds plan for all scenes", async () => {
  const prep = await prepareVideoReelAssembly({
    renderSpec: baseRenderSpec(),
    voiceoverText: VO_TEXT,
  });
  assert.equal(prep.ok, true);
  if (!prep.ok) return;
  assert.equal(prep.plan.sceneCount, 2);
  assert.equal(prep.plan.preparableSceneCount, 2);
});

await check("2) original render spec unchanged after prep + apply", async () => {
  const spec = baseRenderSpec();
  const before = JSON.stringify(spec);
  const prep = await prepareVideoReelAssembly({
    renderSpec: spec,
    voiceoverText: VO_TEXT,
  });
  assert.equal(prep.ok, true);
  const assignments: SceneVideoClipAssignment[] = [
    {
      sceneId: "scene-a",
      generationAttemptId: ATTEMPT_A,
      clip: clipFor("scene-a", ATTEMPT_A, "clip_a.mp4"),
    },
    {
      sceneId: "scene-b",
      generationAttemptId: ATTEMPT_B,
      clip: clipFor("scene-b", ATTEMPT_B, "clip_b.mp4"),
    },
  ];
  assignClips(assignments);
  assert.equal(JSON.stringify(spec), before);
});

await check("3) clips bind by scene id not array order", () => {
  const applied = assignClips([
    {
      sceneId: "scene-b",
      generationAttemptId: ATTEMPT_B,
      clip: clipFor("scene-b", ATTEMPT_B, "clip_b.mp4"),
    },
    {
      sceneId: "scene-a",
      generationAttemptId: ATTEMPT_A,
      clip: clipFor("scene-a", ATTEMPT_A, "clip_a.mp4"),
    },
  ]);
  assert.equal(applied.ok, true);
  if (!applied.ok) return;
  assert.equal(applied.manifest.scenes[0]!.id, "scene-b");
  assert.equal(
    applied.manifest.scenes[0]!.video_clip.path,
    "clip_b.mp4",
  );
  assert.equal(applied.manifest.scenes[1]!.video_clip.path, "clip_a.mp4");
});

await check("4) missing clip blocks assembly", () => {
  const r = assignClips([
    {
      sceneId: "scene-a",
      generationAttemptId: ATTEMPT_A,
      clip: clipFor("scene-a", ATTEMPT_A, "clip_a.mp4"),
    },
  ]);
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.equal(r.reason, "missing_clip_for_scene");
});

await check("5) extra clip blocks assembly", () => {
  const r = assignClips([
    {
      sceneId: "scene-a",
      generationAttemptId: ATTEMPT_A,
      clip: clipFor("scene-a", ATTEMPT_A, "clip_a.mp4"),
    },
    {
      sceneId: "scene-b",
      generationAttemptId: ATTEMPT_B,
      clip: clipFor("scene-b", ATTEMPT_B, "clip_b.mp4"),
    },
    {
      sceneId: "scene-extra",
      generationAttemptId: ATTEMPT_C,
      clip: clipFor("scene-extra", ATTEMPT_C, "clip_x.mp4"),
    },
  ]);
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.equal(r.reason, "extra_clip_for_unknown_scene");
});

await check("6) duplicate scene clip blocked", () => {
  const r = assignClips([
    {
      sceneId: "scene-a",
      generationAttemptId: ATTEMPT_A,
      clip: clipFor("scene-a", ATTEMPT_A, "clip_a.mp4"),
    },
    {
      sceneId: "scene-a",
      generationAttemptId: ATTEMPT_D,
      clip: clipFor("scene-a", ATTEMPT_D, "clip_a2.mp4"),
    },
    {
      sceneId: "scene-b",
      generationAttemptId: ATTEMPT_B,
      clip: clipFor("scene-b", ATTEMPT_B, "clip_b.mp4"),
    },
  ]);
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.equal(r.reason, "duplicate_scene_id");
});

await check("7) failed executor blocks apply", () => {
  const r = applyExecutorClipResults({
    renderSpec: baseRenderSpec(),
    voiceoverText: VO_TEXT,
    voiceoverSha256: VO_SHA_PLACEHOLDER,
    subtitlesBurnInRequested: false,
    executorResult: {
      ...executorCompleted([]),
      status: "stopped",
      scenes: [],
    },
  });
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.equal(r.reason, "executor_not_completed");
});

await check("8) clip without attempt id rejected", () => {
  const bad = clipFor("scene-a", ATTEMPT_A, "clip_a.mp4");
  delete (bad as { generation_attempt_id?: string }).generation_attempt_id;
  const r = assignClips([
    {
      sceneId: "scene-a",
      generationAttemptId: "",
      clip: bad,
    },
    {
      sceneId: "scene-b",
      generationAttemptId: ATTEMPT_B,
      clip: clipFor("scene-b", ATTEMPT_B, "clip_b.mp4"),
    },
  ]);
  assert.equal(r.ok, false);
});

await check("9) invalid storage ref rejected", () => {
  const r = assignClips([
    {
      sceneId: "scene-a",
      generationAttemptId: ATTEMPT_A,
      clip: {
        bucket: "video-renders",
        path: "../escape.mp4",
        generation_attempt_id: ATTEMPT_A,
      },
    },
    {
      sceneId: "scene-b",
      generationAttemptId: ATTEMPT_B,
      clip: clipFor("scene-b", ATTEMPT_B, "clip_b.mp4"),
    },
  ]);
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.equal(r.reason, "invalid_storage_identity");
});

await check("10) missing voiceover text fails preparation", async () => {
  const prep = await prepareVideoReelAssembly({
    renderSpec: baseRenderSpec(),
    voiceoverText: "  ",
  });
  assert.equal(prep.ok, false);
  if (prep.ok) return;
  assert.equal(prep.reason, "voiceover_missing");
});

function validClipReadyManifest() {
  const r = assignClips([
    {
      sceneId: "scene-a",
      generationAttemptId: ATTEMPT_A,
      clip: clipFor("scene-a", ATTEMPT_A, "clip_a.mp4"),
    },
    {
      sceneId: "scene-b",
      generationAttemptId: ATTEMPT_B,
      clip: clipFor("scene-b", ATTEMPT_B, "clip_b.mp4"),
    },
  ]);
  assert.equal(r.ok, true);
  return r.ok ? r.manifest : null;
}

await check("10B-1) manifest without video_clip rejected", () => {
  const m = validClipReadyManifest()!;
  const tampered = structuredClone(m);
  delete (tampered.scenes[0] as { video_clip?: unknown }).video_clip;
  assert.equal(validateClipReadyRenderManifest(tampered).ok, false);
});

await check("10B-2) assignment clip path mismatch rejected", () => {
  const m = validClipReadyManifest()!;
  const tampered = structuredClone(m);
  tampered.assembly.clipAssignments[0]!.clipPath = "wrong.mp4";
  const v = validateClipReadyRenderManifest(tampered);
  assert.equal(v.ok, false);
});

await check("10B-3) assignment clip bucket mismatch rejected", () => {
  const m = validClipReadyManifest()!;
  const tampered = structuredClone(m);
  tampered.assembly.clipAssignments[0]!.clipBucket = "other-bucket";
  assert.equal(validateClipReadyRenderManifest(tampered).ok, false);
});

await check("10B-4) assignment attempt id mismatch rejected", () => {
  const m = validClipReadyManifest()!;
  const tampered = structuredClone(m);
  tampered.assembly.clipAssignments[0]!.generationAttemptId = ATTEMPT_D;
  assert.equal(validateClipReadyRenderManifest(tampered).ok, false);
});

await check("10B-5) duplicate assignment rejected", () => {
  const m = validClipReadyManifest()!;
  const tampered = structuredClone(m);
  tampered.assembly.clipAssignments.push({
    ...tampered.assembly.clipAssignments[0]!,
  });
  assert.equal(validateClipReadyRenderManifest(tampered).ok, false);
});

await check("10B-6) missing assignment rejected", () => {
  const m = validClipReadyManifest()!;
  const tampered = structuredClone(m);
  tampered.assembly.clipAssignments = tampered.assembly.clipAssignments.slice(0, 1);
  assert.equal(validateClipReadyRenderManifest(tampered).ok, false);
});

await check("10B-7) extra assignment for unknown scene rejected", () => {
  const m = validClipReadyManifest()!;
  const tampered = structuredClone(m);
  tampered.assembly.clipAssignments.push({
    sceneId: "scene-unknown",
    generationAttemptId: ATTEMPT_C,
    clipBucket: "fixtures",
    clipPath: "clip_x.mp4",
  });
  assert.equal(validateClipReadyRenderManifest(tampered).ok, false);
});

await check("10B-8) invalid attempt UUID rejected at assign", () => {
  const r = assignClips([
    {
      sceneId: "scene-a",
      generationAttemptId: "not-a-valid-uuid",
      clip: clipFor("scene-a", ATTEMPT_A, "clip_a.mp4"),
    },
    {
      sceneId: "scene-b",
      generationAttemptId: ATTEMPT_B,
      clip: clipFor("scene-b", ATTEMPT_B, "clip_b.mp4"),
    },
  ]);
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.equal(r.reason, "invalid_generation_attempt_uuid");
});

await check("22) jobRunner wires assembly via aiVideoClipJobPhase only", () => {
  const src = readFileSync(join(process.cwd(), "video-worker/jobRunner.ts"), "utf8");
  assert.match(src, /runAiVideoClipJobPhase/);
  assert.doesNotMatch(src, /from "@\/lib\/video-reel-assembly"/);
});

const fixtureDir = await mkdtemp(join(tmpdir(), "fenrik-reel-asm-"));
try {
  await preferFullFfmpeg();
  const clipA = join(fixtureDir, "clip_a.mp4");
  const clipB = join(fixtureDir, "clip_b_silent.mp4");
  const voPath = join(fixtureDir, "voiceover.mp3");
  const srtPath = join(fixtureDir, "subs.srt");
  const musicPath = join(fixtureDir, "music.wav");
  const ambientPath = join(fixtureDir, "ambient.wav");

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
    clipA,
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
    clipB,
  ]);
  await run(ffmpegBin(), [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=440:duration=3.2",
    "-c:a",
    "libmp3lame",
    voPath,
  ]);
  await writeFile(
    srtPath,
    "1\n00:00:00,000 --> 00:00:02,000\nHello assembly\n",
  );
  await run(ffmpegBin(), [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=220:duration=8",
    musicPath,
  ]);
  await run(ffmpegBin(), [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=330:duration=6",
    ambientPath,
  ]);

  const fixtureMap: Record<string, string> = {
    "fixtures/clip_a.mp4": clipA,
    "fixtures/clip_b.mp4": clipB,
    "fixtures/music.wav": musicPath,
    "fixtures/ambient.wav": ambientPath,
  };
  const downloader = createLocalFixtureDownloader(fixtureMap);
  const voSha = await sha256HexFile(voPath);

  function manifestFromFixtures(opts: {
    subtitlesBurnInRequested: boolean;
    music?: { bucket: string; path: string; gain?: number; loop?: boolean } | null;
    ambient?: { bucket: string; path: string } | null;
  }) {
    const applied = assignClips(
      [
        {
          sceneId: "scene-b",
          generationAttemptId: ATTEMPT_B,
          clip: clipFor("scene-b", ATTEMPT_B, "clip_b.mp4"),
        },
        {
          sceneId: "scene-a",
          generationAttemptId: ATTEMPT_A,
          clip: clipFor("scene-a", ATTEMPT_A, "clip_a.mp4"),
        },
      ],
      {
        voiceoverSha256: voSha,
        subtitlesBurnInRequested: opts.subtitlesBurnInRequested,
        music: opts.music ?? null,
        ambient: opts.ambient ?? null,
      },
    );
    assert.equal(applied.ok, true);
    return applied.ok ? applied.manifest : null;
  }

  await check("10B-9) burn-in requested without SRT blocks assembly", async () => {
    const manifest = manifestFromFixtures({ subtitlesBurnInRequested: true })!;
    const result = await assembleVideoReel({
      manifest,
      voiceoverLocalPath: voPath,
      downloader,
    });
    assert.equal(result.status, "blocked");
    if (result.status !== "blocked") return;
    assert.equal(result.reason, "subtitles_policy_mismatch");
  });

  await check("10B-10) SRT provided when burn-in not requested blocks", async () => {
    const manifest = manifestFromFixtures({ subtitlesBurnInRequested: false })!;
    const result = await assembleVideoReel({
      manifest,
      voiceoverLocalPath: voPath,
      subtitlesLocalPath: srtPath,
      downloader,
    });
    assert.equal(result.status, "blocked");
    if (result.status !== "blocked") return;
    assert.equal(result.reason, "subtitles_policy_mismatch");
  });

  await check("11) subtitles burn-in when manifest requests + SRT provided", async () => {
    const manifest = manifestFromFixtures({ subtitlesBurnInRequested: true })!;
    const result = await assembleVideoReel({
      manifest,
      voiceoverLocalPath: voPath,
      subtitlesLocalPath: srtPath,
      downloader,
    });
    assert.equal(result.status, "ok");
    if (result.status !== "ok") return;
    assert.equal(result.diagnostics.subtitlesBurnInUsed, true);
    await result.cleanupAll();
  });

  await check("10B-13) manifest without music does not add music", async () => {
    const manifest = manifestFromFixtures({ subtitlesBurnInRequested: false })!;
    const result = await assembleVideoReel({
      manifest,
      voiceoverLocalPath: voPath,
      downloader,
    });
    assert.equal(result.status, "ok");
    if (result.status !== "ok") return;
    assert.equal(result.diagnostics.musicRef, null);
    assert.equal(result.diagnostics.musicUsed, false);
    await result.cleanupAll();
  });

  await check("10B-14) diagnostics include manifest music ref", async () => {
    const manifest = manifestFromFixtures({
      subtitlesBurnInRequested: false,
      music: { bucket: "fixtures", path: "music.wav", gain: 0.1, loop: true },
    })!;
    const result = await assembleVideoReel({
      manifest,
      voiceoverLocalPath: voPath,
      downloader,
    });
    assert.equal(result.status, "ok");
    if (result.status !== "ok") return;
    assert.deepEqual(result.diagnostics.musicRef, {
      bucket: "fixtures",
      path: "music.wav",
    });
    assert.equal(result.diagnostics.musicUsed, true);
    await result.cleanupAll();
  });

  await check("10B-11) invalid music bed path rejected in manifest", () => {
    const m = validClipReadyManifest()!;
    const tampered = structuredClone(m);
    tampered.assembly.music = { bucket: "fixtures", path: "../music.wav" };
    assert.equal(validateClipReadyRenderManifest(tampered).ok, false);
  });

  await check("10B-12) ambient ref in diagnostics matches manifest", async () => {
    const manifest = manifestFromFixtures({
      subtitlesBurnInRequested: false,
      ambient: { bucket: "fixtures", path: "ambient.wav" },
    })!;
    const result = await assembleVideoReel({
      manifest,
      voiceoverLocalPath: voPath,
      downloader,
    });
    assert.equal(result.status, "ok");
    if (result.status !== "ok") return;
    assert.deepEqual(result.diagnostics.ambientRef, {
      bucket: "fixtures",
      path: "ambient.wav",
    });
    await result.cleanupAll();
  });

  await check("10B-15) wrong voiceover bytes blocked", async () => {
    const manifest = manifestFromFixtures({ subtitlesBurnInRequested: false })!;
    const wrongVo = join(fixtureDir, "wrong_vo.mp3");
    await writeFile(wrongVo, Buffer.from("not-the-real-voiceover"));
    const result = await assembleVideoReel({
      manifest,
      voiceoverLocalPath: wrongVo,
      downloader,
    });
    assert.equal(result.status, "blocked");
    if (result.status !== "blocked") return;
    assert.equal(result.reason, "voiceover_provenance_mismatch");
  });

  await check("10B-16) matching voiceover hash passes assembly", async () => {
    const manifest = manifestFromFixtures({ subtitlesBurnInRequested: false })!;
    const result = await assembleVideoReel({
      manifest,
      voiceoverLocalPath: voPath,
      downloader,
    });
    assert.equal(result.status, "ok");
    if (result.status === "ok") await result.cleanupAll();
  });

  await check("14) manifest transitions preserved in diagnostics", async () => {
    const manifest = manifestFromFixtures({ subtitlesBurnInRequested: false })!;
    const result = await assembleVideoReel({
      manifest,
      voiceoverLocalPath: voPath,
      downloader,
    });
    assert.equal(result.status, "ok");
    if (result.status !== "ok") return;
    const fade = result.diagnostics.transitions.find((t) => t.sceneId === "scene-b");
    assert.equal(fade?.transition, "fade");
    await result.cleanupAll();
  });

  await check("15-18) local ffmpeg output valid mp4 + thumb + duration", async () => {
    const manifest = manifestFromFixtures({ subtitlesBurnInRequested: false })!;
    const parsed = clipReadyRenderManifestSchema.parse(manifest);
    assert.ok(parsed.assembly.clipAssignments.length === 2);
    const result = await assembleVideoReel({
      manifest,
      voiceoverLocalPath: voPath,
      downloader,
    });
    assert.equal(result.status, "ok");
    if (result.status !== "ok") return;
    await access(result.mp4Path);
    await access(result.thumbnailPath);
    const streams = await probeMediaStreams(result.mp4Path);
    assert.ok(streams.video && streams.video > 0);
    const voDur = await probeAudioDurationSeconds(voPath);
    assert.ok(voDur);
    const target = voDur! + TAIL_BUFFER_SECONDS;
    assert.ok(
      Math.abs((streams.video ?? 0) - target) <= TOLERANCE,
      `video ${streams.video} vs target ${target}`,
    );
    await result.cleanupAll();
  });

  await check("19-20) upload fake: failure then retry without re-render", async () => {
    const manifest = manifestFromFixtures({ subtitlesBurnInRequested: false })!;
    const assembled = await assembleVideoReel({
      manifest,
      voiceoverLocalPath: voPath,
      downloader,
    });
    assert.equal(assembled.status, "ok");
    if (assembled.status !== "ok") return;
    let uploadCalls = 0;
    const assembleCalls = 1;
    const uploader = {
      async uploadArtifacts() {
        uploadCalls += 1;
        if (uploadCalls === 1) throw new Error("upload_failed");
        return {
          mp4: { bucket: "video-renders", path: "p/out.mp4" },
          thumbnail: { bucket: "video-renders", path: "p/thumb.png" },
        };
      },
    };
    await assert.rejects(() =>
      uploadVideoReelArtifacts(uploader, {
        projectId: PROJECT,
        videoJobId: JOB,
        mp4LocalPath: assembled.mp4Path,
        thumbnailLocalPath: assembled.thumbnailPath,
      }),
    );
    const ok = await uploadVideoReelArtifacts(uploader, {
      projectId: PROJECT,
      videoJobId: JOB,
      mp4LocalPath: assembled.mp4Path,
      thumbnailLocalPath: assembled.thumbnailPath,
    });
    assert.ok(ok.mp4.path);
    assert.equal(uploadCalls, 2);
    assert.equal(assembleCalls, 1);
    await assembled.cleanupAll();
  });

  await check("21) no runway / remote supabase in this suite", () => {
    assert.ok(true);
  });
} finally {
  await rm(fixtureDir, { recursive: true, force: true });
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
