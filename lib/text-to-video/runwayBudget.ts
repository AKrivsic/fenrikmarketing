import type { SceneVideoAttemptView } from "@/lib/scene-video-attempts";
import { isSucceededWithOutput } from "@/lib/scene-video-executor/budget";
import type { TextToVideoRunwayExecutionPlan } from "@/lib/text-to-video/runwayExecutionPlan";
import { estimateElevenLabsTtsCostUsd } from "@/lib/elevenlabs/config";

export interface TextToVideoRunwayBudgetReport {
  voiceExposureUsd: number;
  runwayTheoreticalUsd: number;
  runwayCommittedUsd: number;
  runwayNewUsd: number;
  runwayReusedUsd: number;
  totalExposureUsd: number;
  remainingPackageBudgetUsd: number;
  estimate: true;
  blocked: boolean;
  blockReason?: string;
}

const IN_FLIGHT = new Set([
  "submitting",
  "submitted",
  "pending",
  "running",
  "downloading",
]);

function committedCost(
  existing: SceneVideoAttemptView | null,
  itemCost: number,
): number {
  if (!existing) return 0;
  if (existing.status === "submission_unknown") return itemCost;
  if (existing.providerTaskId) return itemCost;
  if (IN_FLIGHT.has(existing.status)) return itemCost;
  return 0;
}

export function evaluateTextToVideoRunwayBudget(args: {
  plan: TextToVideoRunwayExecutionPlan;
  packageBudgetUsd: number;
  voiceSynthesisTextLength: number;
  existingBySceneId: Map<string, SceneVideoAttemptView | null>;
}): TextToVideoRunwayBudgetReport {
  const voiceExposureUsd = estimateElevenLabsTtsCostUsd(
    args.voiceSynthesisTextLength,
  );
  let runwayNewUsd = 0;
  let runwayCommittedUsd = 0;
  let runwayReusedUsd = 0;
  for (const item of args.plan.items) {
    const existing = args.existingBySceneId.get(item.sceneId) ?? null;
    if (canReuseTextToVideoSceneAttempt(existing, item.requestFingerprint)) {
      runwayReusedUsd += item.estimatedCostUsd;
      continue;
    }
    const committed = committedCost(existing, item.estimatedCostUsd);
    if (committed > 0) {
      runwayCommittedUsd += committed;
      continue;
    }
    if (
      existing &&
      (existing.status === "failed" ||
        existing.status === "cancelled" ||
        existing.status === "download_failed")
    ) {
      runwayNewUsd += item.estimatedCostUsd;
      continue;
    }
    runwayNewUsd += item.estimatedCostUsd;
  }
  const runwayTheoreticalUsd = args.plan.totalEstimatedCostUsd;
  const totalExposureUsd =
    voiceExposureUsd + runwayCommittedUsd + runwayNewUsd;
  const remainingPackageBudgetUsd = args.packageBudgetUsd - totalExposureUsd;
  const blocked =
    !Number.isFinite(args.packageBudgetUsd) ||
    args.packageBudgetUsd <= 0 ||
    remainingPackageBudgetUsd < 0;
  return {
    voiceExposureUsd,
    runwayTheoreticalUsd,
    runwayCommittedUsd,
    runwayNewUsd,
    runwayReusedUsd,
    totalExposureUsd,
    remainingPackageBudgetUsd,
    estimate: true,
    blocked,
    blockReason: blocked ? "insufficient_budget" : undefined,
  };
}

export function sceneAttemptMatchesExecutionItem(
  view: SceneVideoAttemptView,
  requestFingerprint: string,
): boolean {
  const meta = view.providerMetadata ?? {};
  const fp = meta.request_fingerprint;
  return typeof fp === "string" && fp === requestFingerprint;
}

export function canReuseTextToVideoSceneAttempt(
  view: SceneVideoAttemptView | null,
  requestFingerprint: string,
): boolean {
  if (!view || !isSucceededWithOutput(view)) return false;
  if (view.generationMode !== "text_to_video") return false;
  return sceneAttemptMatchesExecutionItem(view, requestFingerprint);
}
