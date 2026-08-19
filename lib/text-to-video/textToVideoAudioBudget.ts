import {
  estimateElevenLabsMusicCostUsd,
  estimateElevenLabsSfxCostUsd,
} from "@/lib/elevenlabs/audioProductionConfig";
import { estimateElevenLabsTtsCostUsd } from "@/lib/elevenlabs/config";
import type { TextToVideoMusicPlan } from "@/lib/content-package/textToVideoSoundPlan";
import type { ResolvedSfxPlacement } from "@/lib/text-to-video/textToVideoSfxAnchoring";
import { evaluateTextToVideoRunwayBudget } from "@/lib/text-to-video/runwayBudget";
import type { SceneVideoAttemptView } from "@/lib/scene-video-attempts";
import type { TextToVideoRunwayExecutionPlan } from "@/lib/text-to-video/runwayExecutionPlan";
import { elevenLabsMusicAllowedForProduction } from "@/lib/elevenlabs/audioProductionConfig";
import { isElevenLabsSoundEffectsEnabled } from "@/lib/elevenlabs/audioProductionConfig";

export interface TextToVideoAudioAssetExposureRow {
  status: string;
  estimated_cost_usd?: number | null;
}

export interface TextToVideoFullBudgetReport {
  voiceExposureUsd: number;
  runwayNewUsd: number;
  runwayCommittedUsd: number;
  runwayReusedUsd: number;
  sfxNewUsd: number;
  musicNewUsd: number;
  audioSubmissionUnknownExposureUsd: number;
  submissionUnknownExposureUsd: number;
  totalExposureUsd: number;
  remainingPackageBudgetUsd: number;
  blocked: boolean;
  blockReason?: string;
  estimate: true;
}

export function evaluateTextToVideoFullBudget(args: {
  plan: TextToVideoRunwayExecutionPlan;
  packageBudgetUsd: number;
  voiceSynthesisTextLength: number;
  existingBySceneId: Map<string, SceneVideoAttemptView | null>;
  sfxPlacements: ResolvedSfxPlacement[];
  music: TextToVideoMusicPlan;
  confirmPaidRun: boolean;
  existingSfxCompletedCount?: number;
  existingMusicCompleted?: boolean;
  existingAudioAssets?: TextToVideoAudioAssetExposureRow[];
}): TextToVideoFullBudgetReport {
  const runway = evaluateTextToVideoRunwayBudget({
    plan: args.plan,
    packageBudgetUsd: args.packageBudgetUsd,
    voiceSynthesisTextLength: args.voiceSynthesisTextLength,
    existingBySceneId: args.existingBySceneId,
  });
  let sfxNewUsd = 0;
  if (isElevenLabsSoundEffectsEnabled() && args.sfxPlacements.length > 0) {
    const reuse = args.existingSfxCompletedCount ?? 0;
    const needed = Math.max(0, args.sfxPlacements.length - reuse);
    for (let i = 0; i < needed; i++) {
      const p = args.sfxPlacements[i]!;
      sfxNewUsd += estimateElevenLabsSfxCostUsd(p.duration_seconds);
    }
  }
  let musicNewUsd = 0;
  if (
    args.music.mode === "eleven_generated" &&
    elevenLabsMusicAllowedForProduction({ confirmPaidRun: args.confirmPaidRun }) &&
    !args.existingMusicCompleted
  ) {
    musicNewUsd = estimateElevenLabsMusicCostUsd(
      args.plan.items.reduce((s, i) => s + i.requiredTrimSeconds, 0),
    );
  }
  let runwaySubmissionUnknownExposureUsd = 0;
  for (const v of args.existingBySceneId.values()) {
    if (v?.status === "submission_unknown") {
      const item = args.plan.items.find((i) => i.sceneId === v.sceneId);
      if (item) runwaySubmissionUnknownExposureUsd += item.estimatedCostUsd;
    }
  }
  let audioSubmissionUnknownExposureUsd = 0;
  for (const row of args.existingAudioAssets ?? []) {
    if (row.status === "submission_unknown") {
      const cost = Number(row.estimated_cost_usd);
      audioSubmissionUnknownExposureUsd += Number.isFinite(cost) ? cost : 0;
    }
  }
  const submissionUnknownExposureUsd =
    runwaySubmissionUnknownExposureUsd + audioSubmissionUnknownExposureUsd;
  const totalExposureUsd =
    runway.voiceExposureUsd +
    runway.runwayCommittedUsd +
    runway.runwayNewUsd +
    sfxNewUsd +
    musicNewUsd +
    submissionUnknownExposureUsd;
  const remainingPackageBudgetUsd = args.packageBudgetUsd - totalExposureUsd;
  const blocked =
    runway.blocked ||
    !Number.isFinite(args.packageBudgetUsd) ||
    args.packageBudgetUsd <= 0 ||
    remainingPackageBudgetUsd < 0;
  return {
    voiceExposureUsd: runway.voiceExposureUsd,
    runwayNewUsd: runway.runwayNewUsd,
    runwayCommittedUsd: runway.runwayCommittedUsd,
    runwayReusedUsd: runway.runwayReusedUsd,
    sfxNewUsd,
    musicNewUsd,
    audioSubmissionUnknownExposureUsd,
    submissionUnknownExposureUsd,
    totalExposureUsd,
    remainingPackageBudgetUsd,
    blocked,
    blockReason: blocked ? runway.blockReason ?? "budget_insufficient" : undefined,
    estimate: true,
  };
}
