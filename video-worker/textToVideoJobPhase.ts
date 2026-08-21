import { renewVideoJobLease } from "@/lib/production-runtime";
import { runTextToVideoAssemblyPhase } from "@/lib/text-to-video/runTextToVideoAssemblyPhase";
import { runTextToVideoRunwayClipsPhase } from "@/lib/text-to-video/runTextToVideoRunwayClipsPhase";
import { runTextToVideoElevenLabsVoicePhase } from "@/lib/text-to-video/voiceSynthesisService";
import {
  parseTextToVideoWorkerPaidGate,
  workerPreflightInput,
} from "@/lib/text-to-video/textToVideoWorkerPipeline";
import { assertAuthoritativeTextToVideoPackageBudget } from "@/lib/text-to-video/textToVideoPackageBudget";
import { assertTextToVideoPackageReadyForPaidProviders } from "@/lib/text-to-video/assertTextToVideoPackageReadyForPaidProviders";
import { isTextToVideoRunwayEnabled } from "@/lib/text-to-video/runwayProductionConfig";
import { isElevenLabsTtsEnabled, readElevenLabsApiKey } from "@/lib/elevenlabs/config";
import type { TextToVideoRunwayExecutorDeps } from "@/lib/text-to-video/textToVideoRunwayExecutor";
import type { VoiceSynthesisDeps } from "@/lib/text-to-video/voiceSynthesisService";
import type { RunAiVideoClipJobPhaseResult } from "@/video-worker/aiVideoClipJobPhase";
import { uploadAssemblyToStaging } from "@/video-worker/aiVideoArtifactStorage";
import type { RenderSpecOutput } from "@/lib/video-engine/schemas/renderSchema";
import {
  TEXT_TO_VIDEO_ASSEMBLY_CONTRACT_VERSION,
  TEXT_TO_VIDEO_ASSEMBLY_DELIVERY_HEIGHT,
  TEXT_TO_VIDEO_ASSEMBLY_DELIVERY_WIDTH,
} from "@/lib/text-to-video/textToVideoAssemblyConstants";
import {
  persistTextToVideoAssemblyCheckpoint,
  readDurableTextToVideoAssemblyCheckpoint,
  stagingRefsToCheckpointStaging,
  verifyDurableAssemblyStagingObjects,
  checkpointStagingToAiVideoStagingRefs,
} from "@/lib/text-to-video/textToVideoAssemblyCheckpoint";
import { buildRenderSpec } from "@/video-worker/jobRunner";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiVideoArtifactStorageDeps } from "@/video-worker/aiVideoArtifactStorage";

