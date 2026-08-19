import { createHash } from "node:crypto";
import { uuidV5, SCENE_VIDEO_CLIENT_REQUEST_NAMESPACE } from "@/lib/scene-video-executor/clientRequestId";
import {
  SCENE_VIDEO_ATTEMPT_TERMINAL_STATUSES,
  createTextToVideoSceneVideoAttempt,
  listSceneVideoAttemptsForScene,
  syncSceneVideoAttempt,
  type SceneVideoAttemptServiceDeps,
  type SceneVideoAttemptView,
} from "@/lib/scene-video-attempts";
import {
  maxSceneVideoPollIterations,
  normalizeSceneVideoPollIntervalMs,
  resolveSceneVideoPollTimeoutMs,
} from "@/lib/scene-video-executor/polling";
import type { TextToVideoRunwayExecutionPlan } from "@/lib/text-to-video/runwayExecutionPlan";
import {
  canReuseTextToVideoSceneAttempt,
  evaluateTextToVideoRunwayBudget,
} from "@/lib/text-to-video/runwayBudget";
import { TEXT_TO_VIDEO_PROVIDER_PROMPT_CONTRACT_VERSION } from "@/lib/text-to-video/runwayProductionConfig";
import { loadTextToVideoAttemptByScene } from "@/lib/text-to-video/textToVideoAttemptSelection";
import { validateTextToVideoSceneClipBuffer } from "@/lib/text-to-video/validateSceneClip";
import type { SupabaseClient } from "@supabase/supabase-js";

export function buildTextToVideoSceneClientRequestId(args: {
  videoJobId: string;
  requestFingerprint: string;
}): string {
  return uuidV5(
    SCENE_VIDEO_CLIENT_REQUEST_NAMESPACE,
    `${args.videoJobId}\ntext_to_video\n${args.requestFingerprint}`,
  );
}

export type TextToVideoSceneExecutorOutcome =
  | "completed"
  | "blocked"
  | "stopped"
  | "needs_review";

export interface TextToVideoSceneExecutorSceneResult {
  sceneId: string;
  outcome:
    | "reused"
    | "completed"
    | "skipped"
    | "failed"
    | "unresolved"
    | "needs_review";
  attemptId?: string;
  error?: string;
}

export interface ExecuteTextToVideoRunwayPlanResult {
  status: TextToVideoSceneExecutorOutcome;
  blockedReason?: string;
  runwayPostCount: number;
  scenes: TextToVideoSceneExecutorSceneResult[];
  attemptsBySceneId: Map<string, SceneVideoAttemptView>;
}

export interface ExecuteTextToVideoRunwayPlanInput {
  projectId: string;
  videoJobId: string;
  plan: TextToVideoRunwayExecutionPlan;
  packageBudgetUsd: number;
  voiceSynthesisTextLength: number;
  confirmPaidRun: boolean;
}

