/**
 * Scene video executor (Step 9) — offline fake gateway tests.
 * npm run check:scene-video-executor
 *
 * No Runway / Supabase / paid / network calls.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildSceneVideoGenerationPlan } from "@/lib/scene-video-plan";
import {
  executeSceneVideoPlan,
  isSceneVideoGenerationEnabled,
  hasRunwayApiSecret,
  buildSceneVideoClientRequestId,
  SCENE_VIDEO_GENERATION_FLAG,
  normalizeSceneVideoPollIntervalMs,
  maxSceneVideoPollIterations,
  RUNWAY_VIDEO_DEFAULT_POLL_INTERVAL_MS,
  type SceneVideoAttemptGateway,
  type ExecuteSceneVideoPlanInput,
} from "@/lib/scene-video-executor";
import type { SceneVideoAttemptView } from "@/lib/scene-video-attempts";
import { sceneVideoClipSchema } from "@/lib/video-engine/schemas/sceneVideoClipSchema";

let passed = 0;
let failed = 0;

async function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  FAIL ${name}`);
    console.error(`       ${message.replace(/\n/g, "\n       ")}`);
  }
}

const PROJECT = "11111111-1111-4111-8111-111111111111";
const JOB = "33333333-3333-4333-8333-333333333333";

function makePlan(sceneCount = 2) {
  const scenes = Array.from({ length: sceneCount }, (_, i) => ({
    id: `scene-${i + 1}`,
    image_prompt: `Still ${i + 1} owner at desk answering emails`,
    duration_seconds: 4,
    image_bucket: "video-renders",
    image_path: `${PROJECT}/video/${JOB}/scene-${i + 1}.png`,
    motion_prompt: `Subject action for scene ${i + 1}; slow push-in; identity stable; no lip-sync.`,
  }));
  return buildSceneVideoGenerationPlan({ scenes, dryRun: true });
}

function view(partial: Partial<SceneVideoAttemptView> & Pick<
  SceneVideoAttemptView,
  "id" | "sceneId" | "clientRequestId" | "status"
>): SceneVideoAttemptView {
  return {
    projectId: PROJECT,
    videoJobId: JOB,
    parentAttemptId: null,
    sourceImageBucket: "video-renders",
    sourceImagePath: "p.png",
    motionPrompt: "m",
    provider: "runway",
    model: "gen4_turbo",
    durationSeconds: 4,
    ratio: "720:1280",
    seed: null,
    providerTaskId: null,
    failureCode: null,
    errorMessage: null,
    estimatedCredits: 20,
    estimatedCostUsd: 0.2,
    createdAt: "2026-01-01T00:00:00.000Z",
    submittedAt: null,
    startedAt: null,
    completedAt: null,
    updatedAt: "2026-01-01T00:00:00.000Z",
    generationDurationMs: null,
    outputBucket: null,
    outputPath: null,
    outputDurationSeconds: null,
    outputHasAudio: null,
    providerMetadata: null,
    reusedExistingRequest: false,
    ...partial,
  };
}

function succeededView(
  sceneId: string,
  clientRequestId: string,
  attemptId: string,
): SceneVideoAttemptView {
  return view({
    id: attemptId,
    sceneId,
    clientRequestId,
    status: "succeeded",
    providerTaskId: "task-1",
    outputBucket: "video-renders",
    outputPath: `${PROJECT}/scene-video-attempts/${attemptId}/output.mp4`,
    outputDurationSeconds: 4.1,
    outputHasAudio: true,
    reusedExistingRequest: true,
  });
}

function makeGateway(opts?: {
  existing?: Map<string, SceneVideoAttemptView>;
  create?: SceneVideoAttemptGateway["create"];
  sync?: SceneVideoAttemptGateway["sync"];
}) {
  let createCalls = 0;
  let syncCalls = 0;
  const createOrder: string[] = [];
  const existing = opts?.existing ?? new Map<string, SceneVideoAttemptView>();

  const gateway: SceneVideoAttemptGateway = {
    async getByClientRequestId(id) {
      return existing.get(id) ?? null;
    },
    async create(input) {
      createCalls += 1;
      createOrder.push(input.sceneId);
      if (opts?.create) return opts.create(input);
      const id = `att-${input.sceneId}`;
      const submitted = view({
        id,
        sceneId: input.sceneId,
        clientRequestId: input.clientRequestId,
        status: "submitted",
        providerTaskId: `task-${input.sceneId}`,
        reusedExistingRequest: false,
        sourceImageBucket: input.sourceImageBucket ?? "video-renders",
        sourceImagePath: input.sourceImagePath ?? "p.png",
        estimatedCostUsd: input.estimatedCostUsd ?? 0.2,
      });
      existing.set(input.clientRequestId, submitted);
      return submitted;
    },
    async sync(attemptId) {
      syncCalls += 1;
      if (opts?.sync) return opts.sync(attemptId);
      const found = [...existing.values()].find((v) => v.id === attemptId);
      const sceneId = found?.sceneId ?? "scene-1";
      const clientRequestId = found?.clientRequestId ?? "x";
      const done = succeededView(sceneId, clientRequestId, attemptId);
      if (found) existing.set(found.clientRequestId, done);
      return { ...done, reusedExistingRequest: false };
    },
  };

  return {
    gateway,
    get createCalls() {
      return createCalls;
    },
    get syncCalls() {
      return syncCalls;
    },
    createOrder,
    existing,
  };
}

function paidDeps(gateway: SceneVideoAttemptGateway) {
  return {
    gateway,
    isGenerationEnabled: true,
    hasApiKey: true,
    pollIntervalMs: 50,
    pollTimeoutMs: 5_000,
    sleep: async () => undefined,
  };
}

function baseInput(
  plan = makePlan(2),
  extra?: Partial<ExecuteSceneVideoPlanInput>,
): ExecuteSceneVideoPlanInput {
  return {
    projectId: PROJECT,
    videoJobId: JOB,
    plan,
    maxBudgetUsd: 10,
    confirmPaidRun: true,
    ...extra,
  };
}

console.log("check:scene-video-executor");

await check("1) feature flag default is false", () => {
  assert.equal(SCENE_VIDEO_GENERATION_FLAG, "SCENE_VIDEO_GENERATION_ENABLED");
  assert.equal(isSceneVideoGenerationEnabled({}), false);
  assert.equal(
    isSceneVideoGenerationEnabled({ SCENE_VIDEO_GENERATION_ENABLED: "false" }),
    false,
  );
  assert.equal(
    isSceneVideoGenerationEnabled({ SCENE_VIDEO_GENERATION_ENABLED: "true" }),
    true,
  );
  assert.equal(hasRunwayApiSecret({}), false);
  const example = readFileSync(join(process.cwd(), ".env.example"), "utf8");
  assert.match(example, /SCENE_VIDEO_GENERATION_ENABLED=false/);
});

await check("2) missing confirmPaidRun blocks without create", async () => {
  const fake = makeGateway();
  const result = await executeSceneVideoPlan(
    { ...baseInput(), confirmPaidRun: false },
    paidDeps(fake.gateway),
  );
  assert.equal(result.status, "blocked");
  assert.equal(result.blockedReason, "paid_run_not_confirmed");
  assert.equal(fake.createCalls, 0);
  assert.equal(result.skippedCount, 2);
});

await check("3) missing API key blocks", async () => {
  const fake = makeGateway();
  const result = await executeSceneVideoPlan(baseInput(), {
    ...paidDeps(fake.gateway),
    hasApiKey: false,
  });
  assert.equal(result.status, "blocked");
  assert.equal(result.blockedReason, "api_key_missing");
  assert.equal(fake.createCalls, 0);
});

await check("3b) feature flag off blocks even with key + confirm", async () => {
  const fake = makeGateway();
  const result = await executeSceneVideoPlan(baseInput(), {
    ...paidDeps(fake.gateway),
    isGenerationEnabled: false,
  });
  assert.equal(result.status, "blocked");
  assert.equal(result.blockedReason, "generation_disabled");
  assert.equal(fake.createCalls, 0);
});

await check("4) invalid or exceeded budget blocks", async () => {
  const fake = makeGateway();
  for (const maxBudgetUsd of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const result = await executeSceneVideoPlan(
      baseInput(makePlan(2), { maxBudgetUsd }),
      paidDeps(fake.gateway),
    );
    assert.equal(result.status, "blocked", String(maxBudgetUsd));
    assert.equal(result.blockedReason, "budget_invalid");
  }
  const over = await executeSceneVideoPlan(
    baseInput(makePlan(2), { maxBudgetUsd: 0.01 }),
    paidDeps(fake.gateway),
  );
  assert.equal(over.status, "blocked");
  assert.equal(over.blockedReason, "budget_exceeded");
  assert.equal(fake.createCalls, 0);
});

await check("5-6) preflight error creates no attempt and no provider call", async () => {
  const fake = makeGateway();
  const plan = makePlan(1);
  plan.items[0]!.preparable = false;
  plan.preparableSceneCount = 0;
  plan.unpreparableSceneCount = 1;
  plan.unpreparableSceneIds = [plan.items[0]!.sceneId];
  const result = await executeSceneVideoPlan(
    baseInput(plan),
    paidDeps(fake.gateway),
  );
  assert.equal(result.status, "blocked");
  assert.equal(result.blockedReason, "unpreparable_scenes");
  assert.equal(fake.createCalls, 0);
  assert.equal(fake.syncCalls, 0);
});

await check("5b) duplicate scene ids preflight", async () => {
  const fake = makeGateway();
  const plan = makePlan(2);
  plan.items[1]!.sceneId = plan.items[0]!.sceneId;
  const result = await executeSceneVideoPlan(
    baseInput(plan),
    paidDeps(fake.gateway),
  );
  assert.equal(result.status, "blocked");
  assert.equal(result.blockedReason, "duplicate_scene_id");
  assert.equal(fake.createCalls, 0);
});

await check("7) two valid scenes processed sequentially", async () => {
  const fake = makeGateway();
  const result = await executeSceneVideoPlan(
    baseInput(makePlan(2)),
    paidDeps(fake.gateway),
  );
  assert.equal(result.status, "completed");
  assert.deepEqual(fake.createOrder, ["scene-1", "scene-2"]);
  assert.equal(fake.createCalls, 2);
  assert.equal(result.newlyCompletedCount, 2);
  assert.equal(result.reusedCount, 0);
  assert.ok(result.newlyInitiatedProviderCostUsd > 0);
  assert.equal(result.scenes[0]!.outcome, "completed");
  assert.equal(result.scenes[1]!.outcome, "completed");
});

await check("8+17) completed attempt reused without paid guards", async () => {
  const plan = makePlan(1);
  const clientRequestId = buildSceneVideoClientRequestId({
    videoJobId: JOB,
    material: plan.items[0]!.idempotencyMaterial,
  });
  const existing = new Map<string, SceneVideoAttemptView>([
    [
      clientRequestId,
      succeededView("scene-1", clientRequestId, "att-scene-1"),
    ],
  ]);
  const fake = makeGateway({ existing });
  const result = await executeSceneVideoPlan(
    {
      ...baseInput(plan),
      confirmPaidRun: false,
      maxBudgetUsd: 0.01,
    },
    {
      gateway: fake.gateway,
      isGenerationEnabled: false,
      hasApiKey: false,
      pollIntervalMs: 0,
      pollTimeoutMs: 5_000,
      sleep: async () => undefined,
    },
  );
  assert.equal(result.status, "completed");
  assert.equal(fake.createCalls, 0);
  assert.equal(fake.syncCalls, 0);
  assert.equal(result.reusedCount, 1);
  assert.equal(result.newlyInitiatedProviderCostUsd, 0);
  assert.ok(result.scenes[0]!.clip);
});

await check("8+17b) completed attempt reused with paid deps (regression)", async () => {
  const plan = makePlan(1);
  const clientRequestId = buildSceneVideoClientRequestId({
    videoJobId: JOB,
    material: plan.items[0]!.idempotencyMaterial,
  });
  const existing = new Map<string, SceneVideoAttemptView>([
    [
      clientRequestId,
      succeededView("scene-1", clientRequestId, "att-scene-1"),
    ],
  ]);
  const fake = makeGateway({ existing });
  const result = await executeSceneVideoPlan(
    baseInput(plan),
    paidDeps(fake.gateway),
  );
  assert.equal(result.status, "completed");
  assert.equal(fake.createCalls, 0);
  assert.equal(fake.syncCalls, 0);
  assert.equal(result.reusedCount, 1);
  assert.equal(result.newlyCompletedCount, 0);
  assert.equal(result.newlyInitiatedProviderCostUsd, 0);
  assert.ok(result.scenes[0]!.clip);
  assert.equal(
    result.scenes[0]!.clip!.path,
    existing.get(clientRequestId)!.outputPath,
  );
});

await check("9) in-progress attempt does not POST again", async () => {
  const plan = makePlan(1);
  const clientRequestId = buildSceneVideoClientRequestId({
    videoJobId: JOB,
    material: plan.items[0]!.idempotencyMaterial,
  });
  const existing = new Map<string, SceneVideoAttemptView>([
    [
      clientRequestId,
      view({
        id: "att-open",
        sceneId: "scene-1",
        clientRequestId,
        status: "submitted",
        providerTaskId: "existing-task",
        reusedExistingRequest: true,
      }),
    ],
  ]);
  const fake = makeGateway({ existing });
  const result = await executeSceneVideoPlan(
    baseInput(plan),
    paidDeps(fake.gateway),
  );
  assert.equal(result.status, "completed");
  assert.equal(fake.createCalls, 0);
  assert.ok(fake.syncCalls >= 1);
  assert.equal(result.newlyInitiatedProviderCostUsd, 0);
  assert.equal(result.scenes[0]!.outcome, "completed");
});

await check("10-11) stable client request id; prompt/image change it", () => {
  const plan = makePlan(1);
  const a = buildSceneVideoClientRequestId({
    videoJobId: JOB,
    material: plan.items[0]!.idempotencyMaterial,
  });
  const b = buildSceneVideoClientRequestId({
    videoJobId: JOB,
    material: plan.items[0]!.idempotencyMaterial,
  });
  assert.equal(a, b);
  assert.match(
    a,
    /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
  const changedPrompt = buildSceneVideoClientRequestId({
    videoJobId: JOB,
    material: { ...plan.items[0]!.idempotencyMaterial, motionPrompt: "other" },
  });
  assert.notEqual(a, changedPrompt);
  const changedImage = buildSceneVideoClientRequestId({
    videoJobId: JOB,
    material: {
      ...plan.items[0]!.idempotencyMaterial,
      sourceImagePath: "other.png",
    },
  });
  assert.notEqual(a, changedImage);
});

await check("12) definitive 4xx ends failed", async () => {
  const fake = makeGateway({
    async create() {
      throw new Error("http 400");
    },
  });
  const result = await executeSceneVideoPlan(
    baseInput(makePlan(2)),
    paidDeps(fake.gateway),
  );
  assert.equal(result.status, "stopped");
  assert.equal(result.scenes[0]!.outcome, "failed");
  assert.equal(result.scenes[1]!.outcome, "skipped");
  assert.equal(fake.createCalls, 1);
  assert.equal(result.failedCount, 1);
});

await check("13-14) submission_unknown stops later scenes", async () => {
  const fake = makeGateway({
    async create() {
      throw new Error("submission_unknown");
    },
  });
  const result = await executeSceneVideoPlan(
    baseInput(makePlan(2)),
    paidDeps(fake.gateway),
  );
  assert.equal(result.status, "needs_review");
  assert.equal(result.scenes[0]!.outcome, "unresolved");
  assert.equal(result.scenes[0]!.attemptStatus, "submission_unknown");
  assert.equal(result.scenes[1]!.outcome, "skipped");
  assert.equal(fake.createCalls, 1);
  assert.equal(result.unresolvedCount, 1);
});

await check("15) first scene error stops second", async () => {
  const fake = makeGateway({
    async create() {
      return view({
        id: "att-fail",
        sceneId: "scene-1",
        clientRequestId: "55555555-5555-4555-8555-555555555555",
        status: "failed",
        errorMessage: "provider failed",
        reusedExistingRequest: false,
      });
    },
  });
  const result = await executeSceneVideoPlan(
    baseInput(makePlan(2)),
    paidDeps(fake.gateway),
  );
  assert.equal(result.status, "stopped");
  assert.equal(result.scenes[0]!.outcome, "failed");
  assert.equal(result.scenes[1]!.outcome, "skipped");
  assert.equal(fake.createCalls, 1);
});

await check("16) success converts to valid SceneVideoClip", async () => {
  const fake = makeGateway();
  const result = await executeSceneVideoPlan(
    baseInput(makePlan(1)),
    paidDeps(fake.gateway),
  );
  assert.equal(result.status, "completed");
  const clip = result.scenes[0]!.clip;
  assert.ok(clip);
  const parsed = sceneVideoClipSchema.safeParse(clip);
  assert.equal(parsed.success, true);
  assert.equal(clip!.bucket, "video-renders");
  assert.ok(clip!.path?.includes("scene-video-attempts"));
  assert.equal(clip!.generation_attempt_id, "att-scene-1");
});

await check("18) rerun budget excludes reused clips", async () => {
  const plan = makePlan(2);
  const id1 = buildSceneVideoClientRequestId({
    videoJobId: JOB,
    material: plan.items[0]!.idempotencyMaterial,
  });
  const existing = new Map<string, SceneVideoAttemptView>([
    [id1, succeededView("scene-1", id1, "att-scene-1")],
  ]);
  const fake = makeGateway({ existing });
  const remaining = plan.items[1]!.estimatedCostUsd;
  const result = await executeSceneVideoPlan(
    baseInput(plan, { maxBudgetUsd: remaining }),
    paidDeps(fake.gateway),
  );
  assert.equal(result.status, "completed");
  assert.equal(result.reusedCount, 1);
  assert.equal(result.newlyCompletedCount, 1);
  assert.equal(fake.createCalls, 1);
  assert.equal(fake.createOrder[0], "scene-2");
  assert.ok(result.maxNewCostUsd <= remaining + 1e-9);
  assert.ok(result.existingCompletedCostUsd > 0);
  assert.ok(
    result.theoreticalTotalCostUsd >
      result.maxNewCostUsd - 1e-9 + result.existingCompletedCostUsd - 1e-6,
  );
});

await check("9B-exec) in-progress with provider task not in maxNewCostUsd", async () => {
  const plan = makePlan(2);
  const id1 = buildSceneVideoClientRequestId({
    videoJobId: JOB,
    material: plan.items[0]!.idempotencyMaterial,
  });
  const existing = new Map<string, SceneVideoAttemptView>([
    [
      id1,
      view({
        id: "att-open",
        sceneId: "scene-1",
        clientRequestId: id1,
        status: "submitted",
        providerTaskId: "existing-task",
        reusedExistingRequest: true,
      }),
    ],
  ]);
  const fake = makeGateway({ existing });
  const result = await executeSceneVideoPlan(
    baseInput(plan, { maxBudgetUsd: plan.items[1]!.estimatedCostUsd }),
    paidDeps(fake.gateway),
  );
  assert.equal(result.status, "completed");
  assert.equal(result.maxNewCostUsd, plan.items[1]!.estimatedCostUsd);
  assert.ok(result.alreadyCommittedCostUsd >= plan.items[0]!.estimatedCostUsd);
  assert.equal(result.newlyInitiatedProviderCostUsd, plan.items[1]!.estimatedCostUsd);
});

await check("9B-exec) validation error before POST does not count initiated cost", async () => {
  const fake = makeGateway({
    async create() {
      throw new Error("motion_prompt_required");
    },
  });
  const result = await executeSceneVideoPlan(
    baseInput(makePlan(1)),
    paidDeps(fake.gateway),
  );
  assert.equal(result.status, "stopped");
  assert.equal(result.newlyInitiatedProviderCostUsd, 0);
});

await check("9B-exec) submission_unknown counts initiated but blocks next scene", async () => {
  const fake = makeGateway({
    async create(input) {
      return view({
        id: "att-u",
        sceneId: input.sceneId,
        clientRequestId: input.clientRequestId,
        status: "submission_unknown",
        errorMessage: "ambiguous",
        reusedExistingRequest: false,
      });
    },
  });
  const planTwo = makePlan(2);
  const result = await executeSceneVideoPlan(
    baseInput(planTwo),
    paidDeps(fake.gateway),
  );
  assert.equal(result.status, "needs_review");
  assert.equal(
    result.newlyInitiatedProviderCostUsd,
    planTwo.items[0]!.estimatedCostUsd,
  );
  assert.equal(result.scenes[1]!.outcome, "skipped");
});

await check("9B-exec) pending task times out as unresolved; next scene skipped", async () => {
  const plan = makePlan(2);
  const clientRequestId = buildSceneVideoClientRequestId({
    videoJobId: JOB,
    material: plan.items[0]!.idempotencyMaterial,
  });
  const existing = new Map<string, SceneVideoAttemptView>([
    [
      clientRequestId,
      view({
        id: "att-pending",
        sceneId: "scene-1",
        clientRequestId,
        status: "pending",
        providerTaskId: "task-pending",
        reusedExistingRequest: true,
      }),
    ],
  ]);
  let clock = 0;
  const fake = makeGateway({
    existing,
    async sync(attemptId) {
      return view({
        id: attemptId,
        sceneId: "scene-1",
        clientRequestId,
        status: "pending",
        providerTaskId: "task-pending",
        reusedExistingRequest: true,
      });
    },
  });
  const result = await executeSceneVideoPlan(baseInput(plan), {
    ...paidDeps(fake.gateway),
    pollIntervalMs: 100,
    pollTimeoutMs: 250,
    now: () => new Date(clock),
    sleep: async (ms) => {
      clock += ms;
    },
  });
  assert.equal(result.scenes[0]!.outcome, "unresolved");
  assert.equal(result.scenes[1]!.outcome, "skipped");
  assert.equal(result.status, "needs_review");
  assert.equal(result.newlyInitiatedProviderCostUsd, 0);
});

await check("9C-exec) default poll interval is positive", () => {
  assert.equal(RUNWAY_VIDEO_DEFAULT_POLL_INTERVAL_MS > 0, true);
  assert.equal(
    normalizeSceneVideoPollIntervalMs(undefined),
    RUNWAY_VIDEO_DEFAULT_POLL_INTERVAL_MS,
  );
  assert.equal(normalizeSceneVideoPollIntervalMs(0), RUNWAY_VIDEO_DEFAULT_POLL_INTERVAL_MS);
  assert.equal(normalizeSceneVideoPollIntervalMs(-5), RUNWAY_VIDEO_DEFAULT_POLL_INTERVAL_MS);
});

await check("9C-exec) frozen clock cannot infinite poll loop", async () => {
  const plan = makePlan(1);
  const clientRequestId = buildSceneVideoClientRequestId({
    videoJobId: JOB,
    material: plan.items[0]!.idempotencyMaterial,
  });
  const existing = new Map<string, SceneVideoAttemptView>([
    [
      clientRequestId,
      view({
        id: "att-pending",
        sceneId: "scene-1",
        clientRequestId,
        status: "pending",
        providerTaskId: "task-pending",
        reusedExistingRequest: true,
      }),
    ],
  ]);
  let syncCalls = 0;
  const frozen = new Date("2026-06-01T12:00:00.000Z");
  const interval = 100;
  const timeoutMs = 500;
  const maxIter = maxSceneVideoPollIterations(timeoutMs, interval);
  const fake = makeGateway({
    existing,
    async sync(attemptId) {
      syncCalls += 1;
      return view({
        id: attemptId,
        sceneId: "scene-1",
        clientRequestId,
        status: "pending",
        providerTaskId: "task-pending",
        reusedExistingRequest: true,
      });
    },
  });
  const result = await executeSceneVideoPlan(baseInput(plan), {
    ...paidDeps(fake.gateway),
    pollIntervalMs: interval,
    pollTimeoutMs: timeoutMs,
    now: () => frozen,
    sleep: async () => undefined,
  });
  assert.equal(result.scenes[0]!.outcome, "unresolved");
  assert.ok(syncCalls <= maxIter + 1, `syncCalls=${syncCalls} max=${maxIter + 1}`);
});

await check("9B-exec) new create still blocked without all paid guards", async () => {
  const fake = makeGateway();
  const blocked = await executeSceneVideoPlan(baseInput(makePlan(1)), {
    gateway: fake.gateway,
    isGenerationEnabled: false,
    hasApiKey: true,
    pollIntervalMs: 0,
    pollTimeoutMs: 5_000,
    sleep: async () => undefined,
  });
  assert.equal(blocked.status, "blocked");
  assert.equal(fake.createCalls, 0);
});

await check("19) no real network / paid calls; jobRunner uses ai phase seam", () => {
  const runner = readFileSync(
    join(process.cwd(), "video-worker/jobRunner.ts"),
    "utf8",
  );
  assert.doesNotMatch(runner, /scene-video-executor/);
  assert.match(runner, /aiVideoClipJobPhase/);
  const n8nHits = readFileSync(
    join(process.cwd(), "package.json"),
    "utf8",
  );
  assert.doesNotMatch(n8nHits, /executeSceneVideoPlan/);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
