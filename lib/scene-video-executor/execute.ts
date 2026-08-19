import {
  SCENE_VIDEO_ATTEMPT_TERMINAL_STATUSES,
  createSceneVideoAttempt,
  getSceneVideoAttemptByClientRequestId,
  sceneVideoClipFromAttemptView,
  syncSceneVideoAttempt,
  type SceneVideoAttemptServiceDeps,
  type SceneVideoAttemptView,
} from "@/lib/scene-video-attempts";
import {
  hasRunwayApiSecret,
  isSceneVideoGenerationEnabled,
} from "@/lib/scene-video-executor/constants";
import { buildSceneVideoClientRequestId } from "@/lib/scene-video-executor/clientRequestId";
import {
  isFinitePositiveNumber,
  preflightSceneVideoPlan,
} from "@/lib/scene-video-executor/preflight";
import {
  isSucceededWithOutput,
  providerInitiatedSpendDelta,
  rollupSceneBudget,
  type ProviderInitiatedSpend,
} from "@/lib/scene-video-executor/budget";
import {
  maxSceneVideoPollIterations,
  normalizeSceneVideoPollIntervalMs,
  resolveSceneVideoPollTimeoutMs,
} from "@/lib/scene-video-executor/polling";
import type {
  ExecuteSceneVideoPlanInput,
  ExecuteSceneVideoPlanResult,
  SceneVideoAttemptGateway,
  SceneVideoExecutorDeps,
  SceneVideoExecutorSceneResult,
} from "@/lib/scene-video-executor/types";
import type { SceneVideoGenerationPlanItem } from "@/lib/scene-video-plan";

const IN_PROGRESS_STATUSES = new Set([
  "submitting",
  "submitted",
  "pending",
  "running",
  "downloading",
]);

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function defaultSceneVideoAttemptGateway(
  deps?: SceneVideoAttemptServiceDeps,
): SceneVideoAttemptGateway {
  return {
    getByClientRequestId: (id) =>
      getSceneVideoAttemptByClientRequestId(id, deps),
    create: (input) => createSceneVideoAttempt(input, deps),
    sync: (id) => syncSceneVideoAttempt(id, deps),
  };
}

function emptyResult(
  input: ExecuteSceneVideoPlanInput,
  status: ExecuteSceneVideoPlanResult["status"],
  blockedReason?: string,
): ExecuteSceneVideoPlanResult {
  const sceneCount = input.plan?.sceneCount ?? 0;
  return {
    status,
    blockedReason,
    sceneCount,
    reusedCount: 0,
    newlyCompletedCount: 0,
    failedCount: 0,
    unresolvedCount: 0,
    skippedCount: sceneCount,
    theoreticalTotalCostUsd: input.plan?.theoreticalTotalEstimatedCostUsd ?? 0,
    existingCompletedCostUsd: 0,
    alreadyCommittedCostUsd: 0,
    maxNewCostUsd: input.plan?.totalEstimatedCostUsd ?? 0,
    newlyInitiatedProviderCostUsd: 0,
    scenes: (input.plan?.items ?? []).map((item, i) => ({
      sceneId: item.sceneId,
      sceneIndex: i,
      clientRequestId: "",
      outcome: "skipped",
      error: blockedReason,
    })),
  };
}

function summarize(
  scenes: SceneVideoExecutorSceneResult[],
  extras: Pick<
    ExecuteSceneVideoPlanResult,
    | "status"
    | "blockedReason"
    | "theoreticalTotalCostUsd"
    | "existingCompletedCostUsd"
    | "alreadyCommittedCostUsd"
    | "maxNewCostUsd"
    | "newlyInitiatedProviderCostUsd"
  >,
): ExecuteSceneVideoPlanResult {
  return {
    ...extras,
    sceneCount: scenes.length,
    reusedCount: scenes.filter((s) => s.outcome === "reused").length,
    newlyCompletedCount: scenes.filter((s) => s.outcome === "completed").length,
    failedCount: scenes.filter((s) => s.outcome === "failed").length,
    unresolvedCount: scenes.filter((s) => s.outcome === "unresolved").length,
    skippedCount: scenes.filter((s) => s.outcome === "skipped").length,
    scenes,
  };
}

