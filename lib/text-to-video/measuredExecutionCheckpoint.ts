import type { TextToVideoRunwayExecutionPlan } from "@/lib/text-to-video/runwayExecutionPlan";
import {
  TEXT_TO_VIDEO_PROVIDER_PROMPT_CONTRACT_VERSION,
  TEXT_TO_VIDEO_TECHNICAL_SPLIT_CONTRACT_VERSION,
} from "@/lib/text-to-video/runwayProductionConfig";

export const VIDEO_TEXT_TO_VIDEO_EXECUTION_CHECKPOINT_KEY =
  "video_text_to_video_execution_checkpoint" as const;

export interface TextToVideoMeasuredExecutionClip {
  scene_id: string;
  canonical_scene_id: string;
  part_index: number;
  part_count: number;
  provider_prompt: string;
  measured_start_seconds: number;
  measured_end_seconds: number;
  required_trim_seconds: number;
  provider_duration_seconds: number;
  estimated_cost_usd: number;
  request_fingerprint: string;
}

export interface TextToVideoMeasuredExecutionCheckpoint {
  schema_version: 1;
  phase: "measured_execution_plan";
  technical_split_contract_version: number;
  prompt_contract_version: number;
  execution_fingerprint: string;
  measured_audio_revision_id: string;
  synthesis_fingerprint: string;
  creative_plan_fingerprint: string;
  technical_clip_count: number;
  total_estimated_cost_usd: number;
  items: TextToVideoMeasuredExecutionClip[];
}

export function serializeMeasuredExecutionCheckpoint(
  plan: TextToVideoRunwayExecutionPlan,
): TextToVideoMeasuredExecutionCheckpoint {
  return {
    schema_version: 1,
    phase: "measured_execution_plan",
    technical_split_contract_version: plan.technicalSplitContractVersion,
    prompt_contract_version: plan.promptContractVersion,
    execution_fingerprint: plan.executionFingerprint,
    measured_audio_revision_id: plan.measuredAudioRevisionId,
    synthesis_fingerprint: plan.synthesisFingerprint,
    creative_plan_fingerprint: plan.creativePlanFingerprint,
    technical_clip_count: plan.items.length,
    total_estimated_cost_usd: plan.totalEstimatedCostUsd,
    items: plan.items.map((item) => ({
      scene_id: item.sceneId,
      canonical_scene_id: item.canonicalSceneId,
      part_index: item.partIndex,
      part_count: item.partCount,
      provider_prompt: item.providerPrompt,
      measured_start_seconds: item.measuredStartSeconds,
      measured_end_seconds: item.measuredEndSeconds,
      required_trim_seconds: item.requiredTrimSeconds,
      provider_duration_seconds: item.providerDurationSeconds,
      estimated_cost_usd: item.estimatedCostUsd,
      request_fingerprint: item.requestFingerprint,
    })),
  };
}

export function measuredExecutionCheckpointMatchesPlan(
  stored: unknown,
  plan: TextToVideoRunwayExecutionPlan,
): stored is TextToVideoMeasuredExecutionCheckpoint {
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
    return false;
  }
  const checkpoint = stored as TextToVideoMeasuredExecutionCheckpoint;
  if (checkpoint.phase !== "measured_execution_plan") return false;
  if (checkpoint.schema_version !== 1) return false;
  if (checkpoint.execution_fingerprint !== plan.executionFingerprint) {
    return false;
  }
  if (checkpoint.synthesis_fingerprint !== plan.synthesisFingerprint) {
    return false;
  }
  if (checkpoint.creative_plan_fingerprint !== plan.creativePlanFingerprint) {
    return false;
  }
  if (checkpoint.measured_audio_revision_id !== plan.measuredAudioRevisionId) {
    return false;
  }
  if (
    checkpoint.technical_split_contract_version !==
    TEXT_TO_VIDEO_TECHNICAL_SPLIT_CONTRACT_VERSION
  ) {
    return false;
  }
  if (
    checkpoint.prompt_contract_version !==
    TEXT_TO_VIDEO_PROVIDER_PROMPT_CONTRACT_VERSION
  ) {
    return false;
  }
  if (!Array.isArray(checkpoint.items)) return false;
  if (checkpoint.items.length !== plan.items.length) return false;
  return checkpoint.items.every((item, index) => {
    const expected = plan.items[index]!;
    return (
      item.scene_id === expected.sceneId &&
      item.canonical_scene_id === expected.canonicalSceneId &&
      item.part_index === expected.partIndex &&
      item.part_count === expected.partCount &&
      item.provider_prompt === expected.providerPrompt &&
      item.request_fingerprint === expected.requestFingerprint &&
      item.provider_duration_seconds === expected.providerDurationSeconds
    );
  });
}
