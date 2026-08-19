import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json } from "@/lib/supabase/types";
import { readTextToVideoCreativePlan } from "@/lib/content-package/textToVideoCreativePlan";
import { assertTextToVideoRunwayPreflight } from "@/lib/content-package/textToVideoPaidEntry";
import type { VideoPaidPreflightInput } from "@/lib/content-package/videoPaidPreflight";
import {
  VIDEO_VOICE_SYNTHESIS_CHECKPOINT_KEY,
  type VoiceSynthesisCheckpoint,
} from "@/lib/text-to-video/voiceSynthesisCheckpoint";
import { buildTextToVideoRunwayExecutionPlan } from "@/lib/text-to-video/runwayExecutionPlan";
import {
  executeTextToVideoRunwayPlan,
  type TextToVideoRunwayExecutorDeps,
} from "@/lib/text-to-video/textToVideoRunwayExecutor";
import {
  VIDEO_SCENE_CLIPS_CHECKPOINT_KEY,
  type TextToVideoSceneClipsCheckpoint,
} from "@/lib/text-to-video/sceneClipsCheckpoint";
import { validateSceneClipsCheckpointStructure } from "@/lib/text-to-video/sceneClipsCheckpointValidation";
import { assertSceneClipsCheckpointArtifacts } from "@/lib/text-to-video/sceneClipsCheckpointValidation";
import { validateTextToVideoSceneClipBuffer } from "@/lib/text-to-video/validateSceneClip";
import {
  downloadSceneVideoAttemptClip,
  markTextToVideoClipValidationFailed,
} from "@/lib/text-to-video/sceneAttemptClipOps";
import { isTextToVideoRunwayEnabled } from "@/lib/text-to-video/runwayProductionConfig";

export class TextToVideoRunwayPhaseError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

export async function runTextToVideoRunwayClipsPhase(
  args: VideoPaidPreflightInput & {
    projectId: string;
    packageId: string;
    videoJobId: string;
    packageBudgetUsd: number;
    voiceSynthesisTextLength: number;
    confirmPaidRun: boolean;
  },
  deps: TextToVideoRunwayExecutorDeps & { supabase: SupabaseClient },
): Promise<{
  brief: Record<string, unknown>;
  checkpoint: TextToVideoSceneClipsCheckpoint;
  runwayPostCount: number;
}> {
  if (!isTextToVideoRunwayEnabled()) {
    throw new TextToVideoRunwayPhaseError("runway_disabled");
  }
  assertTextToVideoRunwayPreflight(args);

  const voiceRaw = args.brief[VIDEO_VOICE_SYNTHESIS_CHECKPOINT_KEY];
  if (!voiceRaw || typeof voiceRaw !== "object") {
    throw new TextToVideoRunwayPhaseError("voice_checkpoint_missing");
  }
  const voiceCheckpoint = voiceRaw as VoiceSynthesisCheckpoint;

  const plan = readTextToVideoCreativePlan(args.brief);
  if (!plan) {
    throw new TextToVideoRunwayPhaseError("creative_plan_missing");
  }

  const executionPlan = buildTextToVideoRunwayExecutionPlan({
    plan,
    voiceCheckpoint,
  });

  const existingClips = args.brief[VIDEO_SCENE_CLIPS_CHECKPOINT_KEY];
  if (
    existingClips &&
    validateSceneClipsCheckpointStructure(
      existingClips,
      {
        executionFingerprint: executionPlan.executionFingerprint,
        voiceCheckpointFingerprint: voiceCheckpoint.synthesis_fingerprint,
        creativePlanFingerprint: plan.plan_fingerprint,
        synthesisFingerprint: voiceCheckpoint.synthesis_fingerprint,
      },
      executionPlan,
    )
  ) {
    await assertSceneClipsCheckpointArtifacts(
      deps.supabase,
      existingClips as TextToVideoSceneClipsCheckpoint,
      executionPlan,
      async (bucket, path) => {
        try {
          const ref = (existingClips as TextToVideoSceneClipsCheckpoint).scenes.find(
            (s) => s.output_bucket === bucket && s.output_path === path,
          );
          if (!ref) return false;
          const buf = await downloadSceneVideoAttemptClip(
            deps.supabase,
            bucket,
            path,
          );
          const v = await validateTextToVideoSceneClipBuffer({
            buffer: buf,
            minDurationSeconds: ref.required_trim_seconds,
            providerDurationSeconds: ref.provider_duration_seconds,
          });
          return v.ok;
        } catch {
          return false;
        }
      },
    );
    return {
      brief: args.brief,
      checkpoint: existingClips as TextToVideoSceneClipsCheckpoint,
      runwayPostCount: 0,
    };
  }

  const execResult = await executeTextToVideoRunwayPlan(
    {
      projectId: args.projectId,
      videoJobId: args.videoJobId,
      plan: executionPlan,
      packageBudgetUsd: args.packageBudgetUsd,
      voiceSynthesisTextLength: args.voiceSynthesisTextLength,
      confirmPaidRun: args.confirmPaidRun,
    },
    {
      ...deps,
      supabase: deps.supabase,
      downloadSceneClip: (bucket, path) =>
        downloadSceneVideoAttemptClip(deps.supabase, bucket, path),
      markClipValidationFailed: markTextToVideoClipValidationFailed,
    },
  );

  if (execResult.status !== "completed") {
    throw new TextToVideoRunwayPhaseError(
      execResult.blockedReason ?? execResult.status,
    );
  }

  const scenes = executionPlan.items.map((item) => {
    const view = execResult.attemptsBySceneId.get(item.sceneId);
    if (!view?.outputBucket || !view.outputPath) {
      throw new TextToVideoRunwayPhaseError("scene_output_missing");
    }
    return {
      scene_id: item.sceneId,
      attempt_id: view.id,
      output_bucket: view.outputBucket,
      output_path: view.outputPath,
      provider_duration_seconds: item.providerDurationSeconds,
      required_trim_seconds: item.requiredTrimSeconds,
      estimated_cost_usd: item.estimatedCostUsd,
      request_fingerprint: item.requestFingerprint,
    };
  });

  const checkpoint: TextToVideoSceneClipsCheckpoint = {
    phase: "scene_clips_complete",
    execution_fingerprint: executionPlan.executionFingerprint,
    voice_checkpoint_fingerprint: voiceCheckpoint.synthesis_fingerprint,
    creative_plan_fingerprint: plan.plan_fingerprint,
    synthesis_fingerprint: voiceCheckpoint.synthesis_fingerprint,
    scenes,
    total_estimated_cost_usd: executionPlan.totalEstimatedCostUsd,
    estimate: true,
  };

  const brief = {
    ...args.brief,
    [VIDEO_SCENE_CLIPS_CHECKPOINT_KEY]: checkpoint,
  };

  const { data, error } = await deps.supabase
    .from("content_packages")
    .update({ package_brief: brief as unknown as Json })
    .eq("id", args.packageId)
    .eq("project_id", args.projectId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) {
    throw new TextToVideoRunwayPhaseError("package_brief_update_failed");
  }

  return {
    brief,
    checkpoint,
    runwayPostCount: execResult.runwayPostCount,
  };
}
