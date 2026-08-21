/**
 * Operator-facing T2V cost estimate — same duration mapping as Runway execution.
 * Never uses a hardcoded 3s per scene.
 *
 * Before voice: conservative max (inflated duration, technical clips).
 * After measured alignment: actual clip count and billed lengths.
 */

import type { TextToVideoCreativePlan } from "@/lib/content-package/textToVideoCreativePlan";
import { TEXT_TO_VIDEO_TIMING_MEASURED } from "@/lib/content-package/textToVideoCreativePlan";
import {
  parseTextToVideoSoundPlan,
  type TextToVideoSoundPlan,
} from "@/lib/content-package/textToVideoSoundPlan";
import {
  estimateElevenLabsMusicCostUsd,
  estimateElevenLabsSfxCostUsd,
} from "@/lib/elevenlabs/audioProductionConfig";
import { estimateElevenLabsTtsCostUsd } from "@/lib/elevenlabs/config";
import {
  TEXT_TO_VIDEO_DURATION_MEASUREMENT_SLACK,
  TEXT_TO_VIDEO_RUNWAY_DURATION_MAX,
  estimateRunwayGen45SceneCostUsd,
} from "@/lib/text-to-video/runwayProductionConfig";
import { runwayProviderDurationFromRequiredTrim } from "@/lib/text-to-video/runwayProviderDuration";
import {
  VIDEO_TEXT_TO_VIDEO_EXECUTION_CHECKPOINT_KEY,
  type TextToVideoMeasuredExecutionCheckpoint,
} from "@/lib/text-to-video/measuredExecutionCheckpoint";
import {
  plannedTechnicalPartCountFromMeasured,
  splitEstimatedSceneIntoTechnicalClips,
} from "@/lib/text-to-video/technicalClipSplit";

export interface TextToVideoOperatorBudgetEstimate {
  voiceUsd: number;
  runwayUsd: number;
  sfxUsd: number;
  musicUsd: number;
  totalUsd: number;
  timingStatus: "estimated" | "measured";
  sceneProviderDurations: number[];
  technicalClipCount: number;
  conservative: boolean;
  label: string;
}

function billedDuration(requiredTrimSeconds: number): number {
  return runwayProviderDurationFromRequiredTrim(requiredTrimSeconds)
    .providerDurationSeconds;
}

function conservativeDurationsForScene(durationSeconds: number): number[] {
  const inflated = durationSeconds * TEXT_TO_VIDEO_DURATION_MEASUREMENT_SLACK;
  const partCount = Math.max(
    1,
    Math.ceil(inflated / TEXT_TO_VIDEO_RUNWAY_DURATION_MAX),
  );
  const part = inflated / partCount;
  return Array.from({ length: partCount }, () => billedDuration(part));
}

function measuredDurationsForScene(args: {
  durationSeconds: number;
  excerpt: string;
}): number[] {
  const partCount = plannedTechnicalPartCountFromMeasured(args.durationSeconds);
  if (partCount === 1) {
    return [billedDuration(args.durationSeconds)];
  }
  const spans = splitEstimatedSceneIntoTechnicalClips({
    durationSeconds: args.durationSeconds,
    excerpt: args.excerpt,
  });
  // Estimate helper uses the 8s pre-voice threshold; for measured billing
  // re-split by the actual 10s max via part durations already computed.
  if (
    spans.length === partCount &&
    spans.every((span) => span.durationSeconds <= TEXT_TO_VIDEO_RUNWAY_DURATION_MAX)
  ) {
    return spans.map((span) => billedDuration(span.durationSeconds));
  }
  const even = args.durationSeconds / partCount;
  return Array.from({ length: partCount }, () => billedDuration(even));
}

export function estimateTextToVideoOperatorBudget(args: {
  productionVoiceover: string;
  plan: TextToVideoCreativePlan;
  sound?: TextToVideoSoundPlan | null;
  maxBudgetUsd?: number | null;
  executionCheckpoint?: TextToVideoMeasuredExecutionCheckpoint | null;
}): TextToVideoOperatorBudgetEstimate {
  const vo = args.productionVoiceover.trim();
  const voiceUsd = estimateElevenLabsTtsCostUsd(vo.length);
  const sceneProviderDurations: number[] = [];
  const measured = args.plan.timing_status === TEXT_TO_VIDEO_TIMING_MEASURED;
  const checkpoint = args.executionCheckpoint;
  if (checkpoint && measured && checkpoint.items.length > 0) {
    for (const item of checkpoint.items) {
      sceneProviderDurations.push(item.provider_duration_seconds);
    }
  } else if (measured) {
    for (const scene of args.plan.scenes) {
      sceneProviderDurations.push(
        ...measuredDurationsForScene({
          durationSeconds: scene.approximate_duration_seconds,
          excerpt: (scene.voiceover_excerpt ?? scene.human_meaning).trim(),
        }),
      );
    }
  } else {
    for (const scene of args.plan.scenes) {
      sceneProviderDurations.push(
        ...conservativeDurationsForScene(scene.approximate_duration_seconds),
      );
    }
  }
  const runwayUsd = sceneProviderDurations.reduce(
    (sum, duration) => sum + estimateRunwayGen45SceneCostUsd(duration).usd,
    0,
  );
  let sfxUsd = 0;
  const sound =
    args.sound ??
    parseTextToVideoSoundPlan({}) ??
    null;
  if (sound) {
    for (const entry of Object.values(sound.scene_sound)) {
      if (entry.mode === "custom") {
        sfxUsd += estimateElevenLabsSfxCostUsd(2.5);
      }
    }
  }
  const musicUsd =
    sound?.music.mode === "eleven_generated"
      ? estimateElevenLabsMusicCostUsd(args.plan.target_duration_seconds)
      : 0;
  const totalUsd = voiceUsd + runwayUsd + sfxUsd + musicUsd;
  const timingStatus = measured ? "measured" : "estimated";
  const conservative = !measured;
  const timingLabel = measured
    ? "po změřeném hlasu"
    : "konzervativní maximum před hlasem";
  const budget =
    typeof args.maxBudgetUsd === "number" && Number.isFinite(args.maxBudgetUsd)
      ? `, rozpočet ${args.maxBudgetUsd.toFixed(2)}`
      : "";
  const label = `Odhad (USD, ${timingLabel}): hlas ${voiceUsd.toFixed(2)}, video ${runwayUsd.toFixed(2)} (${sceneProviderDurations.length} klipů), SFX ${sfxUsd.toFixed(2)}, hudba ${musicUsd.toFixed(2)}, celkem ${totalUsd.toFixed(2)}${budget}`;
  return {
    voiceUsd,
    runwayUsd,
    sfxUsd,
    musicUsd,
    totalUsd,
    timingStatus,
    sceneProviderDurations,
    technicalClipCount: sceneProviderDurations.length,
    conservative,
    label,
  };
}

export function readExecutionCheckpointFromBrief(
  brief: Record<string, unknown>,
): TextToVideoMeasuredExecutionCheckpoint | null {
  const raw = brief[VIDEO_TEXT_TO_VIDEO_EXECUTION_CHECKPOINT_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const checkpoint = raw as TextToVideoMeasuredExecutionCheckpoint;
  if (checkpoint.phase !== "measured_execution_plan") return null;
  return checkpoint;
}