export async function runTextToVideoJobPhase(args: {
  projectId: string;
  packageId: string;
  videoJobId: string;
  brief: Record<string, unknown>;
  jobInput: Record<string, unknown>;
  subtitlesBurnIn: boolean;
  leaseOwner: string;
  supabase: SupabaseClient;
  shouldContinue?: () => boolean;
  executorDeps?: TextToVideoRunwayExecutorDeps;
  artifactStorage?: AiVideoArtifactStorageDeps;
}): Promise<RunAiVideoClipJobPhaseResult> {
  const budgetGate = assertAuthoritativeTextToVideoPackageBudget(args.jobInput);
  const gate = parseTextToVideoWorkerPaidGate(args.jobInput);
  if (gate.packageBudgetUsd !== budgetGate.packageBudgetUsd) {
    throw new Error("package_budget_job_input_mismatch");
  }

  const durableCheckpoint = readDurableTextToVideoAssemblyCheckpoint(args.brief);
  if (durableCheckpoint) {
    const stagingOk = await verifyDurableAssemblyStagingObjects(
      args.supabase,
      durableCheckpoint.staging,
    );
    if (stagingOk) {
      const staging = checkpointStagingToAiVideoStagingRefs(
        durableCheckpoint.staging,
      );
      const renderSpec = buildRenderSpec(
        args.jobInput,
      ) as unknown as RenderSpecOutput;
      return {
        kind: "needs_final_promotion",
        staging,
        renderSpec,
        debug: {
          package_video_mode: "text_to_video",
          text_to_video_assembly: durableCheckpoint,
          assembly_checkpoint_reuse: true,
        },
        cleanupLocal: async () => undefined,
      };
    }
  }

  if (!isElevenLabsTtsEnabled() || !readElevenLabsApiKey()) {
    throw new Error("text_to_video_elevenlabs_disabled");
  }
  if (!isTextToVideoRunwayEnabled()) {
    throw new Error("text_to_video_runway_disabled");
  }

  assertTextToVideoPackageReadyForPaidProviders({
    brief: args.brief,
    jobInput: args.jobInput,
    requireWorkerVoiceId: true,
  });

  const renew = async (): Promise<void> => {
    const ok = await renewVideoJobLease(args.supabase, {
      jobId: args.videoJobId,
      projectId: args.projectId,
      ownerToken: args.leaseOwner,
    });
    if (!ok) throw new Error("lease_lost");
  };

  const preflight = workerPreflightInput(args.brief);
  const vo =
    typeof args.brief.voiceover_text === "string"
      ? args.brief.voiceover_text.trim()
      : "";
  const synthesisMeta = args.brief.video_voice_synthesis as
    | { synthesis_text?: string }
    | undefined;
  const synthesisLen =
    typeof synthesisMeta?.synthesis_text === "string"
      ? synthesisMeta.synthesis_text.length
      : vo.length;

  const voiceResult = await runTextToVideoElevenLabsVoicePhase(
    {
      ...preflight,
      projectId: args.projectId,
      packageId: args.packageId,
      jobInput: args.jobInput,
    },
    {
      supabase: args.supabase,
      fetchImpl: args.executorDeps?.fetchImpl,
      now: args.executorDeps?.now,
      elevenLabsCall:
        (args.executorDeps as { elevenLabsCall?: VoiceSynthesisDeps["elevenLabsCall"] })
          ?.elevenLabsCall,
      probeDuration:
        (args.executorDeps as { probeDuration?: VoiceSynthesisDeps["probeDuration"] })
          ?.probeDuration,
    },
  );

  await renew();

  const clipsResult = await runTextToVideoRunwayClipsPhase(
    {
      ...preflight,
      brief: voiceResult.brief,
      projectId: args.projectId,
      packageId: args.packageId,
      videoJobId: args.videoJobId,
      packageBudgetUsd: budgetGate.packageBudgetUsd,
      voiceSynthesisTextLength: synthesisLen,
      confirmPaidRun: budgetGate.confirmPaidRun,
    },
    {
      supabase: args.supabase,
      shouldContinue: args.shouldContinue,
      ...args.executorDeps,
    },
  );

  await renew();

  const assembly = await runTextToVideoAssemblyPhase({
    projectId: args.projectId,
    packageId: args.packageId,
    videoJobId: args.videoJobId,
    brief: clipsResult.brief,
    confirmPaidRun: budgetGate.confirmPaidRun,
    packageBudgetUsd: budgetGate.packageBudgetUsd,
    voiceSynthesisTextLength: synthesisLen,
    subtitlesBurnIn: args.subtitlesBurnIn,
    supabase: args.supabase,
    shouldContinue: args.shouldContinue,
    fetchImpl: args.executorDeps?.fetchImpl,
    downloader: (
      args.executorDeps as { downloader?: import("@/video-worker/services/reel/durableDownload").DurableAssetDownloader }
    )?.downloader,
  });

  await renew();

  const staging = await uploadAssemblyToStaging({
    projectId: args.projectId,
    videoJobId: args.videoJobId,
    mp4LocalPath: assembly.mp4Path,
    thumbnailLocalPath: assembly.thumbnailPath,
    srtLocalPath: assembly.srtPath,
    storage: args.artifactStorage,
  });

  const checkpoint = {
    phase: "assembly_complete" as const,
    assembly_contract_version: TEXT_TO_VIDEO_ASSEMBLY_CONTRACT_VERSION,
    delivery_width: TEXT_TO_VIDEO_ASSEMBLY_DELIVERY_WIDTH,
    delivery_height: TEXT_TO_VIDEO_ASSEMBLY_DELIVERY_HEIGHT,
    assembly_fingerprint: assembly.assemblyFingerprint,
    execution_fingerprint: assembly.executionFingerprint,
    sound_plan_revision: assembly.soundPlanRevision,
    trimmed_clips_fingerprint: assembly.trimmedClipsFingerprint,
    voice_fingerprint: assembly.voiceFingerprint,
    subtitle_fingerprint: assembly.subtitleFingerprint,
    staging: stagingRefsToCheckpointStaging(staging),
    estimate: true as const,
  };

  const briefWithCheckpoint = await persistTextToVideoAssemblyCheckpoint({
    supabase: args.supabase,
    projectId: args.projectId,
    packageId: args.packageId,
    brief: clipsResult.brief,
    checkpoint,
  });

  return {
    kind: "needs_final_promotion",
    staging,
    renderSpec: assembly.renderSpec as RenderSpecOutput,
    debug: {
      package_video_mode: "text_to_video",
      text_to_video_assembly: checkpoint,
      package_brief_updated: Boolean(briefWithCheckpoint),
    },
    cleanupLocal: assembly.cleanupAll,
  };
}
