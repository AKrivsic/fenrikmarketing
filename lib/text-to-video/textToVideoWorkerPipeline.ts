import type { SupabaseClient } from "@supabase/supabase-js";
import { isElevenLabsTtsEnabled, readElevenLabsApiKey } from "@/lib/elevenlabs/config";
import { runTextToVideoElevenLabsVoicePhase } from "@/lib/text-to-video/voiceSynthesisService";
import { runTextToVideoRunwayClipsPhase } from "@/lib/text-to-video/runTextToVideoRunwayClipsPhase";
import { isTextToVideoRunwayEnabled } from "@/lib/text-to-video/runwayProductionConfig";
import { assertTextToVideoPackageReadyForPaidProviders } from "@/lib/text-to-video/assertTextToVideoPackageReadyForPaidProviders";
import type { TextToVideoRunwayExecutorDeps } from "@/lib/text-to-video/textToVideoRunwayExecutor";
import type { VideoPaidPreflightInput } from "@/lib/content-package/videoPaidPreflight";

export function parseTextToVideoWorkerPaidGate(
  jobInput: Record<string, unknown>,
): {
  confirmPaidRun: boolean;
  packageBudgetUsd: number;
} {
  const confirmPaidRun =
    jobInput.text_to_video_confirm_paid_run === true ||
    jobInput.textToVideoConfirmPaidRun === true;
  const budgetRaw =
    jobInput.text_to_video_max_budget_usd ?? jobInput.textToVideoMaxBudgetUsd;
  const packageBudgetUsd =
    typeof budgetRaw === "number" && Number.isFinite(budgetRaw) && budgetRaw > 0
      ? budgetRaw
      : typeof budgetRaw === "string" &&
          Number.isFinite(Number(budgetRaw)) &&
          Number(budgetRaw) > 0
        ? Number(budgetRaw)
        : 0;
  return { confirmPaidRun, packageBudgetUsd };
}

export function workerPreflightInput(
  brief: Record<string, unknown>,
): VideoPaidPreflightInput {
  return {
    packageVideoMode: "text_to_video",
    runPackageVideoMode: "text_to_video",
    generationMode: "production",
    creativeReview: null,
    brief,
    confirmPaidRun: true,
    enforceFuturePaidGates: true,
  };
}

export async function runTextToVideoWorkerPipeline(
  args: {
    projectId: string;
    packageId: string;
    videoJobId: string;
    brief: Record<string, unknown>;
    jobInput: Record<string, unknown>;
    shouldContinue?: () => boolean;
  },
  deps: TextToVideoRunwayExecutorDeps & {
    supabase: SupabaseClient;
  },
): Promise<{ brief: Record<string, unknown> }> {
  const gate = parseTextToVideoWorkerPaidGate(args.jobInput);
  if (!gate.confirmPaidRun) {
    throw new Error("text_to_video_confirm_paid_run_required");
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
      supabase: deps.supabase,
      fetchImpl: deps.fetchImpl,
      now: deps.now,
    },
  );

  const clipsResult = await runTextToVideoRunwayClipsPhase(
    {
      ...preflight,
      brief: voiceResult.brief,
      projectId: args.projectId,
      packageId: args.packageId,
      videoJobId: args.videoJobId,
      packageBudgetUsd: gate.packageBudgetUsd,
      voiceSynthesisTextLength: synthesisLen,
      confirmPaidRun: gate.confirmPaidRun,
    },
    {
      ...deps,
      shouldContinue: args.shouldContinue,
    },
  );

  return { brief: clipsResult.brief };
}
