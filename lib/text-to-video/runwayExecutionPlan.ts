import { createHash } from "node:crypto";
import type { TextToVideoCreativePlan } from "@/lib/content-package/textToVideoCreativePlan";
import {
  TEXT_TO_VIDEO_PROVIDER_PROMPT_CONTRACT_VERSION,
  TEXT_TO_VIDEO_RUNWAY_MODEL,
  TEXT_TO_VIDEO_RUNWAY_RATIO,
  estimateRunwayGen45SceneCostUsd,
} from "@/lib/text-to-video/runwayProductionConfig";
import { runwayProviderDurationFromRequiredTrim } from "@/lib/text-to-video/runwayProviderDuration";
import type { VoiceSynthesisCheckpoint } from "@/lib/text-to-video/voiceSynthesisCheckpoint";

export interface TextToVideoRunwayScenePlanItem {
  sceneId: string;
  sceneOrder: number;
  providerPrompt: string;
  measuredStartSeconds: number;
  measuredEndSeconds: number;
  requiredTrimSeconds: number;
  providerDurationSeconds: number;
  model: typeof TEXT_TO_VIDEO_RUNWAY_MODEL;
  ratio: typeof TEXT_TO_VIDEO_RUNWAY_RATIO;
  seed: number;
  estimatedCredits: number;
  estimatedCostUsd: number;
  requestFingerprint: string;
}

export interface TextToVideoRunwayExecutionPlan {
  creativePlanFingerprint: string;
  measuredAudioRevisionId: string;
  synthesisFingerprint: string;
  voiceCheckpointFingerprint: string;
  executionFingerprint: string;
  promptContractVersion: number;
  items: TextToVideoRunwayScenePlanItem[];
  totalEstimatedCostUsd: number;
}

function stableSeedFrom(parts: string[]): number {
  const hex = createHash("sha256").update(parts.join("|"), "utf8").digest("hex");
  const n = Number.parseInt(hex.slice(0, 8), 16);
  return n % 4_294_967_295;
}

export function sceneRequestFingerprint(payload: Record<string, unknown>): string {
  const canonical = JSON.stringify(payload, Object.keys(payload).sort());
  return createHash("sha256").update(canonical, "utf8").digest("hex").slice(0, 24);
}

export function buildTextToVideoRunwayExecutionPlan(args: {
  plan: TextToVideoCreativePlan;
  voiceCheckpoint: VoiceSynthesisCheckpoint;
}): TextToVideoRunwayExecutionPlan {
  const scenes = [...args.plan.scenes].sort((a, b) => a.order - b.order);
  const items: TextToVideoRunwayScenePlanItem[] = [];
  for (const scene of scenes) {
    const start = scene.approximate_start_seconds;
    const duration = scene.approximate_duration_seconds;
    const { providerDurationSeconds, requiredTrimSeconds } =
      runwayProviderDurationFromRequiredTrim(duration);
    const end = start + requiredTrimSeconds;
    const seed = stableSeedFrom([
      args.plan.plan_fingerprint,
      args.voiceCheckpoint.synthesis_fingerprint,
      scene.scene_id,
      String(scene.order),
    ]);
    const cost = estimateRunwayGen45SceneCostUsd(providerDurationSeconds);
    const requestFingerprint = sceneRequestFingerprint({
      creative_plan_fingerprint: args.plan.plan_fingerprint,
      measured_audio_revision_id: args.plan.measured_audio_revision_id,
      synthesis_fingerprint: args.voiceCheckpoint.synthesis_fingerprint,
      scene_id: scene.scene_id,
      scene_order: scene.order,
      provider_prompt: scene.provider_prompt,
      model: TEXT_TO_VIDEO_RUNWAY_MODEL,
      ratio: TEXT_TO_VIDEO_RUNWAY_RATIO,
      provider_duration_seconds: providerDurationSeconds,
      required_trim_seconds: requiredTrimSeconds,
      seed,
      prompt_contract_version: TEXT_TO_VIDEO_PROVIDER_PROMPT_CONTRACT_VERSION,
    });
    items.push({
      sceneId: scene.scene_id,
      sceneOrder: scene.order,
      providerPrompt: scene.provider_prompt,
      measuredStartSeconds: start,
      measuredEndSeconds: end,
      requiredTrimSeconds,
      providerDurationSeconds,
      model: TEXT_TO_VIDEO_RUNWAY_MODEL,
      ratio: TEXT_TO_VIDEO_RUNWAY_RATIO,
      seed,
      estimatedCredits: cost.credits,
      estimatedCostUsd: cost.usd,
      requestFingerprint,
    });
  }
  const executionFingerprint = sceneRequestFingerprint({
    creative_plan_fingerprint: args.plan.plan_fingerprint,
    measured_audio_revision_id: args.plan.measured_audio_revision_id ?? "",
    synthesis_fingerprint: args.voiceCheckpoint.synthesis_fingerprint,
    voice_checkpoint_fingerprint: args.voiceCheckpoint.synthesis_fingerprint,
    prompt_contract_version: TEXT_TO_VIDEO_PROVIDER_PROMPT_CONTRACT_VERSION,
    scenes: items.map((i) => ({
      scene_id: i.sceneId,
      request_fingerprint: i.requestFingerprint,
    })),
  });
  const totalEstimatedCostUsd = items.reduce((s, i) => s + i.estimatedCostUsd, 0);
  return {
    creativePlanFingerprint: args.plan.plan_fingerprint,
    measuredAudioRevisionId: args.plan.measured_audio_revision_id ?? "",
    synthesisFingerprint: args.voiceCheckpoint.synthesis_fingerprint,
    voiceCheckpointFingerprint: args.voiceCheckpoint.synthesis_fingerprint,
    executionFingerprint,
    promptContractVersion: TEXT_TO_VIDEO_PROVIDER_PROMPT_CONTRACT_VERSION,
    items,
    totalEstimatedCostUsd,
  };
}
