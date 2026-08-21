import { createHash } from "node:crypto";
import type { TextToVideoCreativePlan } from "@/lib/content-package/textToVideoCreativePlan";
import { TEXT_TO_VIDEO_TIMING_MEASURED } from "@/lib/content-package/textToVideoCreativePlan";
import { composeTextToVideoTechnicalPartPrompt } from "@/lib/content-package/textToVideoProviderPrompt";
import type { ElevenLabsCharacterAlignment } from "@/lib/elevenlabs/adapter";
import {
  TEXT_TO_VIDEO_PROVIDER_PROMPT_CONTRACT_VERSION,
  TEXT_TO_VIDEO_RUNWAY_DURATION_MAX,
  TEXT_TO_VIDEO_RUNWAY_MODEL,
  TEXT_TO_VIDEO_RUNWAY_RATIO,
  TEXT_TO_VIDEO_TECHNICAL_SPLIT_CONTRACT_VERSION,
  estimateRunwayGen45SceneCostUsd,
} from "@/lib/text-to-video/runwayProductionConfig";
import { runwayProviderDurationFromRequiredTrim } from "@/lib/text-to-video/runwayProviderDuration";
import {
  splitEstimatedSceneIntoTechnicalClips,
  splitMeasuredSceneIntoTechnicalClips,
  technicalClipId,
  type TechnicalClipSpan,
} from "@/lib/text-to-video/technicalClipSplit";
import type { VoiceSynthesisCheckpoint } from "@/lib/text-to-video/voiceSynthesisCheckpoint";