export interface TextToVideoRunwayExecutorDeps extends SceneVideoAttemptServiceDeps {
  sleep?: (ms: number) => Promise<void>;
  pollIntervalMs?: number;
  pollTimeoutMs?: number;
  onPollTick?: () => void;
  /** When false, executor stops before further provider POSTs. */
  shouldContinue?: () => boolean;
  validateClipBuffer?: (args: {
    buffer: Buffer;
    minDurationSeconds: number;
    providerDurationSeconds: number;
  }) => Promise<{ ok: boolean; reason?: string }>;
  downloadSceneClip?: (
    bucket: string,
    path: string,
  ) => Promise<Buffer>;
  markClipValidationFailed?: (
    supabase: SupabaseClient,
    attemptId: string,
    reason: string,
  ) => Promise<void>;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadExistingByScene(
  videoJobId: string,
  planItems: TextToVideoRunwayExecutionPlan["items"],
  deps?: SceneVideoAttemptServiceDeps,
): Promise<Map<string, SceneVideoAttemptView | null>> {
  const map = new Map<string, SceneVideoAttemptView | null>();
  for (const item of planItems) {
    const list = await listSceneVideoAttemptsForScene(
      { videoJobId, sceneId: item.sceneId },
      deps,
    );
    map.set(item.sceneId, loadTextToVideoAttemptByScene(list, item));
  }
  return map;
}

async function validateSucceededSceneClip(
  view: SceneVideoAttemptView,
  item: TextToVideoRunwayExecutionPlan["items"][number],
  deps: TextToVideoRunwayExecutorDeps,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (view.status !== "succeeded" || !view.outputBucket || !view.outputPath) {
    return { ok: false, reason: "missing_output" };
  }
  const validateFn =
    deps.validateClipBuffer ??
    (async (args) => {
      const r = await validateTextToVideoSceneClipBuffer({
        buffer: args.buffer,
        minDurationSeconds: args.minDurationSeconds,
        providerDurationSeconds: args.providerDurationSeconds,
      });
      return r.ok ? { ok: true } : { ok: false, reason: r.reason };
    });
  let buffer: Buffer;
  try {
    if (deps.downloadSceneClip) {
      buffer = await deps.downloadSceneClip(view.outputBucket, view.outputPath);
    } else {
      return { ok: false, reason: "clip_download_unconfigured" };
    }
  } catch {
    return { ok: false, reason: "clip_download_failed" };
  }
  if (buffer.length < 128) {
    return { ok: false, reason: "clip_empty" };
  }
  const result = await validateFn({
    buffer,
    minDurationSeconds: item.requiredTrimSeconds,
    providerDurationSeconds: item.providerDurationSeconds,
  });
  if (!result.ok) {
    return { ok: false, reason: result.reason ?? "clip_invalid" };
  }
  return { ok: true };
}

async function markClipNeedsReview(
  deps: TextToVideoRunwayExecutorDeps,
  attemptId: string,
  reason: string,
): Promise<SceneVideoAttemptView | null> {
  if (deps.markClipValidationFailed && deps.supabase) {
    await deps.markClipValidationFailed(deps.supabase, attemptId, reason);
  }
  return null;
}

async function settleAttempt(
  attemptId: string,
  deps: TextToVideoRunwayExecutorDeps,
): Promise<SceneVideoAttemptView> {
  const now = deps.now ?? (() => new Date());
  const sleep = deps.sleep ?? defaultSleep;
  const interval = normalizeSceneVideoPollIntervalMs(deps.pollIntervalMs);
  const timeoutMs = resolveSceneVideoPollTimeoutMs(deps.pollTimeoutMs);
  const maxIterations = maxSceneVideoPollIterations(timeoutMs, interval);
  const deadline = now().getTime() + timeoutMs;
  let view = await syncSceneVideoAttempt(attemptId, deps);
  let pollIterations = 0;
  while (
    !(SCENE_VIDEO_ATTEMPT_TERMINAL_STATUSES as readonly string[]).includes(
      view.status,
    ) &&
    view.status !== "created"
  ) {
    if (now().getTime() >= deadline || pollIterations >= maxIterations) {
      return view;
    }
    pollIterations += 1;
    await deps.onPollTick?.();
    await sleep(interval);
    view = await syncSceneVideoAttempt(attemptId, deps);
  }
  return view;
}

export async function executeTextToVideoRunwayPlan(
  input: ExecuteTextToVideoRunwayPlanInput,
  deps: TextToVideoRunwayExecutorDeps = {},
): Promise<ExecuteTextToVideoRunwayPlanResult> {
  if (!input.confirmPaidRun) {
    return {
      status: "blocked",
      blockedReason: "confirm_paid_run_required",
      runwayPostCount: 0,
      scenes: [],
      attemptsBySceneId: new Map(),
    };
  }
  const sceneIds = input.plan.items.map((i) => i.sceneId);
  const existingByScene = await loadExistingByScene(
    input.videoJobId,
    input.plan.items,
    deps,
  );
  const budget = evaluateTextToVideoRunwayBudget({
    plan: input.plan,
    packageBudgetUsd: input.packageBudgetUsd,
    voiceSynthesisTextLength: input.voiceSynthesisTextLength,
    existingBySceneId: existingByScene,
  });
  if (budget.blocked) {
    return {
      status: "blocked",
      blockedReason: budget.blockReason,
      runwayPostCount: 0,
      scenes: input.plan.items.map((i) => ({
        sceneId: i.sceneId,
        outcome: "skipped",
        error: budget.blockReason,
      })),
      attemptsBySceneId: new Map(),
    };
  }

  let runwayPostCount = 0;
  const scenes: TextToVideoSceneExecutorSceneResult[] = [];
  const attemptsBySceneId = new Map<string, SceneVideoAttemptView>();

  for (const item of input.plan.items) {
    if (deps.shouldContinue && !deps.shouldContinue()) {
      scenes.push({
        sceneId: item.sceneId,
        outcome: "skipped",
        error: "lease_lost",
      });
      return {
        status: "stopped",
        blockedReason: "lease_lost",
        runwayPostCount,
        scenes,
        attemptsBySceneId,
      };
    }

    const list = await listSceneVideoAttemptsForScene(
      { videoJobId: input.videoJobId, sceneId: item.sceneId },
      deps,
    );
    const existing = loadTextToVideoAttemptByScene(list, item);
    existingByScene.set(item.sceneId, existing);

    if (canReuseTextToVideoSceneAttempt(existing, item.requestFingerprint)) {
      if (deps.downloadSceneClip) {
        const v = await validateSucceededSceneClip(existing!, item, deps);
        if (!v.ok) {
          await markClipNeedsReview(deps, existing!.id, v.reason);
          scenes.push({
            sceneId: item.sceneId,
            outcome: "needs_review",
            attemptId: existing!.id,
            error: v.reason,
          });
          return {
            status: "needs_review",
            blockedReason: v.reason,
            runwayPostCount,
            scenes,
            attemptsBySceneId,
          };
        }
      }
      attemptsBySceneId.set(item.sceneId, existing!);
      scenes.push({
        sceneId: item.sceneId,
        outcome: "reused",
        attemptId: existing!.id,
      });
      continue;
    }

    if (existing?.status === "submission_unknown") {
      scenes.push({
        sceneId: item.sceneId,
        outcome: "unresolved",
        attemptId: existing.id,
        error: "submission_unknown",
      });
      return {
        status: "stopped",
        blockedReason: "submission_unknown",
        runwayPostCount,
        scenes,
        attemptsBySceneId,
      };
    }

    if (existing?.providerTaskId) {
      const settled = await settleAttempt(existing.id, deps);
      attemptsBySceneId.set(item.sceneId, settled);
      if (settled.status === "succeeded") {
        if (deps.downloadSceneClip) {
          const v = await validateSucceededSceneClip(settled, item, deps);
          if (!v.ok) {
            await markClipNeedsReview(deps, settled.id, v.reason);
            scenes.push({
              sceneId: item.sceneId,
              outcome: "needs_review",
              attemptId: settled.id,
              error: v.reason,
            });
            return {
              status: "needs_review",
              blockedReason: v.reason,
              runwayPostCount,
              scenes,
              attemptsBySceneId,
            };
          }
        }
        scenes.push({
          sceneId: item.sceneId,
          outcome: "completed",
          attemptId: settled.id,
        });
      } else {
        scenes.push({
          sceneId: item.sceneId,
          outcome: settled.status === "failed" ? "failed" : "unresolved",
          attemptId: settled.id,
        });
        return {
          status: "stopped",
          blockedReason: settled.status,
          runwayPostCount,
          scenes,
          attemptsBySceneId,
        };
      }
      continue;
    }

    const clientRequestId = buildTextToVideoSceneClientRequestId({
      videoJobId: input.videoJobId,
      requestFingerprint: item.requestFingerprint,
    });

    const beforePosts = runwayPostCount;
    let view: SceneVideoAttemptView;
    try {
      view = await createTextToVideoSceneVideoAttempt(
        {
          projectId: input.projectId,
          videoJobId: input.videoJobId,
          sceneId: item.sceneId,
          promptText: item.providerPrompt,
          clientRequestId,
          durationSeconds: item.providerDurationSeconds,
          ratio: item.ratio,
          seed: item.seed,
          estimatedCredits: item.estimatedCredits,
          estimatedCostUsd: item.estimatedCostUsd,
          requestFingerprint: item.requestFingerprint,
          requiredTrimmedDurationSeconds: item.requiredTrimSeconds,
          promptContractVersion: TEXT_TO_VIDEO_PROVIDER_PROMPT_CONTRACT_VERSION,
        },
        deps,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "create_failed";
      scenes.push({ sceneId: item.sceneId, outcome: "unresolved", error: msg });
      return {
        status: "stopped",
        blockedReason: msg,
        runwayPostCount,
        scenes,
        attemptsBySceneId,
      };
    }

    if (!view.providerTaskId && view.status === "created") {
      /* insert loser — no POST */
    } else if (
      view.status === "submitted" ||
      view.providerTaskId ||
      view.status === "submitting"
    ) {
      if (!existing?.providerTaskId && view.status !== "created") {
        runwayPostCount += 1;
      }
    }
    void beforePosts;

    view = await settleAttempt(view.id, deps);
    attemptsBySceneId.set(item.sceneId, view);

    if (view.status === "submission_unknown") {
      scenes.push({
        sceneId: item.sceneId,
        outcome: "unresolved",
        attemptId: view.id,
        error: "submission_unknown",
      });
      return {
        status: "stopped",
        blockedReason: "submission_unknown",
        runwayPostCount,
        scenes,
        attemptsBySceneId,
      };
    }

    if (view.status === "succeeded") {
      if (deps.downloadSceneClip) {
        const v = await validateSucceededSceneClip(view, item, deps);
        if (!v.ok) {
          await markClipNeedsReview(deps, view.id, v.reason);
          scenes.push({
            sceneId: item.sceneId,
            outcome: "needs_review",
            attemptId: view.id,
            error: v.reason,
          });
          return {
            status: "needs_review",
            blockedReason: v.reason,
            runwayPostCount,
            scenes,
            attemptsBySceneId,
          };
        }
      }
      scenes.push({
        sceneId: item.sceneId,
        outcome: "completed",
        attemptId: view.id,
      });
      continue;
    }

    scenes.push({
      sceneId: item.sceneId,
      outcome: view.status === "failed" ? "failed" : "needs_review",
      attemptId: view.id,
      error: view.errorMessage ?? view.status,
    });
    return {
      status: "stopped",
      blockedReason: view.status,
      runwayPostCount,
      scenes,
      attemptsBySceneId,
    };
  }

  return {
    status: "completed",
    runwayPostCount,
    scenes,
    attemptsBySceneId,
  };
}

export function executionPlanFingerprintStable(
  plan: TextToVideoRunwayExecutionPlan,
): string {
  return createHash("sha256")
    .update(plan.executionFingerprint, "utf8")
    .digest("hex")
    .slice(0, 24);
}