function clipOf(view: SceneVideoAttemptView) {
  return sceneVideoClipFromAttemptView(view);
}

async function settleAttempt(
  gateway: SceneVideoAttemptGateway,
  attemptId: string,
  deps: SceneVideoExecutorDeps,
): Promise<SceneVideoAttemptView> {
  const now = deps.now ?? (() => new Date());
  const sleep = deps.sleep ?? defaultSleep;
  const interval = normalizeSceneVideoPollIntervalMs(deps.pollIntervalMs);
  const timeoutMs = resolveSceneVideoPollTimeoutMs(deps.pollTimeoutMs);
  const maxIterations = maxSceneVideoPollIterations(timeoutMs, interval);
  const deadline = now().getTime() + timeoutMs;
  let view = await gateway.sync(attemptId);
  let pollIterations = 0;

  while (
    !(SCENE_VIDEO_ATTEMPT_TERMINAL_STATUSES as readonly string[]).includes(
      view.status,
    ) &&
    view.status !== "created"
  ) {
    if (now().getTime() >= deadline) {
      return view;
    }
    if (pollIterations >= maxIterations) {
      return view;
    }
    pollIterations += 1;
    await deps.onPollTick?.();
    await sleep(interval);
    view = await gateway.sync(attemptId);
  }
  return view;
}

function failedTerminal(status: string): boolean {
  return (
    status === "failed" ||
    status === "cancelled" ||
    status === "download_failed"
  );
}

function addInitiatedCost(
  total: number,
  item: SceneVideoGenerationPlanItem,
  spend: ProviderInitiatedSpend,
): number {
  if (spend === "confirmed_task" || spend === "unknown_submission") {
    return total + item.estimatedCostUsd;
  }
  return total;
}

function planNeedsPaidWork(
  items: SceneVideoGenerationPlanItem[],
  existingByScene: Map<string, SceneVideoAttemptView | null>,
): boolean {
  for (const item of items) {
    const existing = existingByScene.get(item.sceneId) ?? null;
    if (existing && isSucceededWithOutput(existing)) continue;
    if (existing?.status === "submission_unknown") return true;
    if (existing?.providerTaskId) return true;
    if (existing && IN_PROGRESS_STATUSES.has(existing.status)) return true;
    if (existing && failedTerminal(existing.status)) return true;
    if (!existing || existing.status === "created") return true;
  }
  return false;
}

/**
 * Sequential paid executor. Default-off. Not wired into jobRunner.
 * Uses scene-video-attempts for create / poll / finalize — no second lifecycle.
 */
