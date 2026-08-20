/**
 * Operator-facing T2V cost estimate — same duration mapping as Runway execution.
 * Never uses a hardcoded 3s per scene.
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
import { estimateRunwayGen45SceneCostUsd } from "@/lib/text-to-video/runwayProductionConfig";
import { runwayProviderDurationFromRequiredTrim } from "@/lib/text-to-video/runwayProviderDuration";

export interface TextToVideoOperatorBudgetEstimate {
  voiceUsd: number;
  runwayUsd: number;
  sfxUsd: number;
  musicUsd: number;
  totalUsd: number;
  timingStatus: "estimated" | "measured";
  sceneProviderDurations: number[];
  label: string;
}

export function estimateTextToVideoOperatorBudget(args: {
  productionVoiceover: string;
  plan: TextToVideoCreativePlan;
  sound?: TextToVideoSoundPlan | null;
  maxBudgetUsd?: number | null;
}): TextToVideoOperatorBudgetEstimate {
  const vo = args.productionVoiceover.trim();
  const voiceUsd = estimateElevenLabsTtsCostUsd(vo.length);
  const sceneProviderDurations: number[] = [];
  let runwayUsd = 0;
  for (const scene of args.plan.scenes) {
    const mapped = runwayProviderDurationFromRequiredTrim(
      scene.approximate_duration_seconds,
    );
    sceneProviderDurations.push(mapped.providerDurationSeconds);
    runwayUsd += estimateRunwayGen45SceneCostUsd(mapped.providerDurationSeconds)
      .usd;
  }
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
  const timingStatus =
    args.plan.timing_status === TEXT_TO_VIDEO_TIMING_MEASURED
      ? "measured"
      : "estimated";
  const timingLabel =
    timingStatus === "measured"
      ? "po změřeném hlasu"
      : "předběžný odhad před hlasem";
  const budget =
    typeof args.maxBudgetUsd === "number" && Number.isFinite(args.maxBudgetUsd)
      ? `, rozpočet ${args.maxBudgetUsd.toFixed(2)}`
      : "";
  const label = `Odhad (USD, ${timingLabel}): hlas ${voiceUsd.toFixed(2)}, video ${runwayUsd.toFixed(2)}, SFX ${sfxUsd.toFixed(2)}, hudba ${musicUsd.toFixed(2)}, celkem ${totalUsd.toFixed(2)}${budget}`;
  return {
    voiceUsd,
    runwayUsd,
    sfxUsd,
    musicUsd,
    totalUsd,
    timingStatus,
    sceneProviderDurations,
    label,
  };
}
