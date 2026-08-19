import type { SceneVideoAttemptView } from "@/lib/scene-video-attempts";
import type { SceneVideoGenerationPlanItem } from "@/lib/scene-video-plan";

export type SceneBudgetCategory =
  | "reusedCompleted"
  | "alreadyCommitted"
  | "newCreateCandidate"
  | "failedOrBlocked";

const FAILED_BLOCK_STATUSES = new Set([
  "failed",
  "cancelled",
  "download_failed",
]);

const COMMITTED_IN_FLIGHT = new Set([
  "submitting",
  "submitted",
  "pending",
  "running",
  "downloading",
]);

export function isSucceededWithOutput(view: SceneVideoAttemptView): boolean {
  return (
    view.status === "succeeded" &&
    Boolean(view.outputBucket?.trim()) &&
    Boolean(view.outputPath?.trim())
  );
}

export function classifySceneBudgetCategory(
  existing: SceneVideoAttemptView | null,
): SceneBudgetCategory {
  if (existing && isSucceededWithOutput(existing)) {
    return "reusedCompleted";
  }
  if (existing?.status === "submission_unknown") {
    return "alreadyCommitted";
  }
  if (existing?.providerTaskId) {
    return "alreadyCommitted";
  }
  if (existing && COMMITTED_IN_FLIGHT.has(existing.status)) {
    return "alreadyCommitted";
  }
  if (existing && FAILED_BLOCK_STATUSES.has(existing.status)) {
    return "failedOrBlocked";
  }
  return "newCreateCandidate";
}

export interface SceneBudgetRollup {
  reusedCompleted: SceneVideoGenerationPlanItem[];
  alreadyCommitted: SceneVideoGenerationPlanItem[];
  newCreateCandidates: SceneVideoGenerationPlanItem[];
  failedOrBlocked: SceneVideoGenerationPlanItem[];
  theoreticalTotalCostUsd: number;
  existingCompletedCostUsd: number;
  alreadyCommittedCostUsd: number;
  maxNewCostUsd: number;
}

export function rollupSceneBudget(
  items: SceneVideoGenerationPlanItem[],
  existingBySceneId: Map<string, SceneVideoAttemptView | null>,
  theoreticalTotalCostUsd: number,
): SceneBudgetRollup {
  const reusedCompleted: SceneVideoGenerationPlanItem[] = [];
  const alreadyCommitted: SceneVideoGenerationPlanItem[] = [];
  const newCreateCandidates: SceneVideoGenerationPlanItem[] = [];
  const failedOrBlocked: SceneVideoGenerationPlanItem[] = [];

  let existingCompletedCostUsd = 0;
  let alreadyCommittedCostUsd = 0;
  let maxNewCostUsd = 0;

  for (const item of items) {
    const existing = existingBySceneId.get(item.sceneId) ?? null;
    const category = classifySceneBudgetCategory(existing);
    switch (category) {
      case "reusedCompleted":
        reusedCompleted.push(item);
        existingCompletedCostUsd += item.estimatedCostUsd;
        break;
      case "alreadyCommitted":
        alreadyCommitted.push(item);
        alreadyCommittedCostUsd += item.estimatedCostUsd;
        break;
      case "newCreateCandidate":
        newCreateCandidates.push(item);
        maxNewCostUsd += item.estimatedCostUsd;
        break;
      case "failedOrBlocked":
        failedOrBlocked.push(item);
        break;
      default:
        break;
    }
  }

  return {
    reusedCompleted,
    alreadyCommitted,
    newCreateCandidates,
    failedOrBlocked,
    theoreticalTotalCostUsd,
    existingCompletedCostUsd,
    alreadyCommittedCostUsd,
    maxNewCostUsd,
  };
}

export type ProviderInitiatedSpend = "none" | "confirmed_task" | "unknown_submission";

export function providerInitiatedSpendDelta(
  before: SceneVideoAttemptView | null,
  after: SceneVideoAttemptView,
): ProviderInitiatedSpend {
  if (after.status === "submission_unknown") {
    return "unknown_submission";
  }
  if (after.providerTaskId && !before?.providerTaskId) {
    return "confirmed_task";
  }
  return "none";
}
