import type { SceneVideoAttemptStatus } from "@/lib/scene-video-attempts";
import type { SceneVideoAttemptView } from "@/lib/scene-video-attempts";
import type { CreateSceneVideoAttemptInput } from "@/lib/scene-video-attempts";
import type { SceneVideoGenerationPlan } from "@/lib/scene-video-plan";
import type { SceneVideoClip } from "@/lib/video-engine/schemas/sceneVideoClipSchema";

export type SceneVideoExecutorRunStatus =
  | "blocked"
  | "completed"
  | "stopped"
  | "needs_review";

export type SceneVideoExecutorSceneOutcome =
  | "reused"
  | "completed"
  | "failed"
  | "unresolved"
  | "skipped";

export interface ExecuteSceneVideoPlanInput {
  projectId: string;
  videoJobId: string;
  plan: SceneVideoGenerationPlan;
  /** Required finite positive USD cap for newly launched scenes this run. */
  maxBudgetUsd: number;
  /**
   * Explicit confirmation that this call may spend provider credits.
   * Default false — must be set together with the server feature flag.
   */
  confirmPaidRun?: boolean;
}

export interface SceneVideoExecutorSceneResult {
  sceneId: string;
  sceneIndex: number;
  clientRequestId: string;
  outcome: SceneVideoExecutorSceneOutcome;
  attemptId?: string;
  attemptStatus?: SceneVideoAttemptStatus;
  clip?: SceneVideoClip;
  error?: string;
}

export interface ExecuteSceneVideoPlanResult {
  status: SceneVideoExecutorRunStatus;
  blockedReason?: string;
  sceneCount: number;
  reusedCount: number;
  newlyCompletedCount: number;
  failedCount: number;
  unresolvedCount: number;
  skippedCount: number;
  /** Full plan theoretical cost (all scenes). */
  theoreticalTotalCostUsd: number;
  /** Estimated cost of scenes already succeeded before/during reuse. */
  existingCompletedCostUsd: number;
  /** Estimated cost of in-flight or uncertain submissions (not new POST candidates). */
  alreadyCommittedCostUsd: number;
  /** Max estimated cost of scenes eligible for a new provider create POST this run. */
  maxNewCostUsd: number;
  /** Cost of provider creates confirmed or ambiguously initiated this run only. */
  newlyInitiatedProviderCostUsd: number;
  scenes: SceneVideoExecutorSceneResult[];
}

/**
 * Narrow persistence/provider seam over scene-video-attempts.
 * Tests inject a fake; production uses {@link defaultSceneVideoAttemptGateway}.
 */
export interface SceneVideoAttemptGateway {
  getByClientRequestId(
    clientRequestId: string,
  ): Promise<SceneVideoAttemptView | null>;
  create(input: CreateSceneVideoAttemptInput): Promise<SceneVideoAttemptView>;
  sync(attemptId: string): Promise<SceneVideoAttemptView>;
}

export interface SceneVideoExecutorDeps {
  gateway?: SceneVideoAttemptGateway;
  isGenerationEnabled?: boolean;
  hasApiKey?: boolean;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
  pollIntervalMs?: number;
  pollTimeoutMs?: number;
  /** Called during provider poll waits (lease heartbeat, cancellation). */
  onPollTick?: () => void | Promise<void>;
}
