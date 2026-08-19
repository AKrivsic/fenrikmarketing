/**
 * Step 11C — fingerprint before resume, staging validation, idempotent promotion, final phase.
 * npm run check:ai-video-worker-integration-11c
 */

import assert from "node:assert/strict";
import { readFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  computeAiVideoJobInputFingerprint,
  planDefaultsFromPlan,
} from "@/lib/video-worker/aiVideoCheckpointFingerprint";
import {
  buildAiVideoCheckpointOutput,
  buildAiVideoFinalDurableOutput,
  readAiVideoMeta,
  resolveAlreadyCompletedAiVideoJob,
} from "@/lib/video-worker/aiVideoJobOutput";
import { buildVideoRenderPath } from "@/lib/api/storage";
import {
  buildAiVideoStagingStoragePath,
  expectedFinalArtifactRefs,
} from "@/lib/video-worker/aiVideoStaging";
import { VIDEO_RENDER_MODE_AI_VIDEO_CLIPS } from "@/lib/video-engine/schemas/videoJobRenderMode";
import {
  AiVideoClipJobError,
  runAiVideoClipJobPhase,
} from "@/video-worker/aiVideoClipJobPhase";
import { finalizeAiVideoClipJob } from "@/video-worker/finalizeAiVideoClipJob";
import {
  promoteStagingToFinalArtifacts,
  type AiVideoArtifactStorageDeps,
} from "@/video-worker/aiVideoArtifactStorage";
import type { RenderSpecOutput } from "@/lib/video-engine/schemas/renderSchema";
import type { WorkerPayload } from "@/lib/video-engine/schemas/workerPayloadSchema";
import {
  applyExecutorClipResults,
  sha256HexFile,
} from "@/lib/video-reel-assembly";
import { buildSceneVideoGenerationPlanFromRenderScenes } from "@/lib/scene-video-plan";

let passed = 0;
let failed = 0;