export async function executeSceneVideoPlan(
  input: ExecuteSceneVideoPlanInput,
  deps: SceneVideoExecutorDeps = {},
): Promise<ExecuteSceneVideoPlanResult> {
  const gateway = deps.gateway ?? defaultSceneVideoAttemptGateway();

  const preflight = preflightSceneVideoPlan(input.plan, input.maxBudgetUsd);
  if (!preflight.ok) {
    return emptyResult(input, "blocked", preflight.reason);
  }

  const items = input.plan.items;
  const clientIds = items.map((item) =>
    buildSceneVideoClientRequestId({
      videoJobId: input.videoJobId,
      material: item.idempotencyMaterial,
    }),
  );

  const existingByScene = new Map<string, SceneVideoAttemptView | null>();
  for (let i = 0; i < items.length; i++) {
    existingByScene.set(
      items[i]!.sceneId,
      await gateway.getByClientRequestId(clientIds[i]!),
    );
  }

  const budget = rollupSceneBudget(
    items,
    existingByScene,
    input.plan.theoreticalTotalEstimatedCostUsd,
  );

  const needsPaid = planNeedsPaidWork(items, existingByScene);

  if (needsPaid) {
    if (input.confirmPaidRun !== true) {
      const result = emptyResult(input, "blocked", "paid_run_not_confirmed");
      result.existingCompletedCostUsd = budget.existingCompletedCostUsd;
      result.alreadyCommittedCostUsd = budget.alreadyCommittedCostUsd;
      result.maxNewCostUsd = budget.maxNewCostUsd;
      result.theoreticalTotalCostUsd = budget.theoreticalTotalCostUsd;
      return result;
    }
    const enabled =
      deps.isGenerationEnabled ?? isSceneVideoGenerationEnabled();
    if (!enabled) {
      const result = emptyResult(input, "blocked", "generation_disabled");
      result.existingCompletedCostUsd = budget.existingCompletedCostUsd;
      result.alreadyCommittedCostUsd = budget.alreadyCommittedCostUsd;
      result.maxNewCostUsd = budget.maxNewCostUsd;
      result.theoreticalTotalCostUsd = budget.theoreticalTotalCostUsd;
      return result;
    }
    const apiKeyPresent = deps.hasApiKey ?? hasRunwayApiSecret();
    if (!apiKeyPresent) {
      const result = emptyResult(input, "blocked", "api_key_missing");
      result.existingCompletedCostUsd = budget.existingCompletedCostUsd;
      result.alreadyCommittedCostUsd = budget.alreadyCommittedCostUsd;
      result.maxNewCostUsd = budget.maxNewCostUsd;
      result.theoreticalTotalCostUsd = budget.theoreticalTotalCostUsd;
      return result;
    }
  }

  if (
    !isFinitePositiveNumber(input.maxBudgetUsd) ||
    budget.maxNewCostUsd - input.maxBudgetUsd > 1e-9
  ) {
    const result = emptyResult(input, "blocked", "budget_exceeded");
    result.existingCompletedCostUsd = budget.existingCompletedCostUsd;
    result.alreadyCommittedCostUsd = budget.alreadyCommittedCostUsd;
    result.maxNewCostUsd = budget.maxNewCostUsd;
    result.theoreticalTotalCostUsd = budget.theoreticalTotalCostUsd;
    return result;
  }

  const scenes: SceneVideoExecutorSceneResult[] = [];
  let newlyInitiatedProviderCostUsd = 0;
  let halt: "stopped" | "needs_review" | null = null;
  let haltError: string | undefined;

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const clientRequestId = clientIds[i]!;

    if (halt) {
      scenes.push({
        sceneId: item.sceneId,
        sceneIndex: i,
        clientRequestId,
        outcome: "skipped",
        error: haltError,
      });
      continue;
    }

    const settled = await processOneScene({
      input,
      item,
      clientRequestId,
      existing: existingByScene.get(item.sceneId) ?? null,
      gateway,
      deps,
    });

    newlyInitiatedProviderCostUsd = addInitiatedCost(
      newlyInitiatedProviderCostUsd,
      item,
      settled.initiatedSpend,
    );
    scenes.push(settled.result);

    if (
      settled.result.outcome === "unresolved" ||
      settled.result.attemptStatus === "submission_unknown"
    ) {
      halt = "needs_review";
      haltError = settled.result.error ?? "submission_unknown";
    } else if (
      settled.result.outcome === "failed" ||
      (settled.result.outcome !== "reused" &&
        settled.result.outcome !== "completed")
    ) {
      halt = "stopped";
      haltError = settled.result.error ?? settled.result.attemptStatus;
    }
  }

  const status: ExecuteSceneVideoPlanResult["status"] = halt
    ? halt
    : "completed";

  return summarize(scenes, {
    status,
    theoreticalTotalCostUsd: budget.theoreticalTotalCostUsd,
    existingCompletedCostUsd: budget.existingCompletedCostUsd,
    alreadyCommittedCostUsd: budget.alreadyCommittedCostUsd,
    maxNewCostUsd: budget.maxNewCostUsd,
    newlyInitiatedProviderCostUsd,
  });
}