export interface TextToVideoRunwayScenePlanItem {
  sceneId: string;
  sceneOrder: number;
  canonicalSceneId: string;
  canonicalSceneOrder: number;
  partIndex: number;
  partCount: number;
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
  technicalSplitContractVersion: number;
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

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function spansForScene(args: {
  sceneStart: number;
  duration: number;
  excerpt: string;
  measured: boolean;
  alignment?: ElevenLabsCharacterAlignment | null;
  approvedVoiceover?: string;
}): TechnicalClipSpan[] {
  if (args.measured) {
    if (args.duration <= TEXT_TO_VIDEO_RUNWAY_DURATION_MAX) {
      const end = round2(args.sceneStart + args.duration);
      return [
        {
          partIndex: 0,
          startSeconds: round2(args.sceneStart),
          endSeconds: end,
          durationSeconds: round2(args.duration),
        },
      ];
    }
    if (!args.alignment || !args.approvedVoiceover?.trim()) {
      throw new Error("t2v_scene_split_invalid");
    }
    return splitMeasuredSceneIntoTechnicalClips({
      startSeconds: args.sceneStart,
      durationSeconds: args.duration,
      excerpt: args.excerpt,
      alignment: args.alignment,
      approvedVoiceover: args.approvedVoiceover,
    });
  }
  const relative = splitEstimatedSceneIntoTechnicalClips({
    durationSeconds: args.duration,
    excerpt: args.excerpt,
  });
  return relative.map((span) => ({
    ...span,
    startSeconds: round2(args.sceneStart + span.startSeconds),
    endSeconds: round2(args.sceneStart + span.endSeconds),
  }));
}

export function buildTextToVideoRunwayExecutionPlan(args: {
  plan: TextToVideoCreativePlan;
  voiceCheckpoint: VoiceSynthesisCheckpoint;
  alignment?: ElevenLabsCharacterAlignment | null;
  approvedVoiceover?: string;
}): TextToVideoRunwayExecutionPlan {
  const scenes = [...args.plan.scenes].sort((a, b) => a.order - b.order);
  const measured = args.plan.timing_status === TEXT_TO_VIDEO_TIMING_MEASURED;
  const items: TextToVideoRunwayScenePlanItem[] = [];
  let executionOrder = 0;
  for (const scene of scenes) {
    const canonicalSceneId = scene.canonical_scene_id ?? scene.scene_id;
    const excerpt = (scene.voiceover_excerpt ?? scene.human_meaning).trim();
    const spans = spansForScene({
      sceneStart: scene.approximate_start_seconds,
      duration: scene.approximate_duration_seconds,
      excerpt,
      measured,
      alignment: args.alignment,
      approvedVoiceover: args.approvedVoiceover,
    });
    const partCount = spans.length;
    for (const span of spans) {
      const { providerDurationSeconds, requiredTrimSeconds } =
        runwayProviderDurationFromRequiredTrim(span.durationSeconds);
      const technicalId = technicalClipId(canonicalSceneId, span.partIndex);
      const providerPrompt = composeTextToVideoTechnicalPartPrompt({
        basePrompt: scene.provider_prompt,
        partIndex: span.partIndex,
        partCount,
      });
      const seed = stableSeedFrom([
        args.plan.plan_fingerprint,
        args.voiceCheckpoint.synthesis_fingerprint,
        technicalId,
        String(span.partIndex),
        String(scene.order),
      ]);
      const cost = estimateRunwayGen45SceneCostUsd(providerDurationSeconds);
      const requestFingerprint = sceneRequestFingerprint({
        creative_plan_fingerprint: args.plan.plan_fingerprint,
        measured_audio_revision_id: args.plan.measured_audio_revision_id,
        synthesis_fingerprint: args.voiceCheckpoint.synthesis_fingerprint,
        scene_id: technicalId,
        canonical_scene_id: canonicalSceneId,
        part_index: span.partIndex,
        part_count: partCount,
        scene_order: executionOrder,
        provider_prompt: providerPrompt,
        model: TEXT_TO_VIDEO_RUNWAY_MODEL,
        ratio: TEXT_TO_VIDEO_RUNWAY_RATIO,
        provider_duration_seconds: providerDurationSeconds,
        required_trim_seconds: requiredTrimSeconds,
        seed,
        prompt_contract_version: TEXT_TO_VIDEO_PROVIDER_PROMPT_CONTRACT_VERSION,
        technical_split_contract_version:
          TEXT_TO_VIDEO_TECHNICAL_SPLIT_CONTRACT_VERSION,
      });
      items.push({
        sceneId: technicalId,
        sceneOrder: executionOrder,
        canonicalSceneId,
        canonicalSceneOrder: scene.order,
        partIndex: span.partIndex,
        partCount,
        providerPrompt,
        measuredStartSeconds: span.startSeconds,
        measuredEndSeconds: span.endSeconds,
        requiredTrimSeconds,
        providerDurationSeconds,
        model: TEXT_TO_VIDEO_RUNWAY_MODEL,
        ratio: TEXT_TO_VIDEO_RUNWAY_RATIO,
        seed,
        estimatedCredits: cost.credits,
        estimatedCostUsd: cost.usd,
        requestFingerprint,
      });
      executionOrder += 1;
    }
  }
  const executionFingerprint = sceneRequestFingerprint({
    creative_plan_fingerprint: args.plan.plan_fingerprint,
    measured_audio_revision_id: args.plan.measured_audio_revision_id ?? "",
    synthesis_fingerprint: args.voiceCheckpoint.synthesis_fingerprint,
    voice_checkpoint_fingerprint: args.voiceCheckpoint.synthesis_fingerprint,
    prompt_contract_version: TEXT_TO_VIDEO_PROVIDER_PROMPT_CONTRACT_VERSION,
    technical_split_contract_version: TEXT_TO_VIDEO_TECHNICAL_SPLIT_CONTRACT_VERSION,
    scenes: items.map((item) => ({
      scene_id: item.sceneId,
      canonical_scene_id: item.canonicalSceneId,
      part_index: item.partIndex,
      part_count: item.partCount,
      provider_prompt: item.providerPrompt,
      provider_duration_seconds: item.providerDurationSeconds,
      required_trim_seconds: item.requiredTrimSeconds,
      estimated_cost_usd: item.estimatedCostUsd,
      request_fingerprint: item.requestFingerprint,
    })),
  });
  const totalEstimatedCostUsd = items.reduce(
    (sum, item) => sum + item.estimatedCostUsd,
    0,
  );
  return {
    creativePlanFingerprint: args.plan.plan_fingerprint,
    measuredAudioRevisionId: args.plan.measured_audio_revision_id ?? "",
    synthesisFingerprint: args.voiceCheckpoint.synthesis_fingerprint,
    voiceCheckpointFingerprint: args.voiceCheckpoint.synthesis_fingerprint,
    executionFingerprint,
    promptContractVersion: TEXT_TO_VIDEO_PROVIDER_PROMPT_CONTRACT_VERSION,
    technicalSplitContractVersion: TEXT_TO_VIDEO_TECHNICAL_SPLIT_CONTRACT_VERSION,
    items,
    totalEstimatedCostUsd,
  };
}
