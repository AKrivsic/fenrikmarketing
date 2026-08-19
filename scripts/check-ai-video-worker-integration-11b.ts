/**
 * Step 11B — checkpoint fingerprint, staging, finalize gating.
 * npm run check:ai-video-worker-integration-11b
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
import { VIDEO_RENDER_MODE_AI_VIDEO_CLIPS } from "@/lib/video-engine/schemas/videoJobRenderMode";
import {
  expectedFinalArtifactRefs,
} from "@/lib/video-worker/aiVideoStaging";
import {
  AiVideoClipJobError,
  runAiVideoClipJobPhase,
} from "@/video-worker/aiVideoClipJobPhase";
import { finalizeAiVideoClipJob } from "@/video-worker/finalizeAiVideoClipJob";
import type { AiVideoArtifactStorageDeps } from "@/video-worker/aiVideoArtifactStorage";
import type { RenderSpecOutput } from "@/lib/video-engine/schemas/renderSchema";
import type { WorkerPayload } from "@/lib/video-engine/schemas/workerPayloadSchema";
import {
  applyExecutorClipResults,
  sha256HexFile,
} from "@/lib/video-reel-assembly";
import { buildSceneVideoGenerationPlanFromRenderScenes } from "@/lib/scene-video-plan";
import { createLocalFixtureDownloader } from "@/video-worker/services/reel";

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
    voiceover_text: "Voiceover for fingerprint tests.",
    scenes: [
      {
        id: "scene-a",
        image_prompt: "Prompt A",
        duration_seconds: 3,
        motion_prompt: "Motion A",
        transition_in: "fade" as const,
      },
      {
        id: "scene-b",
        image_prompt: "Prompt B",
        duration_seconds: 4,
        motion_prompt: "Motion B",
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
        image_prompt: "Prompt A",
        image_bucket: "video-renders",
        image_path: `${PROJECT}/video/${JOB}/scene-a.png`,
        duration_seconds: 3,
        motion_prompt: "Motion A",
        transition_in: "fade",
      },
      {
        id: "scene-b",
        image_prompt: "Prompt B",
        image_bucket: "video-renders",
        image_path: `${PROJECT}/video/${JOB}/scene-b.png`,
        duration_seconds: 4,
        motion_prompt: "Motion B",
        transition_in: "slide",
      },
    ],
  };
}

function fingerprintForSpec(spec: ReturnType<typeof baseSpec>) {
  const plan = buildSceneVideoGenerationPlanFromRenderScenes(
    persistedSpec().scenes,
  );
  return computeAiVideoJobInputFingerprint({
    videoJobId: JOB,
    renderMode: VIDEO_RENDER_MODE_AI_VIDEO_CLIPS,
    voiceoverText: spec.voiceover_text,
    subtitlesBurnInRequested: false,
    spec,
    planDefaults: planDefaultsFromPlan(plan),
  });
}

function memoryStorage(): AiVideoArtifactStorageDeps {
  const blobs = new Map<string, Buffer>();
  return {
    async uploadLocalFile({ storagePath, localPath }) {
      blobs.set(storagePath, await readFile(localPath));
    },
    async copyStorageObject({ fromPath, toPath }) {
      if (blobs.has(toPath)) throw new Error("copy_destination_exists");
      const b = blobs.get(fromPath);
      if (!b) throw new Error("missing staging blob");
      blobs.set(toPath, b);
    },
    async signStoragePath({ storagePath }) {
      return `https://signed.example/${storagePath}`;
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

console.log("check:ai-video-worker-integration-11b");

const fixtureDirInner = await mkdtemp(join(tmpdir(), "fenrik-11b-"));

await check("6) same scene ids + different image prompt → mismatch", () => {
  const spec = baseSpec();
  const fp1 = fingerprintForSpec(spec);
  const spec2 = {
    ...spec,
    scenes: [{ ...spec.scenes[0]!, image_prompt: "Changed" }, spec.scenes[1]!],
  };
  const fp2 = fingerprintForSpec(spec2);
  assert.notEqual(fp1, fp2);
});

await check("7) same scene ids + different motion prompt → mismatch", () => {
  const spec = baseSpec();
  const fp1 = fingerprintForSpec(spec);
  const spec2 = {
    ...spec,
    scenes: [{ ...spec.scenes[0]!, motion_prompt: "Other" }, spec.scenes[1]!],
  };
  const fp2 = fingerprintForSpec(spec2);
  assert.notEqual(fp1, fp2);
});

await check("8) same scene ids + different duration → mismatch", () => {
  const spec = baseSpec();
  const fp1 = fingerprintForSpec(spec);
  const spec2 = {
    ...spec,
    scenes: [{ ...spec.scenes[0]!, duration_seconds: 9 }, spec.scenes[1]!],
  };
  const fp2 = fingerprintForSpec(spec2);
  assert.notEqual(fp1, fp2);
});

await check("9) different voiceover text → mismatch", () => {
  const fp1 = fingerprintForSpec(baseSpec());
  const fp2 = fingerprintForSpec({
    ...baseSpec(),
    voiceover_text: "Different narration.",
  });
  assert.notEqual(fp1, fp2);
});

await check("10) identical input → fingerprint match", () => {
  const spec = baseSpec();
  assert.equal(fingerprintForSpec(spec), fingerprintForSpec(spec));
});

await check("1) finalize persist false → no completed callback", async () => {
  let callbacks = 0;
  const storage = memoryStorage();
  const tmpMp4 = join(fixtureDirInner, "persist-false.mp4");
  await writeFile(tmpMp4, Buffer.from("fake-mp4"));
  const stagingMp4 = `${PROJECT}/video/${JOB}/ai-staging/out-fail.mp4`;
  const stagingThumb = `${PROJECT}/video/${JOB}/ai-staging/th-fail.png`;
  await storage.uploadLocalFile({
    bucket: "video-renders",
    storagePath: stagingMp4,
    localPath: tmpMp4,
    contentType: "video/mp4",
  });
  await storage.uploadLocalFile({
    bucket: "video-renders",
    storagePath: stagingThumb,
    localPath: tmpMp4,
    contentType: "image/png",
  });
  const r = await finalizeAiVideoClipJob({
    projectId: PROJECT,
    videoJobId: JOB,
    leaseOwner: JOB,
    leaseSupabase: {} as never,
    subtitlesBurnInRequested: false,
    jobInputFingerprint: fingerprintForSpec(baseSpec()),
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
    persistArtifacts: async () => false,
    sendCallback: async () => {
      callbacks += 1;
    },
  });
  assert.equal(r.status, "lease_lost");
  assert.equal(callbacks, 0);
});

await check("20) finalize persist true before callback", async () => {
  let callbacks = 0;
  const storage = memoryStorage();
  const tmpMp4 = join(fixtureDirInner, "staging.mp4");
  await writeFile(tmpMp4, Buffer.from("fake-mp4"));
  await storage.uploadLocalFile({
    bucket: "video-renders",
    storagePath: `${PROJECT}/video/${JOB}/ai-staging/output.mp4`,
    localPath: tmpMp4,
    contentType: "video/mp4",
  });
  await storage.uploadLocalFile({
    bucket: "video-renders",
    storagePath: `${PROJECT}/video/${JOB}/ai-staging/thumbnail.png`,
    localPath: tmpMp4,
    contentType: "image/png",
  });
  const r = await finalizeAiVideoClipJob({
    projectId: PROJECT,
    videoJobId: JOB,
    leaseOwner: JOB,
    leaseSupabase: {} as never,
    subtitlesBurnInRequested: false,
    jobInputFingerprint: fingerprintForSpec(baseSpec()),
    renewLease: async () => true,
    phase: {
      kind: "needs_final_promotion",
      staging: {
        mp4: {
          bucket: "video-renders",
          path: `${PROJECT}/video/${JOB}/ai-staging/output.mp4`,
        },
        thumbnail: {
          bucket: "video-renders",
          path: `${PROJECT}/video/${JOB}/ai-staging/thumbnail.png`,
        },
      },
      renderSpec: persistedSpec(),
      debug: {},
      cleanupLocal: async () => undefined,
    },
    storage,
    persistArtifacts: async () => true,
    sendCallback: async () => {
      callbacks += 1;
    },
  });
  assert.equal(r.status, "completed");
  assert.equal(callbacks, 1);
});

await check("4) already completed output → resolve helper", () => {
  const fp = fingerprintForSpec(baseSpec());
  const out = buildAiVideoFinalDurableOutput({
    mp4_url: "https://cdn/x.mp4",
    thumbnail_url: "https://cdn/t.png",
    render_spec: persistedSpec(),
    debug: { video_render_mode: VIDEO_RENDER_MODE_AI_VIDEO_CLIPS },
    aiMeta: {
      input_fingerprint: fp,
      input_fingerprint_version: 1,
      final_artifacts: expectedFinalArtifactRefs(PROJECT, JOB, false),
    },
  });
  const resolved = resolveAlreadyCompletedAiVideoJob({
    output: out,
    videoJobId: JOB,
    projectId: PROJECT,
    expectedJobInputFingerprint: fp,
  });
  assert.ok(resolved?.mp4Url);
});

const fixtureDirInnerInner = fixtureDirInner;
try {
  const voPath = join(fixtureDirInnerInner, "vo.mp3");
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

  const clipA = join(fixtureDirInner, "clip_a.mp4");
  const clipB = join(fixtureDirInner, "clip_b.mp4");
  for (const [path, dur] of [
    [clipA, 3],
    [clipB, 4],
  ] as const) {
    await new Promise<void>((resolve, reject) => {
      spawn(
        ffmpeg,
        [
          "-y",
          "-f",
          "lavfi",
          "-i",
          `testsrc2=size=720x1280:rate=30:duration=${dur}`,
          "-an",
          "-c:v",
          "libx264",
          "-pix_fmt",
          "yuv420p",
          path,
        ],
        { stdio: "ignore" },
      )
        .on("close", (c) => (c === 0 ? resolve() : reject(new Error(String(c)))))
        .on("error", reject);
    });
  }

  const fp = fingerprintForSpec(baseSpec());

  await check("11) scene_clips_complete persisted after executor", async () => {
    const phases: string[] = [];
    let lastPhase = "";
    const executorResult = {
      status: "completed" as const,
      sceneCount: 2,
      reusedCount: 0,
      newlyCompletedCount: 2,
      failedCount: 0,
      unresolvedCount: 0,
      skippedCount: 0,
      theoreticalTotalCostUsd: 0.4,
      existingCompletedCostUsd: 0,
      alreadyCommittedCostUsd: 0,
      maxNewCostUsd: 0.4,
      newlyInitiatedProviderCostUsd: 0,
      scenes: [
        {
          sceneId: "scene-a",
          sceneIndex: 0,
          clientRequestId: "00000000-0000-4000-8000-000000000001",
          outcome: "completed" as const,
          attemptId: ATTEMPT_A,
          clip: {
            bucket: "fixtures",
            path: "clip_a.mp4",
            duration_seconds: 3,
            generation_attempt_id: ATTEMPT_A,
          },
        },
        {
          sceneId: "scene-b",
          sceneIndex: 1,
          clientRequestId: "00000000-0000-4000-8000-000000000002",
          outcome: "completed" as const,
          attemptId: ATTEMPT_B,
          clip: {
            bucket: "fixtures",
            path: "clip_b.mp4",
            duration_seconds: 4,
            generation_attempt_id: ATTEMPT_B,
          },
        },
      ],
    };

    await runAiVideoClipJobPhase(
      {
        payload: basePayload(),
        spec: baseSpec(),
        images: [],
        renderAudioPath: voPath,
        srtPath: join(fixtureDirInner, "x.srt"),
        subtitlesBurnInRequested: false,
        maxBudgetUsd: 2,
        confirmPaidRun: true,
        workDir: fixtureDirInner,
        leaseSupabase: {} as never,
        leaseOwner: JOB,
        subtitleDebug: {},
      },
      {
        buildPersistedRenderSpec: async () => persistedSpec(),
        getJobOutput: async () => ({}),
        persistArtifacts: async (_s, args) => {
          const meta = readAiVideoMeta(args.output);
          if (meta?.phase) {
            phases.push(meta.phase);
            lastPhase = meta.phase;
          }
          return true;
        },
        renewLease: async () => true,
        assertStillActive: noopActive,
        executePlan: async () => executorResult,
        createDownloader: () =>
          createLocalFixtureDownloader({
            "fixtures/clip_a.mp4": clipA,
            "fixtures/clip_b.mp4": clipB,
          }),
        artifactStorage: memoryStorage(),
      },
    );
    assert.ok(phases.includes("scene_clips_complete"));
    assert.equal(lastPhase, "assembly_complete");
  });

  await check("12) retry scene_clips_complete skips provider POST", async () => {
    let execCalls = 0;
    const executorResult = {
      status: "completed" as const,
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
          outcome: "completed" as const,
          attemptId: ATTEMPT_A,
          clip: {
            bucket: "fixtures",
            path: "clip_a.mp4",
            duration_seconds: 3,
            generation_attempt_id: ATTEMPT_A,
          },
        },
        {
          sceneId: "scene-b",
          sceneIndex: 1,
          clientRequestId: "00000000-0000-4000-8000-000000000002",
          outcome: "completed" as const,
          attemptId: ATTEMPT_B,
          clip: {
            bucket: "fixtures",
            path: "clip_b.mp4",
            duration_seconds: 4,
            generation_attempt_id: ATTEMPT_B,
          },
        },
      ],
    };
    const voiceoverSha256 = await sha256HexFile(voPath);
    const applied = applyExecutorClipResults({
      renderSpec: persistedSpec(),
      executorResult,
      voiceoverText: baseSpec().voiceover_text,
      voiceoverSha256,
      subtitlesBurnInRequested: false,
      music: null,
      ambient: null,
    });
    assert.equal(applied.ok, true);
    const priorOutput = buildAiVideoCheckpointOutput({
      renderSpec: applied.ok ? applied.manifest : persistedSpec(),
      phase: "scene_clips_complete",
      meta: {
        input_fingerprint: fp,
        input_fingerprint_version: 1,
        clip_ready_manifest: applied.ok ? applied.manifest : undefined,
      },
    });

    await runAiVideoClipJobPhase(
      {
        payload: basePayload(),
        spec: baseSpec(),
        images: [],
        renderAudioPath: voPath,
        srtPath: join(fixtureDirInner, "x.srt"),
        subtitlesBurnInRequested: false,
        maxBudgetUsd: 2,
        confirmPaidRun: true,
        workDir: fixtureDirInner,
        leaseSupabase: {} as never,
        leaseOwner: JOB,
        subtitleDebug: {},
      },
      {
        buildPersistedRenderSpec: async () => persistedSpec(),
        getJobOutput: async () => priorOutput,
        persistArtifacts: async () => true,
        renewLease: async () => true,
        assertStillActive: noopActive,
        executePlan: async () => {
          execCalls += 1;
          throw new Error("must_not_run_executor");
        },
        createDownloader: () =>
          createLocalFixtureDownloader({
            "fixtures/clip_a.mp4": clipA,
            "fixtures/clip_b.mp4": clipB,
          }),
        artifactStorage: memoryStorage(),
      },
    );
    assert.equal(execCalls, 0);
  });

  await check("12-17) retry from assembly_complete skips executor and assembly", async () => {
    let execCalls = 0;
    let assembleCalls = 0;
    const staging = {
      mp4: {
        bucket: "video-renders",
        path: `${PROJECT}/video/${JOB}/ai-staging/output.mp4`,
      },
      thumbnail: {
        bucket: "video-renders",
        path: `${PROJECT}/video/${JOB}/ai-staging/thumbnail.png`,
      },
    };
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
              path: "clip_a.mp4",
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
              path: "clip_b.mp4",
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
    const priorOutput = buildAiVideoCheckpointOutput({
      renderSpec: applied.ok
        ? {
            version: applied.manifest.version,
            scenes: applied.manifest.scenes,
            duration_seconds: applied.manifest.duration_seconds,
            subtitle_timing: applied.manifest.subtitle_timing,
            metadata: applied.manifest.metadata,
          }
        : persistedSpec(),
      phase: "assembly_complete",
      meta: {
        input_fingerprint: fp,
        input_fingerprint_version: 1,
        staging,
        clip_ready_manifest: applied.ok ? applied.manifest : undefined,
      },
    });
    priorOutput.debug = { video_render_mode: VIDEO_RENDER_MODE_AI_VIDEO_CLIPS };

    const phase = await runAiVideoClipJobPhase(
      {
        payload: basePayload(),
        spec: baseSpec(),
        images: [],
        renderAudioPath: voPath,
        srtPath: join(fixtureDirInner, "x.srt"),
        subtitlesBurnInRequested: false,
        maxBudgetUsd: 2,
        confirmPaidRun: true,
        workDir: fixtureDirInner,
        leaseSupabase: {} as never,
        leaseOwner: JOB,
        subtitleDebug: {},
      },
      {
        buildPersistedRenderSpec: async () => persistedSpec(),
        getJobOutput: async () => priorOutput,
        persistArtifacts: async () => true,
        renewLease: async () => true,
        assertStillActive: noopActive,
        executePlan: async () => {
          execCalls += 1;
          throw new Error("must_not_run");
        },
        assembleReel: async () => {
          assembleCalls += 1;
          throw new Error("must_not_run");
        },
      },
    );
    assert.equal(phase.kind, "needs_final_promotion");
    assert.equal(execCalls, 0);
    assert.equal(assembleCalls, 0);
    assert.equal(phase.staging.mp4.path.includes("ai-staging"), true);
    assert.doesNotMatch(JSON.stringify(phase.staging), /signed/);
  });

  await check("checkpoint fingerprint mismatch blocks", async () => {
    await assert.rejects(
      () =>
        runAiVideoClipJobPhase(
          {
            payload: basePayload(),
            spec: { ...baseSpec(), voiceover_text: "Changed VO" },
            images: [],
            renderAudioPath: voPath,
            srtPath: join(fixtureDirInner, "x.srt"),
            subtitlesBurnInRequested: false,
            maxBudgetUsd: 2,
            confirmPaidRun: true,
            workDir: fixtureDirInner,
            leaseSupabase: {} as never,
            leaseOwner: JOB,
            subtitleDebug: {},
          },
          {
            buildPersistedRenderSpec: async () => persistedSpec(),
            getJobOutput: async () =>
              buildAiVideoCheckpointOutput({
                renderSpec: persistedSpec(),
                phase: "checkpoint_stills",
                meta: { input_fingerprint: fp, input_fingerprint_version: 1 },
              }),
            persistArtifacts: async () => true,
            renewLease: async () => true,
            assertStillActive: noopActive,
          },
        ),
      (e: unknown) =>
        e instanceof AiVideoClipJobError &&
        e.code === "checkpoint_input_mismatch",
    );
  });

  await check("3) lease-lost checkpoint → no further work", async () => {
    await assert.rejects(
      () =>
        runAiVideoClipJobPhase(
          {
            payload: basePayload(),
            spec: baseSpec(),
            images: [],
            renderAudioPath: voPath,
            srtPath: join(fixtureDirInner, "x.srt"),
            subtitlesBurnInRequested: false,
            maxBudgetUsd: 2,
            confirmPaidRun: true,
            workDir: fixtureDirInner,
            leaseSupabase: {} as never,
            leaseOwner: JOB,
            subtitleDebug: {},
          },
          {
            buildPersistedRenderSpec: async () => persistedSpec(),
            getJobOutput: async () => ({}),
            renewLease: async () => false,
            assertStillActive: noopActive,
          },
        ),
      (e: unknown) =>
        e instanceof AiVideoClipJobError && e.code === "lease_lost",
    );
  });

} finally {
  await rm(fixtureDirInner, { recursive: true, force: true });
}

await check("2) lease-lost finalize → no failed callback path", () => {
  const src = readFileSync(
    join(process.cwd(), "video-worker/jobRunner.ts"),
    "utf8",
  );
  const aiBlock = src.slice(
    src.indexOf("finalizeAiVideoClipJob"),
    src.indexOf("ai_video_clips job finished"),
  );
  assert.doesNotMatch(aiBlock, /lease_lost[\s\S]*sendVideoCallback/);
  assert.match(src, /isAiVideoLeaseLostError\(err\)/);
});

await check("5) early AI complete before TTS (AI branch)", () => {
  const src = readFileSync(
    join(process.cwd(), "video-worker/jobRunner.ts"),
    "utf8",
  );
  const modeGate = src.indexOf("renderOptions.mode !== VIDEO_RENDER_MODE_STILL");
  const aiEarly = src.indexOf("ai_video_clips job already completed");
  const tts = src.indexOf("generateValidatedVoiceover", modeGate);
  assert.ok(modeGate > 0 && aiEarly > modeGate && tts > aiEarly);
});

await check("19) assembly_complete alone is not job completed", () => {
  const out = buildAiVideoCheckpointOutput({
    renderSpec: persistedSpec(),
    phase: "assembly_complete",
    meta: {
      input_fingerprint: fingerprintForSpec(baseSpec()),
      input_fingerprint_version: 1,
      staging: {
        mp4: { bucket: "b", path: "p/staging/o.mp4" },
        thumbnail: { bucket: "b", path: "p/staging/t.png" },
      },
    },
  });
  assert.equal(
    resolveAlreadyCompletedAiVideoJob({
      output: out,
      videoJobId: JOB,
      projectId: PROJECT,
    }),
    null,
  );
});

await check("15) promotion persist false keeps assembly checkpoint", async () => {
  let persistCalled = false;
  const storage = memoryStorage();
  const tmpDir = await mkdtemp(join(tmpdir(), "promo-fail-"));
  try {
    const tmp = join(tmpDir, "promo-fail.mp4");
    await writeFile(tmp, Buffer.from("mp4"));
    const stagingMp4 = `${PROJECT}/video/${JOB}/ai-staging/promo.mp4`;
    const stagingThumb = `${PROJECT}/video/${JOB}/ai-staging/promo.png`;
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
    await finalizeAiVideoClipJob({
      projectId: PROJECT,
      videoJobId: JOB,
      leaseOwner: JOB,
      leaseSupabase: {} as never,
      subtitlesBurnInRequested: false,
      jobInputFingerprint: fingerprintForSpec(baseSpec()),
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
      persistArtifacts: async () => {
        persistCalled = true;
        return false;
      },
      sendCallback: async () => {
        throw new Error("must_not_callback");
      },
    });
    assert.equal(persistCalled, true);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

await check("21-22) cleanup after commit; cleanup failure OK", async () => {
  let removed = 0;
  let callbacks = 0;
  const blobs = new Map<string, Buffer>();
  const storage: AiVideoArtifactStorageDeps = {
    async uploadLocalFile({ storagePath, localPath }) {
      blobs.set(storagePath, await readFile(localPath));
    },
    async copyStorageObject({ fromPath, toPath }) {
      const b = blobs.get(fromPath);
      if (!b) throw new Error("missing");
      blobs.set(toPath, b);
    },
    async signStoragePath({ storagePath }) {
      return `https://cdn.test/${storagePath}`;
    },
    async removeStoragePaths() {
      removed += 1;
      throw new Error("cleanup_failed");
    },
  };
  const tmpDir = await mkdtemp(join(tmpdir(), "clean-"));
  try {
    const tmp = join(tmpDir, "clean.mp4");
    await writeFile(tmp, Buffer.from("mp4"));
    const stagingMp4 = `${PROJECT}/video/${JOB}/ai-staging/clean.mp4`;
    const stagingThumb = `${PROJECT}/video/${JOB}/ai-staging/clean.png`;
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
    const staging = {
      mp4: { bucket: "video-renders", path: stagingMp4 },
      thumbnail: { bucket: "video-renders", path: stagingThumb },
    };
    const r = await finalizeAiVideoClipJob({
      projectId: PROJECT,
      videoJobId: JOB,
      leaseOwner: JOB,
      leaseSupabase: {} as never,
      subtitlesBurnInRequested: false,
      jobInputFingerprint: fingerprintForSpec(baseSpec()),
      renewLease: async () => true,
      phase: {
        kind: "needs_final_promotion",
        staging,
        renderSpec: persistedSpec(),
        debug: {},
        cleanupLocal: async () => undefined,
      },
      storage,
      persistArtifacts: async () => true,
      sendCallback: async () => {
        callbacks += 1;
      },
    });
    assert.equal(r.status, "completed");
    assert.equal(callbacks, 1);
    assert.ok(removed >= 1);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

await check("24) no runway remote in 11b suite", () => {
  const self = readFileSync(
    join(process.cwd(), "scripts/check-ai-video-worker-integration-11b.ts"),
    "utf8",
  );
  assert.doesNotMatch(self, /runway\.ml/i);
  assert.doesNotMatch(self, /createClient\(/);
});

await check("23) finalize gates persist before callback", () => {
  const src = readFileSync(
    join(process.cwd(), "video-worker/finalizeAiVideoClipJob.ts"),
    "utf8",
  );
  const persistIdx = src.indexOf("const persisted = await persist");
  const callbackIdx = src.indexOf("await args.sendCallback", persistIdx);
  assert.ok(persistIdx > 0 && callbackIdx > persistIdx);
  assert.match(src, /if \(!persisted\)/);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
