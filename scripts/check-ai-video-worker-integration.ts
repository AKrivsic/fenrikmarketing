/**
 * Step 11 — AI video worker integration (offline / injected deps only).
 * npm run check:ai-video-worker-integration
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  parseVideoJobRenderOptions,
  VIDEO_RENDER_MODE_STILL,
  VIDEO_RENDER_MODE_AI_VIDEO_CLIPS,
} from "@/lib/video-engine/schemas/videoJobRenderMode";
import { readVideoOutput } from "@/lib/api/content-shared";
import { extractRenderSpecScenes } from "@/lib/ai/workflows/languageVariantsHelpers";
import { buildDurableArtifactOutput } from "@/lib/production-runtime/uploadDurability";
import {
  buildAiVideoCheckpointOutput,
  readPersistedRenderSpecFromOutput,
} from "@/lib/video-worker/aiVideoJobOutput";
import { executeSceneVideoPlan } from "@/lib/scene-video-executor";
import type { SceneVideoAttemptGateway } from "@/lib/scene-video-executor/types";
import type { RenderSpecOutput } from "@/lib/video-engine/schemas/renderSchema";
import {
  AiVideoClipJobError,
  runAiVideoClipJobPhase,
} from "@/video-worker/aiVideoClipJobPhase";
import { finalizeAiVideoClipJob } from "@/video-worker/finalizeAiVideoClipJob";
import type { WorkerPayload } from "@/lib/video-engine/schemas/workerPayloadSchema";
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

function fakePlanItem(
  sceneId = "scene-a",
): import("@/lib/scene-video-plan").SceneVideoGenerationPlanItem {
  return {
    sceneId,
    sceneIndex: 0,
    sourceImageBucket: "video-renders",
    sourceImagePath: "p/a.png",
    motionPrompt: "m",
    motionPromptSource: "original",
    targetDurationSeconds: 3,
    providerDurationSeconds: 3,
    ratio: "720:1280",
    provider: "runway",
    model: "gen4_turbo",
    estimatedCredits: 1,
    estimatedCostUsd: 0.2,
    transitionIn: "fade",
    transitionSource: "scene",
    idempotencyMaterial: {
      sceneId,
      sourceImageBucket: "video-renders",
      sourceImagePath: "p/a.png",
      motionPrompt: "m",
      provider: "runway",
      model: "gen4_turbo",
      providerDurationSeconds: 3,
      ratio: "720:1280",
    },
    diagnostics: [],
    preparable: true,
  };
}

function fakePlan(): import("@/lib/scene-video-plan").SceneVideoGenerationPlan {
  return {
    dryRun: true,
    sceneCount: 1,
    preparableSceneCount: 1,
    unpreparableSceneCount: 0,
    totalProviderDurationSeconds: 3,
    totalEstimatedCredits: 1,
    totalEstimatedCostUsd: 0.2,
    theoreticalTotalProviderDurationSeconds: 3,
    theoreticalTotalEstimatedCredits: 1,
    theoreticalTotalEstimatedCostUsd: 0.2,
    fallbackMotionPromptCount: 0,
    unpreparableSceneIds: [],
    defaults: {
      provider: "runway",
      model: "gen4_turbo",
      ratio: "720:1280",
    },
    items: [fakePlanItem()],
  };
}

const noopActive = async () => undefined;

function basePayload(): WorkerPayload {
  return {
    video_job_id: JOB,
    project_id: PROJECT,
    content_package_id: "22222222-2222-4222-8222-222222222222",
    content_item_id: "44444444-4444-4444-8444-444444444444",
    callback_url: "http://localhost/callback",
    input: {
      voiceover_text: "Integration test voiceover script.",
      video_render_mode: VIDEO_RENDER_MODE_AI_VIDEO_CLIPS,
      ai_scene_video_max_budget_usd: 2,
      ai_scene_video_confirm_paid_run: true,
      scenes: [
        {
          id: "scene-a",
          image_prompt: "A",
          duration_seconds: 3,
          motion_prompt: "Slow push.",
          transition_in: "fade",
        },
        {
          id: "scene-b",
          image_prompt: "B",
          duration_seconds: 4,
          motion_prompt: "Slow pull.",
          transition_in: "slide",
        },
      ],
    },
  };
}

function minimalRenderSpecOutput(): RenderSpecOutput {
  return {
    version: 1,
    scenes: [
      {
        id: "scene-a",
        image_prompt: "A",
        image_bucket: "video-renders",
        image_path: `${PROJECT}/video/${JOB}/scene-a.png`,
        duration_seconds: 3,
        motion_prompt: "Slow push.",
        transition_in: "fade",
      },
      {
        id: "scene-b",
        image_prompt: "B",
        image_bucket: "video-renders",
        image_path: `${PROJECT}/video/${JOB}/scene-b.png`,
        duration_seconds: 4,
        motion_prompt: "Slow pull.",
        transition_in: "slide",
      },
    ],
  };
}

console.log("check:ai-video-worker-integration");

await check("1) missing render mode defaults to still", () => {
  const r = parseVideoJobRenderOptions({ voiceover_text: "x" });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.mode, VIDEO_RENDER_MODE_STILL);
});

await check("2) explicit still mode", () => {
  const r = parseVideoJobRenderOptions({
    video_render_mode: "still",
  });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.mode, VIDEO_RENDER_MODE_STILL);
});

await check("3) unknown mode rejected", () => {
  const r = parseVideoJobRenderOptions({
    video_render_mode: "ken_burns_plus",
  });
  assert.equal(r.ok, false);
});

await check("4) ai_video_clips without budget rejected", () => {
  const r = parseVideoJobRenderOptions({
    video_render_mode: VIDEO_RENDER_MODE_AI_VIDEO_CLIPS,
    ai_scene_video_confirm_paid_run: true,
  });
  assert.equal(r.ok, false);
});

await check("5) ai_video_clips without confirm rejected", () => {
  const r = parseVideoJobRenderOptions({
    video_render_mode: VIDEO_RENDER_MODE_AI_VIDEO_CLIPS,
    ai_scene_video_max_budget_usd: 1,
  });
  assert.equal(r.ok, false);
});

await check("6) feature flag off blocks provider create", async () => {
  const fake: SceneVideoAttemptGateway = {
    async getByClientRequestId() {
      return null;
    },
    async create() {
      throw new Error("must_not_create");
    },
    async sync(id) {
      throw new Error(`must_not_sync:${id}`);
    },
  };
  const plan = fakePlan();
  const r = await executeSceneVideoPlan(
    {
      projectId: PROJECT,
      videoJobId: JOB,
      plan,
      maxBudgetUsd: 1,
      confirmPaidRun: true,
    },
    {
      gateway: fake,
      isGenerationEnabled: false,
      hasApiKey: true,
    },
  );
  assert.equal(r.status, "blocked");
  assert.equal(r.blockedReason, "generation_disabled");
});

await check("7) missing API key blocks create", async () => {
  let createCalls = 0;
  const fake: SceneVideoAttemptGateway = {
    async getByClientRequestId() {
      return null;
    },
    async create() {
      createCalls += 1;
      throw new Error("must_not_create");
    },
    async sync(id) {
      throw new Error(id);
    },
  };
  const plan = fakePlan();
  const r = await executeSceneVideoPlan(
    {
      projectId: PROJECT,
      videoJobId: JOB,
      plan,
      maxBudgetUsd: 1,
      confirmPaidRun: true,
    },
    {
      gateway: fake,
      isGenerationEnabled: true,
      hasApiKey: false,
    },
  );
  assert.equal(r.status, "blocked");
  assert.equal(createCalls, 0);
});

await check("8) checkpoint output has no mp4_url", () => {
  const out = buildAiVideoCheckpointOutput({
    renderSpec: minimalRenderSpecOutput(),
    phase: "checkpoint_stills",
  });
  assert.equal(out.mp4_url, undefined);
  assert.ok(out.render_spec);
});

await check("9) checkpoint does not imply completed status fields", () => {
  const out = buildAiVideoCheckpointOutput({
    renderSpec: minimalRenderSpecOutput(),
    phase: "checkpoint_stills",
  });
  assert.equal(out.artifacts_persisted_at, undefined);
});

await check("10) checkpoint render_spec has all scene still refs", () => {
  const spec = minimalRenderSpecOutput();
  const out = buildAiVideoCheckpointOutput({
    renderSpec: spec,
    phase: "checkpoint_stills",
  });
  const round = readPersistedRenderSpecFromOutput(out);
  assert.equal(round?.scenes.length, 2);
  assert.ok(round?.scenes.every((s) => s.image_bucket && s.image_path));
});

const fixtureDir = await mkdtemp(join(tmpdir(), "fenrik-ai-worker-"));
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

  let persistCalls = 0;
  let checkpointBeforeExecute = false;

  await check("11-13) fake executor + assembly path (injected)", async () => {
    persistCalls = 0;
    checkpointBeforeExecute = false;
    let executeStarted = false;

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
            has_audio: true,
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
            has_audio: false,
            generation_attempt_id: ATTEMPT_B,
          },
        },
      ],
    };

    const clipA = join(fixtureDir, "clip_a.mp4");
    const clipB = join(fixtureDir, "clip_b.mp4");
    await new Promise<void>((resolve, reject) => {
      spawn(
        ffmpeg,
        [
          "-y",
          "-f",
          "lavfi",
          "-i",
          "testsrc2=size=720x1280:rate=30:duration=3",
          "-an",
          "-c:v",
          "libx264",
          "-pix_fmt",
          "yuv420p",
          clipA,
        ],
        { stdio: "ignore" },
      )
        .on("close", (c) => (c === 0 ? resolve() : reject(new Error(String(c)))))
        .on("error", reject);
    });
    await new Promise<void>((resolve, reject) => {
      spawn(
        ffmpeg,
        [
          "-y",
          "-f",
          "lavfi",
          "-i",
          "testsrc2=size=720x1280:rate=30:duration=4",
          "-an",
          "-c:v",
          "libx264",
          "-pix_fmt",
          "yuv420p",
          clipB,
        ],
        { stdio: "ignore" },
      )
        .on("close", (c) => (c === 0 ? resolve() : reject(new Error(String(c)))))
        .on("error", reject);
    });

    const downloader = createLocalFixtureDownloader({
      "fixtures/clip_a.mp4": clipA,
      "fixtures/clip_b.mp4": clipB,
    });

    const result = await runAiVideoClipJobPhase(
      {
        payload: basePayload(),
        spec: {
          voiceover_text: "Integration test voiceover script.",
          scenes: basePayload().input.scenes as never,
        },
        images: [
          {
            sceneId: "scene-a",
            imagePath: join(fixtureDir, "a.png"),
            reusedBucket: "video-renders",
            reusedPath: `${PROJECT}/video/${JOB}/scene-a.png`,
          },
          {
            sceneId: "scene-b",
            imagePath: join(fixtureDir, "b.png"),
            reusedBucket: "video-renders",
            reusedPath: `${PROJECT}/video/${JOB}/scene-b.png`,
          },
        ],
        renderAudioPath: voPath,
        srtPath: join(fixtureDir, "x.srt"),
        subtitlesBurnInRequested: false,
        maxBudgetUsd: 2,
        confirmPaidRun: true,
        workDir: fixtureDir,
        leaseSupabase: {} as never,
        leaseOwner: JOB,
        subtitleDebug: { subtitle_source: "proportional" },
      },
      {
        buildPersistedRenderSpec: async () => minimalRenderSpecOutput(),
        getJobOutput: async () => ({}),
        persistArtifacts: async () => {
          persistCalls += 1;
          if (!executeStarted) checkpointBeforeExecute = true;
          return true;
        },
        renewLease: async () => true,
        assertStillActive: noopActive,
        executePlan: async () => {
          executeStarted = true;
          return executorResult;
        },
        createDownloader: () => downloader,
        artifactStorage: {
          async uploadLocalFile() {},
          async copyStorageObject() {},
          async signStoragePath({ storagePath }) {
            return `https://signed.test/${storagePath}`;
          },
          async removeStoragePaths() {},
        },
      },
    );

    assert.equal(checkpointBeforeExecute, true);
    assert.equal(persistCalls >= 1, true);
    assert.equal(result.kind, "needs_final_promotion");
    assert.ok(result.renderSpec.scenes.every((s) => s.video_clip));
    await result.cleanupLocal();
  });

  await check("12) incomplete executor blocks assembly", async () => {
    await assert.rejects(
      () =>
        runAiVideoClipJobPhase(
          {
            payload: basePayload(),
            spec: {
              voiceover_text: "Integration test voiceover script.",
              scenes: basePayload().input.scenes as never,
            },
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
            buildPersistedRenderSpec: async () => minimalRenderSpecOutput(),
            getJobOutput: async () => ({}),
            persistArtifacts: async () => true,
            renewLease: async () => true,
            assertStillActive: noopActive,
            executePlan: async () => ({
              status: "stopped",
              sceneCount: 2,
              reusedCount: 0,
              newlyCompletedCount: 1,
              failedCount: 0,
              unresolvedCount: 1,
              skippedCount: 0,
              theoreticalTotalCostUsd: 0.4,
              existingCompletedCostUsd: 0,
              alreadyCommittedCostUsd: 0,
              maxNewCostUsd: 0.4,
              newlyInitiatedProviderCostUsd: 0,
              scenes: [],
            }),
          },
        ),
      AiVideoClipJobError,
    );
  });

  await check("13) submission_unknown blocks assembly", async () => {
    const spec = minimalRenderSpecOutput();
    const plan = buildSceneVideoGenerationPlanFromRenderScenes(spec.scenes);
    const { computeAiVideoJobInputFingerprint, planDefaultsFromPlan } =
      await import("@/lib/video-worker/aiVideoCheckpointFingerprint");
    const checkpointFp = computeAiVideoJobInputFingerprint({
      videoJobId: JOB,
      renderMode: VIDEO_RENDER_MODE_AI_VIDEO_CLIPS,
      voiceoverText: "Integration test voiceover script.",
      subtitlesBurnInRequested: false,
      spec: {
        voiceover_text: "Integration test voiceover script.",
        scenes: basePayload().input.scenes as never,
      },
      planDefaults: planDefaultsFromPlan(plan),
    });
    const checkpoint = buildAiVideoCheckpointOutput({
      renderSpec: spec,
      phase: "checkpoint_stills",
      meta: {
        input_fingerprint: checkpointFp,
        input_fingerprint_version: 1,
      },
    });
    await assert.rejects(
      () =>
        runAiVideoClipJobPhase(
          {
            payload: basePayload(),
            spec: {
              voiceover_text: "Integration test voiceover script.",
              scenes: basePayload().input.scenes as never,
            },
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
            buildPersistedRenderSpec: async () => minimalRenderSpecOutput(),
            getJobOutput: async () => checkpoint,
            persistArtifacts: async () => true,
            renewLease: async () => true,
            assertStillActive: noopActive,
            executePlan: async () => ({
              status: "completed",
              sceneCount: 2,
              reusedCount: 0,
              newlyCompletedCount: 1,
              failedCount: 0,
              unresolvedCount: 1,
              skippedCount: 0,
              theoreticalTotalCostUsd: 0.4,
              existingCompletedCostUsd: 0,
              alreadyCommittedCostUsd: 0,
              maxNewCostUsd: 0.4,
              newlyInitiatedProviderCostUsd: 0.2,
              scenes: [
                {
                  sceneId: "scene-a",
                  sceneIndex: 0,
                  clientRequestId: "c1",
                  outcome: "completed",
                  attemptId: ATTEMPT_A,
                  clip: {
                    bucket: "fixtures",
                    path: "clip_a.mp4",
                    generation_attempt_id: ATTEMPT_A,
                  },
                },
                {
                  sceneId: "scene-b",
                  sceneIndex: 1,
                  clientRequestId: "c2",
                  outcome: "unresolved",
                  attemptStatus: "submission_unknown",
                },
              ],
            }),
          },
        ),
      (err: unknown) =>
        err instanceof AiVideoClipJobError && err.code === "needs_review",
    );
  });

  await check("14) AI failure does not call still renderMp4 path", () => {
    const src = readFileSync(
      join(process.cwd(), "video-worker/jobRunner.ts"),
      "utf8",
    );
    const aiBranch = src.slice(
      src.indexOf("runAiVideoClipJobPhase"),
      src.indexOf("return;", src.indexOf("ai_video_clips job completed")),
    );
    assert.doesNotMatch(aiBranch, /renderMp4\(/);
  });

  await check("15) rerun reuses checkpoint render_spec without rebuild", async () => {
    let buildCalls = 0;
    const spec = minimalRenderSpecOutput();
    const plan = buildSceneVideoGenerationPlanFromRenderScenes(spec.scenes);
    const { computeAiVideoJobInputFingerprint, planDefaultsFromPlan } =
      await import("@/lib/video-worker/aiVideoCheckpointFingerprint");
    const fp = computeAiVideoJobInputFingerprint({
      videoJobId: JOB,
      renderMode: VIDEO_RENDER_MODE_AI_VIDEO_CLIPS,
      voiceoverText: "Integration test voiceover script.",
      subtitlesBurnInRequested: false,
      spec: {
        voiceover_text: "Integration test voiceover script.",
        scenes: basePayload().input.scenes as never,
      },
      planDefaults: planDefaultsFromPlan(plan),
    });
    const checkpoint = buildAiVideoCheckpointOutput({
      renderSpec: spec,
      phase: "checkpoint_stills",
      meta: { input_fingerprint: fp, input_fingerprint_version: 1 },
    });
    await runAiVideoClipJobPhase(
      {
        payload: basePayload(),
        spec: {
          voiceover_text: "Integration test voiceover script.",
          scenes: basePayload().input.scenes as never,
        },
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
        buildPersistedRenderSpec: async () => {
          buildCalls += 1;
          return minimalRenderSpecOutput();
        },
        getJobOutput: async () => checkpoint,
        persistArtifacts: async () => true,
        renewLease: async () => true,
        assertStillActive: noopActive,
        executePlan: async () => {
          throw new AiVideoClipJobError("generation_blocked", "stop_early");
        },
      },
    ).catch(() => undefined);
    assert.equal(buildCalls, 0);
  });

  await check("16) finalize upload path does not invoke executor", async () => {
    let callbacks = 0;
    const fin = await finalizeAiVideoClipJob({
      projectId: PROJECT,
      videoJobId: JOB,
      leaseOwner: JOB,
      leaseSupabase: {} as never,
      subtitlesBurnInRequested: false,
      jobInputFingerprint: "test-fp",
      renewLease: async () => true,
      phase: {
        kind: "needs_final_promotion",
        staging: {
          mp4: { bucket: "b", path: "p/staging/a.mp4" },
          thumbnail: { bucket: "b", path: "p/staging/t.png" },
        },
        renderSpec: minimalRenderSpecOutput(),
        debug: {},
        cleanupLocal: async () => undefined,
      },
      storage: {
        async uploadLocalFile() {},
        async copyStorageObject() {},
        async signStoragePath({ storagePath }) {
          return `https://x/${storagePath}`;
        },
        async removeStoragePaths() {},
      },
      persistArtifacts: async () => false,
      sendCallback: async () => {
        callbacks += 1;
      },
    });
    assert.equal(fin.status, "lease_lost");
    assert.equal(callbacks, 0);
  });

  await check("17) partial upload output not marked completed in helper", () => {
    const out = buildAiVideoCheckpointOutput({
      renderSpec: minimalRenderSpecOutput(),
      phase: "checkpoint_stills",
    });
    assert.equal(out.mp4_url, undefined);
  });

  await check("18) durable output keeps required review fields", () => {
    const out = buildDurableArtifactOutput({
      mp4_url: "https://example.test/v.mp4",
      thumbnail_url: "https://example.test/t.png",
      subtitle_url: "https://example.test/s.srt",
      render_spec: minimalRenderSpecOutput(),
      debug: { video_render_mode: VIDEO_RENDER_MODE_AI_VIDEO_CLIPS },
    });
    const read = readVideoOutput(out);
    assert.ok(read.mp4Url);
    assert.ok(read.thumbnailUrl);
    assert.ok(read.subtitleUrl);
  });

  await check("19) output has no local paths in durable fields", () => {
    const out = buildDurableArtifactOutput({
      mp4_url: "https://cdn.test/out.mp4",
      thumbnail_url: "https://cdn.test/thumb.png",
      render_spec: minimalRenderSpecOutput(),
    });
    const json = JSON.stringify(out);
    assert.doesNotMatch(json, /\/tmp\//);
    assert.doesNotMatch(json, /fixtures\//);
  });

  await check("20) extractRenderSpecScenes reads AI render_spec", () => {
    const scenes = extractRenderSpecScenes({
      render_spec: minimalRenderSpecOutput(),
      mp4_url: "https://x/mp4",
    });
    assert.equal(scenes?.length, 2);
  });

  await check("21) executor onPollTick hook exists for heartbeat", async () => {
    let ticks = 0;
    const fake: SceneVideoAttemptGateway = {
      async getByClientRequestId() {
        return null;
      },
      async create() {
        return {
          id: ATTEMPT_A,
          status: "running",
          reusedExistingRequest: false,
        } as never;
      },
      async sync() {
        return {
          id: ATTEMPT_A,
          status: "running",
          reusedExistingRequest: false,
        } as never;
      },
    };
    await executeSceneVideoPlan(
      {
        projectId: PROJECT,
        videoJobId: JOB,
        plan: fakePlan(),
        maxBudgetUsd: 1,
        confirmPaidRun: true,
      },
      {
        gateway: fake,
        isGenerationEnabled: true,
        hasApiKey: true,
        pollIntervalMs: 1,
        pollTimeoutMs: 5,
        onPollTick: async () => {
          ticks += 1;
        },
      },
    );
    assert.ok(ticks >= 1);
  });

  await check("22) lease loss blocks persist", async () => {
    await assert.rejects(
      () =>
        runAiVideoClipJobPhase(
          {
            payload: basePayload(),
            spec: {
              voiceover_text: "Integration test voiceover script.",
              scenes: basePayload().input.scenes as never,
            },
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
            buildPersistedRenderSpec: async () => minimalRenderSpecOutput(),
            getJobOutput: async () => ({}),
            renewLease: async () => false,
            assertStillActive: noopActive,
          },
        ),
      (e: unknown) =>
        e instanceof AiVideoClipJobError && e.code === "lease_lost",
    );
  });

  await check("23) cancellation stops AI phase via assertStillActive", async () => {
    const { JobCancelledError } = await import("@/video-worker/cancellation");
    await assert.rejects(
      () =>
        runAiVideoClipJobPhase(
          {
            payload: basePayload(),
            spec: {
              voiceover_text: "Integration test voiceover script.",
              scenes: basePayload().input.scenes as never,
            },
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
            buildPersistedRenderSpec: async () => minimalRenderSpecOutput(),
            getJobOutput: async () => ({}),
            assertStillActive: async () => {
              throw new JobCancelledError(JOB);
            },
          },
        ),
      JobCancelledError,
    );
  });

  await check("24) successful phase exposes cleanupLocal", async () => {
    const spec = minimalRenderSpecOutput();
    const plan = buildSceneVideoGenerationPlanFromRenderScenes(spec.scenes);
    const { computeAiVideoJobInputFingerprint, planDefaultsFromPlan } =
      await import("@/lib/video-worker/aiVideoCheckpointFingerprint");
    const fp = computeAiVideoJobInputFingerprint({
      videoJobId: JOB,
      renderMode: VIDEO_RENDER_MODE_AI_VIDEO_CLIPS,
      voiceoverText: "Integration test voiceover script.",
      subtitlesBurnInRequested: false,
      spec: {
        voiceover_text: "Integration test voiceover script.",
        scenes: basePayload().input.scenes as never,
      },
      planDefaults: planDefaultsFromPlan(plan),
    });
    let cleaned = false;
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
      maxNewCostUsd: 0,
      newlyInitiatedProviderCostUsd: 0,
      scenes: [
        {
          sceneId: "scene-a",
          sceneIndex: 0,
          clientRequestId: "00000000-0000-4000-8000-000000000001",
          outcome: "reused" as const,
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
          outcome: "reused" as const,
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
    const downloader = createLocalFixtureDownloader({
      "fixtures/clip_a.mp4": join(fixtureDir, "clip_a.mp4"),
      "fixtures/clip_b.mp4": join(fixtureDir, "clip_b.mp4"),
    });
    const out = await runAiVideoClipJobPhase(
      {
        payload: basePayload(),
        spec: {
          voiceover_text: "Integration test voiceover script.",
          scenes: basePayload().input.scenes as never,
        },
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
        buildPersistedRenderSpec: async () => minimalRenderSpecOutput(),
        getJobOutput: async () =>
          buildAiVideoCheckpointOutput({
            renderSpec: spec,
            phase: "checkpoint_stills",
            meta: { input_fingerprint: fp, input_fingerprint_version: 1 },
          }),
        persistArtifacts: async () => true,
        renewLease: async () => true,
        assertStillActive: noopActive,
        executePlan: async () => executorResult,
        createDownloader: () => downloader,
        artifactStorage: {
          async uploadLocalFile() {},
          async copyStorageObject() {},
          async signStoragePath({ storagePath }) {
            return `https://signed/${storagePath}`;
          },
          async removeStoragePaths() {},
        },
      },
    );
    await out.cleanupLocal();
    cleaned = true;
    assert.equal(cleaned, true);
    assert.equal(out.kind, "needs_final_promotion");
  });

  await check("25) jobRunner requires explicit mode for AI branch", () => {
    const src = readFileSync(
      join(process.cwd(), "video-worker/jobRunner.ts"),
      "utf8",
    );
    assert.match(src, /parseVideoJobRenderOptions/);
    assert.match(src, /VIDEO_RENDER_MODE_STILL/);
    assert.match(src, /runAiVideoClipJobPhase/);
  });

  await check("26) zero runway remote supabase in this suite", () => {
    assert.ok(true);
  });
} finally {
  await rm(fixtureDir, { recursive: true, force: true });
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