async function check(name: string, fn: () => void | Promise<void>) {
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

const PROJECT = "11111111-1111-4111-8111-111111111111";
const JOB = "33333333-3333-4333-8333-333333333333";
const ATTEMPT_A = "aaaaaaaa-aaaa-4aaa-8aaa-111111111111";
const ATTEMPT_B = "bbbbbbbb-bbbb-4bbb-8bbb-222222222222";
const noopActive = async () => undefined;

function baseSpec() {
  return {
    voiceover_text: "Step 11C voiceover.",
    scenes: [
      {
        id: "scene-a",
        image_prompt: "A",
        duration_seconds: 3,
        motion_prompt: "M A",
        transition_in: "fade" as const,
      },
      {
        id: "scene-b",
        image_prompt: "B",
        duration_seconds: 4,
        motion_prompt: "M B",
        transition_in: "slide" as const,
      },
    ],
  };
}

function persistedSpec(): RenderSpecOutput {
  return {
    version: 1,
    scenes: [
      {
        id: "scene-a",
        image_prompt: "A",
        image_bucket: "video-renders",
        image_path: `${PROJECT}/video/${JOB}/scene-a.png`,
        duration_seconds: 3,
        motion_prompt: "M A",
        transition_in: "fade",
      },
      {
        id: "scene-b",
        image_prompt: "B",
        image_bucket: "video-renders",
        image_path: `${PROJECT}/video/${JOB}/scene-b.png`,
        duration_seconds: 4,
        motion_prompt: "M B",
        transition_in: "slide",
      },
    ],
  };
}

function fp(spec = baseSpec()) {
  const plan = buildSceneVideoGenerationPlanFromRenderScenes(persistedSpec().scenes);
  return computeAiVideoJobInputFingerprint({
    videoJobId: JOB,
    renderMode: VIDEO_RENDER_MODE_AI_VIDEO_CLIPS,
    voiceoverText: spec.voiceover_text,
    subtitlesBurnInRequested: false,
    spec,
    planDefaults: planDefaultsFromPlan(plan),
  });
}

function strictMemoryStorage(): AiVideoArtifactStorageDeps {
  const blobs = new Map<string, Buffer>();
  return {
    async uploadLocalFile({ storagePath, localPath }) {
      blobs.set(storagePath, await readFile(localPath));
    },
    async copyStorageObject({ fromPath, toPath }) {
      if (blobs.has(toPath)) throw new Error("copy_destination_exists");
      const b = blobs.get(fromPath);
      if (!b) throw new Error("missing_source");
      blobs.set(toPath, b);
    },
    async signStoragePath({ storagePath }) {
      return `https://cdn.test/${storagePath}`;
    },
    async removeStoragePaths({ paths }) {
      for (const p of paths) blobs.delete(p);
    },
    async storageObjectExists({ path }) {
      return blobs.has(path);
    },
  };
}

function basePayload(): WorkerPayload {
  return {
    video_job_id: JOB,
    project_id: PROJECT,
    content_package_id: "22222222-2222-4222-8222-222222222222",
    content_item_id: "44444444-4444-4444-8444-444444444444",
    callback_url: "http://localhost/callback",
    input: {
      ...baseSpec(),
      video_render_mode: VIDEO_RENDER_MODE_AI_VIDEO_CLIPS,
      ai_scene_video_max_budget_usd: 2,
      ai_scene_video_confirm_paid_run: true,
    },
  };
}

console.log("check:ai-video-worker-integration-11c");

await check("15) plain copy on existing dest fails in strict storage", async () => {
  const s = strictMemoryStorage();
  const tmp = await mkdtemp(join(tmpdir(), "c15-"));
  try {
    const f = join(tmp, "a.bin");
    await writeFile(f, Buffer.from("x"));
    await s.uploadLocalFile({
      bucket: "b",
      storagePath: "from",
      localPath: f,
      contentType: "application/octet-stream",
    });
    await s.uploadLocalFile({
      bucket: "b",
      storagePath: "to",
      localPath: f,
      contentType: "application/octet-stream",
    });
    await assert.rejects(
      () =>
        s.copyStorageObject({ bucket: "b", fromPath: "from", toPath: "to" }),
      /copy_destination_exists/,
    );
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

await check("16) idempotent promotion completes partial final objects", async () => {
  const s = strictMemoryStorage();
  const tmp = await mkdtemp(join(tmpdir(), "c16-"));
  try {
    const f = join(tmp, "a.bin");
    await writeFile(f, Buffer.from("mp4"));
    const stagingMp4 = buildAiVideoStagingStoragePath(PROJECT, JOB, "output.mp4");
    const stagingThumb = buildAiVideoStagingStoragePath(
      PROJECT,
      JOB,
      "thumbnail.png",
    );
    const finalMp4 = buildVideoRenderPath(PROJECT, JOB, "output.mp4");
    await s.uploadLocalFile({
      bucket: "video-renders",
      storagePath: stagingMp4,
      localPath: f,
      contentType: "video/mp4",
    });
    await s.uploadLocalFile({
      bucket: "video-renders",
      storagePath: stagingThumb,
      localPath: f,
      contentType: "image/png",
    });
    await s.uploadLocalFile({
      bucket: "video-renders",
      storagePath: finalMp4,
      localPath: f,
      contentType: "video/mp4",
    });
    let renew = 0;
    await promoteStagingToFinalArtifacts({
      projectId: PROJECT,
      videoJobId: JOB,
      subtitlesWanted: false,
      staging: {
        mp4: { bucket: "video-renders", path: stagingMp4 },
        thumbnail: { bucket: "video-renders", path: stagingThumb },
      },
      storage: s,
      assertLeaseHeld: async () => {
        renew += 1;
      },
    });
    assert.ok(renew >= 2);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

const fixtureDir = await mkdtemp(join(tmpdir(), "fenrik-11c-"));
try {
  const voPath = join(fixtureDir, "vo.mp3");
  const { spawn } = await import("node:child_process");
  const ffmpeg = process.env.FFMPEG_PATH ?? "ffmpeg";
  await new Promise<void>((resolve, reject) => {
    spawn(
      ffmpeg,
      [
        "-y",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=440:duration=2.5",
        "-c:a",
        "libmp3lame",
        voPath,
      ],
      { stdio: "ignore" },
    )
      .on("close", (c) => (c === 0 ? resolve() : reject(new Error(String(c)))))
      .on("error", reject);
  });

  const voiceoverSha256 = await sha256HexFile(voPath);
  const applied = applyExecutorClipResults({
    renderSpec: persistedSpec(),
    executorResult: {
      status: "completed",
      sceneCount: 2,
      reusedCount: 2,
      newlyCompletedCount: 0,
      failedCount: 0,
      unresolvedCount: 0,
      skippedCount: 0,
      theoreticalTotalCostUsd: 0.4,
      existingCompletedCostUsd: 0.4,
      alreadyCommittedCostUsd: 0,
      maxNewCostUsd: 0.4,
      newlyInitiatedProviderCostUsd: 0,
      scenes: [
        {
          sceneId: "scene-a",
          sceneIndex: 0,
          clientRequestId: "00000000-0000-4000-8000-000000000001",
          outcome: "completed",
          attemptId: ATTEMPT_A,
          clip: {
            bucket: "fixtures",
            path: "a.mp4",
            duration_seconds: 3,
            generation_attempt_id: ATTEMPT_A,
          },
        },
        {
          sceneId: "scene-b",
          sceneIndex: 1,
          clientRequestId: "00000000-0000-4000-8000-000000000002",
          outcome: "completed",
          attemptId: ATTEMPT_B,
          clip: {
            bucket: "fixtures",
            path: "b.mp4",
            duration_seconds: 4,
            generation_attempt_id: ATTEMPT_B,
          },
        },
      ],
    },
    voiceoverText: baseSpec().voiceover_text,
    voiceoverSha256,
    subtitlesBurnInRequested: false,
    music: null,
    ambient: null,
  });
  assert.equal(applied.ok, true);
  const manifest = applied.ok ? applied.manifest : null;
  assert.ok(manifest);

  const stagingMp4 = buildAiVideoStagingStoragePath(PROJECT, JOB, "output.mp4");
  const stagingThumb = buildAiVideoStagingStoragePath(
    PROJECT,
    JOB,
    "thumbnail.png",
  );

  function assemblyOut(stagingMp4Path: string, stagingThumbPath: string) {
    return buildAiVideoCheckpointOutput({
      renderSpec: {
        version: manifest!.version,
        scenes: manifest!.scenes,
        duration_seconds: manifest!.duration_seconds,
        subtitle_timing: manifest!.subtitle_timing,
        metadata: manifest!.metadata,
      },
      phase: "assembly_complete",
      meta: {
        input_fingerprint: fp(),
        input_fingerprint_version: 1,
        staging: {
          mp4: { bucket: "video-renders", path: stagingMp4Path },
          thumbnail: { bucket: "video-renders", path: stagingThumbPath },
        },
        clip_ready_manifest: manifest!,
      },
    });
  }

  await check("1-3) changed input + assembly_complete → mismatch", async () => {
    let execCalls = 0;
    await assert.rejects(
      () =>
        runAiVideoClipJobPhase(
          {
            payload: basePayload(),
            spec: { ...baseSpec(), voiceover_text: "Changed narration." },
            images: [],
            renderAudioPath: voPath,
            srtPath: join(fixtureDir, "x.srt"),
            subtitlesBurnInRequested: false,
            maxBudgetUsd: 2,
            confirmPaidRun: true,
            workDir: fixtureDir,
            leaseSupabase: {} as never,
            leaseOwner: JOB,
            subtitleDebug: {},
          },
          {
            buildPersistedRenderSpec: async () => persistedSpec(),
            getJobOutput: async () => assemblyOut(stagingMp4, stagingThumb),
            persistArtifacts: async () => true,
            renewLease: async () => true,
            assertStillActive: noopActive,
            executePlan: async () => {
              execCalls += 1;
              throw new Error("no_exec");
            },
          },
        ),
      (e: unknown) =>
        e instanceof AiVideoClipJobError &&
        e.code === "checkpoint_input_mismatch",
    );
    assert.equal(execCalls, 0);
  });

  await check("4) checkpoint without fingerprint rejected", async () => {
    const prior = buildAiVideoCheckpointOutput({
      renderSpec: persistedSpec(),
      phase: "checkpoint_stills",
    });
    await assert.rejects(
      () =>
        runAiVideoClipJobPhase(
          {
            payload: basePayload(),
            spec: baseSpec(),
            images: [],
            renderAudioPath: voPath,
            srtPath: join(fixtureDir, "x.srt"),
            subtitlesBurnInRequested: false,
            maxBudgetUsd: 2,
            confirmPaidRun: true,
            workDir: fixtureDir,
            leaseSupabase: {} as never,
            leaseOwner: JOB,
            subtitleDebug: {},
          },
          {
            buildPersistedRenderSpec: async () => persistedSpec(),
            getJobOutput: async () => prior,
            renewLease: async () => true,
            assertStillActive: noopActive,
          },
        ),
      (e: unknown) =>
        e instanceof AiVideoClipJobError &&
        e.code === "checkpoint_fingerprint_missing",
    );
  });

  await check("5-6) invalid staging paths rejected", async () => {
    const otherJob = "99999999-9999-4999-8999-999999999999";
    const badStaging = buildAiVideoStagingStoragePath(PROJECT, otherJob, "output.mp4");
    await assert.rejects(
      () =>
        runAiVideoClipJobPhase(
          {
            payload: basePayload(),
            spec: baseSpec(),
            images: [],
            renderAudioPath: voPath,
            srtPath: join(fixtureDir, "x.srt"),
            subtitlesBurnInRequested: false,
            maxBudgetUsd: 2,
            confirmPaidRun: true,
            workDir: fixtureDir,
            leaseSupabase: {} as never,
            leaseOwner: JOB,
            subtitleDebug: {},
          },
          {
            buildPersistedRenderSpec: async () => persistedSpec(),
            getJobOutput: async () => assemblyOut(badStaging, stagingThumb),
            renewLease: async () => true,
            assertStillActive: noopActive,
          },
        ),
      (e: unknown) =>
        e instanceof AiVideoClipJobError && e.code === "checkpoint_invalid",
    );

    const finalMp4 = buildVideoRenderPath(PROJECT, JOB, "output.mp4");
    await assert.rejects(
      () =>
        runAiVideoClipJobPhase(
          {
            payload: basePayload(),
            spec: baseSpec(),
            images: [],
            renderAudioPath: voPath,
            srtPath: join(fixtureDir, "x.srt"),
            subtitlesBurnInRequested: false,
            maxBudgetUsd: 2,
            confirmPaidRun: true,
            workDir: fixtureDir,
            leaseSupabase: {} as never,
            leaseOwner: JOB,
            subtitleDebug: {},
          },
          {
            buildPersistedRenderSpec: async () => persistedSpec(),
            getJobOutput: async () => assemblyOut(finalMp4, stagingThumb),
            renewLease: async () => true,
            assertStillActive: noopActive,
          },
        ),
      (e: unknown) =>
        e instanceof AiVideoClipJobError && e.code === "checkpoint_invalid",
    );
  });

  await check("7) missing thumbnail staging rejected", async () => {
    const prior = buildAiVideoCheckpointOutput({
      renderSpec: persistedSpec(),
      phase: "assembly_complete",
      meta: {
        input_fingerprint: fp(),
        input_fingerprint_version: 1,
        staging: {
          mp4: { bucket: "video-renders", path: stagingMp4 },
        },
        clip_ready_manifest: manifest!,
      },
    });
    await assert.rejects(
      () =>
        runAiVideoClipJobPhase(
          {
            payload: basePayload(),
            spec: baseSpec(),
            images: [],
            renderAudioPath: voPath,
            srtPath: join(fixtureDir, "x.srt"),
            subtitlesBurnInRequested: false,
            maxBudgetUsd: 2,
            confirmPaidRun: true,
            workDir: fixtureDir,
            leaseSupabase: {} as never,
            leaseOwner: JOB,
            subtitleDebug: {},
          },
          {
            buildPersistedRenderSpec: async () => persistedSpec(),
            getJobOutput: async () => prior,
            renewLease: async () => true,
            assertStillActive: noopActive,
          },
        ),
      (e: unknown) =>
        e instanceof AiVideoClipJobError && e.code === "checkpoint_invalid",
    );
  });

  await check("9) final persist stores phase=final", async () => {
    const storage = strictMemoryStorage();
    const tmp = join(fixtureDir, "fin.mp4");
    await writeFile(tmp, Buffer.from("mp4"));
    await storage.uploadLocalFile({
      bucket: "video-renders",
      storagePath: stagingMp4,
      localPath: tmp,
      contentType: "video/mp4",
    });
    await storage.uploadLocalFile({
      bucket: "video-renders",
      storagePath: stagingThumb,
      localPath: tmp,
      contentType: "image/png",
    });
    let persisted: Record<string, unknown> = {};
    await finalizeAiVideoClipJob({
      projectId: PROJECT,
      videoJobId: JOB,
      leaseOwner: JOB,
      leaseSupabase: {} as never,
      subtitlesBurnInRequested: false,
      jobInputFingerprint: fp(),
      renewLease: async () => true,
      phase: {
        kind: "needs_final_promotion",
        staging: {
          mp4: { bucket: "video-renders", path: stagingMp4 },
          thumbnail: { bucket: "video-renders", path: stagingThumb },
        },
        renderSpec: persistedSpec(),
        debug: {},
        cleanupLocal: async () => undefined,
      },
      storage,
      persistArtifacts: async (_s, args) => {
        persisted = args.output;
        return true;
      },
      sendCallback: async () => undefined,
    });
    assert.equal(readAiVideoMeta(persisted)?.phase, "final");
  });

  await check("10-11) already-completed requires final + fingerprint", () => {
    const f = fp();
    const out = buildAiVideoFinalDurableOutput({
      mp4_url: "https://cdn/x.mp4",
      thumbnail_url: "https://cdn/t.png",
      render_spec: persistedSpec(),
      debug: {},
      aiMeta: {
        input_fingerprint: f,
        input_fingerprint_version: 1,
        final_artifacts: expectedFinalArtifactRefs(PROJECT, JOB, false),
      },
    });
    assert.ok(
      resolveAlreadyCompletedAiVideoJob({
        output: out,
        videoJobId: JOB,
        projectId: PROJECT,
        expectedJobInputFingerprint: f,
      }),
    );
    const meta = readAiVideoMeta(out)!;
    assert.equal(
      resolveAlreadyCompletedAiVideoJob({
        output: {
          ...out,
          ai_video: { ...meta, phase: "assembly_complete" },
        },
        videoJobId: JOB,
        projectId: PROJECT,
        expectedJobInputFingerprint: f,
      }),
      null,
    );
  });

  await check("12) lease lost before promotion → no copy", async () => {
    let copies = 0;
    const storage = strictMemoryStorage();
    const tmp = join(fixtureDir, "lease.mp4");
    await writeFile(tmp, Buffer.from("mp4"));
    await storage.uploadLocalFile({
      bucket: "video-renders",
      storagePath: stagingMp4,
      localPath: tmp,
      contentType: "video/mp4",
    });
    const r = await finalizeAiVideoClipJob({
      projectId: PROJECT,
      videoJobId: JOB,
      leaseOwner: JOB,
      leaseSupabase: {} as never,
      subtitlesBurnInRequested: false,
      jobInputFingerprint: fp(),
      renewLease: async () => false,
      phase: {
        kind: "needs_final_promotion",
        staging: {
          mp4: { bucket: "video-renders", path: stagingMp4 },
          thumbnail: { bucket: "video-renders", path: stagingThumb },
        },
        renderSpec: persistedSpec(),
        debug: {},
        cleanupLocal: async () => undefined,
      },
      storage: {
        ...storage,
        async copyStorageObject(args) {
          copies += 1;
          return storage.copyStorageObject(args);
        },
      },
      persistArtifacts: async () => true,
      sendCallback: async () => undefined,
    });
    assert.equal(r.status, "lease_lost");
    assert.equal(copies, 0);
  });

  await check("20-21) callback failure then callback-only retry", async () => {
    const storage = strictMemoryStorage();
    const tmp = join(fixtureDir, "cb.mp4");
    await writeFile(tmp, Buffer.from("mp4"));
    await storage.uploadLocalFile({
      bucket: "video-renders",
      storagePath: stagingMp4,
      localPath: tmp,
      contentType: "video/mp4",
    });
    await storage.uploadLocalFile({
      bucket: "video-renders",
      storagePath: stagingThumb,
      localPath: tmp,
      contentType: "image/png",
    });
    let persisted: Record<string, unknown> = {};
    const r1 = await finalizeAiVideoClipJob({
      projectId: PROJECT,
      videoJobId: JOB,
      leaseOwner: JOB,
      leaseSupabase: {} as never,
      subtitlesBurnInRequested: false,
      jobInputFingerprint: fp(),
      renewLease: async () => true,
      phase: {
        kind: "needs_final_promotion",
        staging: {
          mp4: { bucket: "video-renders", path: stagingMp4 },
          thumbnail: { bucket: "video-renders", path: stagingThumb },
        },
        renderSpec: persistedSpec(),
        debug: {},
        cleanupLocal: async () => undefined,
      },
      storage,
      persistArtifacts: async (_s, args) => {
        persisted = args.output;
        return true;
      },
      sendCallback: async () => {
        throw new Error("callback_down");
      },
    });
    assert.equal(r1.status, "completed");
    assert.equal(r1.callbackSent, false);
    assert.equal(readAiVideoMeta(persisted)?.phase, "final");

    let callbacks = 0;
    const phase = await runAiVideoClipJobPhase(
      {
        payload: basePayload(),
        spec: baseSpec(),
        images: [],
        renderAudioPath: voPath,
        srtPath: join(fixtureDir, "x.srt"),
        subtitlesBurnInRequested: false,
        maxBudgetUsd: 2,
        confirmPaidRun: true,
        workDir: fixtureDir,
        leaseSupabase: {} as never,
        leaseOwner: JOB,
        subtitleDebug: {},
      },
      {
        buildPersistedRenderSpec: async () => persistedSpec(),
        getJobOutput: async () => persisted,
        renewLease: async () => true,
        assertStillActive: noopActive,
      },
    );
    assert.equal(phase.kind, "already_completed");
    const r2 = await finalizeAiVideoClipJob({
      projectId: PROJECT,
      videoJobId: JOB,
      leaseOwner: JOB,
      leaseSupabase: {} as never,
      subtitlesBurnInRequested: false,
      jobInputFingerprint: fp(),
      renewLease: async () => true,
      phase,
      persistArtifacts: async () => {
        throw new Error("must_not_persist");
      },
      sendCallback: async () => {
        callbacks += 1;
      },
    });
    assert.equal(r2.status, "already_completed");
    assert.equal(callbacks, 1);
  });

  await check("18-19) assembly_complete retry skips executor/assembly", async () => {
    let execCalls = 0;
    let assembleCalls = 0;
    const phase = await runAiVideoClipJobPhase(
      {
        payload: basePayload(),
        spec: baseSpec(),
        images: [],
        renderAudioPath: voPath,
        srtPath: join(fixtureDir, "x.srt"),
        subtitlesBurnInRequested: false,
        maxBudgetUsd: 2,
        confirmPaidRun: true,
        workDir: fixtureDir,
        leaseSupabase: {} as never,
        leaseOwner: JOB,
        subtitleDebug: {},
      },
      {
        buildPersistedRenderSpec: async () => persistedSpec(),
        getJobOutput: async () => assemblyOut(stagingMp4, stagingThumb),
        renewLease: async () => true,
        assertStillActive: noopActive,
        executePlan: async () => {
          execCalls += 1;
          throw new Error("no");
        },
        assembleReel: async () => {
          assembleCalls += 1;
          throw new Error("no");
        },
      },
    );
    assert.equal(phase.kind, "needs_final_promotion");
    assert.equal(execCalls, 0);
    assert.equal(assembleCalls, 0);
  });
} finally {
  await rm(fixtureDir, { recursive: true, force: true });
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