async function processOneScene(args: {
  input: ExecuteSceneVideoPlanInput;
  item: SceneVideoGenerationPlanItem;
  clientRequestId: string;
  existing: SceneVideoAttemptView | null;
  gateway: SceneVideoAttemptGateway;
  deps: SceneVideoExecutorDeps;
}): Promise<{
  result: SceneVideoExecutorSceneResult;
  initiatedSpend: ProviderInitiatedSpend;
}> {
  const { input, item, clientRequestId, existing, gateway, deps } = args;
  const base = {
    sceneId: item.sceneId,
    sceneIndex: item.sceneIndex,
    clientRequestId,
  };

  if (existing && isSucceededWithOutput(existing)) {
    return {
      initiatedSpend: "none",
      result: {
        ...base,
        outcome: "reused",
        attemptId: existing.id,
        attemptStatus: existing.status,
        clip: clipOf(existing),
      },
    };
  }

  if (existing?.status === "submission_unknown") {
    return {
      initiatedSpend: "none",
      result: {
        ...base,
        outcome: "unresolved",
        attemptId: existing.id,
        attemptStatus: existing.status,
        error: existing.errorMessage ?? "submission_unknown",
      },
    };
  }

  if (existing && failedTerminal(existing.status)) {
    return {
      initiatedSpend: "none",
      result: {
        ...base,
        outcome: "failed",
        attemptId: existing.id,
        attemptStatus: existing.status,
        error: existing.errorMessage ?? existing.status,
      },
    };
  }

  let view: SceneVideoAttemptView;
  let initiatedSpend: ProviderInitiatedSpend = "none";
  const beforeCreate = existing;
  let alreadySettled = false;

  if (existing && IN_PROGRESS_STATUSES.has(existing.status)) {
    view = await settleAttempt(gateway, existing.id, deps);
    alreadySettled = true;
  } else {
    try {
      view = await gateway.create({
        projectId: input.projectId,
        videoJobId: input.videoJobId,
        sceneId: item.sceneId,
        motionPrompt: item.motionPrompt,
        clientRequestId,
        provider: item.provider,
        model: item.model,
        durationSeconds: item.providerDurationSeconds,
        ratio: item.ratio,
        estimatedCredits: item.estimatedCredits,
        estimatedCostUsd: item.estimatedCostUsd,
        sourceImageBucket: item.sourceImageBucket ?? undefined,
        sourceImagePath: item.sourceImagePath ?? undefined,
      });
      initiatedSpend = providerInitiatedSpendDelta(beforeCreate, view);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message === "submission_unknown") {
        return {
          initiatedSpend: "unknown_submission",
          result: {
            ...base,
            outcome: "unresolved",
            attemptStatus: "submission_unknown",
            error: "submission_unknown",
          },
        };
      }
      return {
        initiatedSpend: "none",
        result: {
          ...base,
          outcome: "failed",
          error: message,
        },
      };
    }
  }

  if (isSucceededWithOutput(view)) {
    return {
      initiatedSpend,
      result: {
        ...base,
        outcome: view.reusedExistingRequest ? "reused" : "completed",
        attemptId: view.id,
        attemptStatus: view.status,
        clip: clipOf(view),
      },
    };
  }

  if (
    !alreadySettled &&
    (view.status === "submitted" ||
      view.status === "pending" ||
      view.status === "running" ||
      view.status === "downloading" ||
      view.status === "submitting")
  ) {
    view = await settleAttempt(gateway, view.id, deps);
  }

  if (isSucceededWithOutput(view)) {
    return {
      initiatedSpend,
      result: {
        ...base,
        outcome: "completed",
        attemptId: view.id,
        attemptStatus: view.status,
        clip: clipOf(view),
      },
    };
  }

  if (view.status === "submission_unknown") {
    const spend =
      initiatedSpend === "none" ? "unknown_submission" : initiatedSpend;
    return {
      initiatedSpend: spend,
      result: {
        ...base,
        outcome: "unresolved",
        attemptId: view.id,
        attemptStatus: view.status,
        error: view.errorMessage ?? "submission_unknown",
      },
    };
  }

  if (
    view.status === "pending" ||
    view.status === "running" ||
    view.status === "submitting"
  ) {
    const timeoutMs = resolveSceneVideoPollTimeoutMs(deps.pollTimeoutMs);
    return {
      initiatedSpend,
      result: {
        ...base,
        outcome: "unresolved",
        attemptId: view.id,
        attemptStatus: view.status,
        error: view.errorMessage ?? `poll_timeout_${timeoutMs}ms`,
      },
    };
  }

  if (failedTerminal(view.status) || view.status === "created") {
    return {
      initiatedSpend,
      result: {
        ...base,
        outcome: view.status === "created" ? "unresolved" : "failed",
        attemptId: view.id,
        attemptStatus: view.status,
        error: view.errorMessage ?? view.status,
      },
    };
  }

  return {
    initiatedSpend,
    result: {
      ...base,
      outcome: "unresolved",
      attemptId: view.id,
      attemptStatus: view.status,
      error: view.errorMessage ?? view.status,
    },
  };
}
