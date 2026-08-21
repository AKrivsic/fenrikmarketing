/**
 * Full T2V package preflight before the first paid ElevenLabs or Runway POST.
 *
 * Order: creative snapshot → voice plan → dry-run every Runway request →
 * total budget → confirm_paid_run. One invalid scene fails the package.
 */

import { resolveRunwayTextToVideoRequest } from "@/lib/ai/runwayTextToVideoBody";
import { readCreativeReviewFromBrief } from "@/lib/creative-review/read";
import type { CreativeReview } from "@/lib/creative-review/types";
import {
  collectTextToVideoPlanApprovalBlockers,
} from "@/lib/content-package/textToVideoPlanApprovalGate";
import { extractCanonicalVideoScenesFromBrief } from "@/lib/content-package/canonicalVideoPlan";
import {
  readTextToVideoCreativePlan,
  TEXT_TO_VIDEO_TIMING_MEASURED,
} from "@/lib/content-package/textToVideoCreativePlan";
import {
  parseTextToVideoSoundPlan,
} from "@/lib/content-package/textToVideoSoundPlan";
import { parsePackageVideoProductionMode } from "@/lib/content-package/packageVideoProductionMode";
import {
  evaluateVideoPaidPreflight,
  readVideoPaidPreflightState,
} from "@/lib/content-package/videoPaidPreflight";
import {
  composeTextToVideoTechnicalPartPrompt,
  T2V_GEN45_PROMPT_MAX_UTF16,
  utf16CodeUnits,
} from "@/lib/content-package/textToVideoProviderPrompt";
import {
  TEXT_TO_VIDEO_PRE_VOICE_SPLIT_THRESHOLD_SECONDS,
  TEXT_TO_VIDEO_RUNWAY_DURATION_MAX,
  TEXT_TO_VIDEO_RUNWAY_MODEL,
  TEXT_TO_VIDEO_RUNWAY_RATIO,
} from "@/lib/text-to-video/runwayProductionConfig";
import { runwayProviderDurationFromRequiredTrim } from "@/lib/text-to-video/runwayProviderDuration";
import {
  estimateTextToVideoOperatorBudget,
  readExecutionCheckpointFromBrief,
} from "@/lib/text-to-video/textToVideoOperatorBudget";
import {
  assertExcerptCanSplitIntoParts,
  plannedTechnicalPartCountFromEstimate,
  plannedTechnicalPartCountFromMeasured,
  splitEstimatedSceneIntoTechnicalClips,
  TextToVideoTechnicalClipSplitError,
} from "@/lib/text-to-video/technicalClipSplit";
import {
  assertT2vVoiceCategoryDecided,
  readAuthoritativeOpenAiVoiceForT2VOptional,
  resolveAuthoritativeT2vVoiceLanguage,
  T2V_TTS_VOICE_SNAPSHOT_MISSING,
} from "@/lib/text-to-video/textToVideoAuthoritativeVoice";
import { genderHintFromOpenAiVoice, resolveElevenLabsVoiceId } from "@/lib/elevenlabs/voiceResolve";

export const T2V_PACKAGE_PAID_PREFLIGHT_FAILED =
  "t2v_package_paid_preflight_failed" as const;

function readJobPaidGate(jobInput?: Record<string, unknown> | null): {
  confirmPaidRun: boolean;
  packageBudgetUsd: number;
} | null {
  if (!jobInput) return null;
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

export class TextToVideoPackagePaidPreflightError extends Error {
  readonly code: string;
  readonly blockers: string[];
  constructor(code: string, blockers: string[] = [code]) {
    super(blockers.length > 0 ? blockers[0] : code);
    this.code = code;
    this.blockers = blockers;
  }
}

function reviewFromBrief(
  brief: Record<string, unknown>,
  review?: CreativeReview | null,
): CreativeReview | null {
  if (review) return review;
  const read = readCreativeReviewFromBrief(brief);
  return read.ok && read.value ? read.value : null;
}

export function assertTextToVideoCreativeSnapshotReady(args: {
  brief: Record<string, unknown>;
  review?: CreativeReview | null;
}): void {
  const review = reviewFromBrief(args.brief, args.review);
  const plan = readTextToVideoCreativePlan(args.brief);
  const canonical = extractCanonicalVideoScenesFromBrief(args.brief);
  if (canonical.length >= 3) {
    const blockers = collectTextToVideoPlanApprovalBlockers({
      plan,
      brief: args.brief,
      review,
    });
    if (blockers.length > 0) {
      throw new TextToVideoPackagePaidPreflightError(blockers[0]!, blockers);
    }
  }
  if (!plan || plan.status !== "approved") {
    throw new TextToVideoPackagePaidPreflightError("creative_plan_not_approved");
  }
}

export function assertTextToVideoVoicePlanReady(args: {
  brief: Record<string, unknown>;
  jobInput?: Record<string, unknown> | null;
  requireWorkerVoiceId?: boolean;
}): void {
  const voice = readAuthoritativeOpenAiVoiceForT2VOptional({
    jobInput: args.jobInput,
    brief: args.brief,
  });
  if (!voice) {
    throw new TextToVideoPackagePaidPreflightError(T2V_TTS_VOICE_SNAPSHOT_MISSING);
  }
  const language = resolveAuthoritativeT2vVoiceLanguage({
    jobInput: args.jobInput,
    brief: args.brief,
  });
  assertT2vVoiceCategoryDecided(genderHintFromOpenAiVoice(voice));
  if (!args.requireWorkerVoiceId) return;
  const resolved = resolveElevenLabsVoiceId({
    openAiSelectedVoice: voice,
    language,
  });
  if (!resolved?.voiceId) {
    throw new TextToVideoPackagePaidPreflightError("elevenlabs_voice_unconfigured");
  }
}

export function assertTextToVideoRunwayRequestsReady(args: {
  brief: Record<string, unknown>;
}): void {
  const plan = readTextToVideoCreativePlan(args.brief);
  if (!plan) {
    throw new TextToVideoPackagePaidPreflightError("creative_plan_missing");
  }
  const measured = plan.timing_status === TEXT_TO_VIDEO_TIMING_MEASURED;
  for (const scene of plan.scenes) {
    if (!scene.provider_prompt.trim()) {
      throw new TextToVideoPackagePaidPreflightError("t2v_provider_prompt_missing");
    }
    if (utf16CodeUnits(scene.provider_prompt) > T2V_GEN45_PROMPT_MAX_UTF16) {
      throw new TextToVideoPackagePaidPreflightError("t2v_provider_prompt_too_long");
    }
    const excerpt = (scene.voiceover_excerpt ?? scene.human_meaning).trim();
    const duration = scene.approximate_duration_seconds;
    try {
      const partCount = measured
        ? plannedTechnicalPartCountFromMeasured(duration)
        : plannedTechnicalPartCountFromEstimate(duration);
      assertExcerptCanSplitIntoParts({ excerpt, partCount });
      const spans = measured
        ? duration > TEXT_TO_VIDEO_RUNWAY_DURATION_MAX
          ? splitEstimatedSceneIntoTechnicalClips({
              durationSeconds: duration,
              excerpt,
            })
          : [
              {
                partIndex: 0,
                startSeconds: 0,
                endSeconds: duration,
                durationSeconds: duration,
              },
            ]
        : splitEstimatedSceneIntoTechnicalClips({
            durationSeconds: duration,
            excerpt,
          });
      if (!measured && duration > TEXT_TO_VIDEO_PRE_VOICE_SPLIT_THRESHOLD_SECONDS) {
        if (spans.length < 2) {
          throw new TextToVideoTechnicalClipSplitError("t2v_scene_cannot_split");
        }
      }
      for (const span of spans) {
        const prompt = composeTextToVideoTechnicalPartPrompt({
          basePrompt: scene.provider_prompt,
          partIndex: span.partIndex,
          partCount: spans.length,
        });
        const mapped = runwayProviderDurationFromRequiredTrim(span.durationSeconds);
        resolveRunwayTextToVideoRequest(
          {
            model: TEXT_TO_VIDEO_RUNWAY_MODEL,
            promptText: prompt,
            duration: mapped.providerDurationSeconds,
            ratio: TEXT_TO_VIDEO_RUNWAY_RATIO,
            generateAudio: false,
          },
          TEXT_TO_VIDEO_RUNWAY_MODEL,
        );
      }
    } catch (error) {
      const code =
        error instanceof TextToVideoTechnicalClipSplitError
          ? error.code
          : error instanceof Error
            ? error.message
            : "t2v_scene_split_invalid";
      throw new TextToVideoPackagePaidPreflightError(code);
    }
  }
}

export function assertTextToVideoPackageBudgetReady(args: {
  brief: Record<string, unknown>;
  jobInput?: Record<string, unknown> | null;
  confirmPaidRun?: boolean;
  maxBudgetUsd?: number;
}): { packageBudgetUsd: number; confirmPaidRun: boolean; totalUsd: number } {
  const fromJob = readJobPaidGate(args.jobInput);
  const paidState = readVideoPaidPreflightState(args.brief);
  const confirmPaidRun =
    fromJob?.confirmPaidRun === true ||
    args.confirmPaidRun === true ||
    paidState.confirm_paid_run === true;
  const packageBudgetUsd =
    fromJob && fromJob.packageBudgetUsd > 0
      ? fromJob.packageBudgetUsd
      : typeof args.maxBudgetUsd === "number" && args.maxBudgetUsd > 0
        ? args.maxBudgetUsd
        : typeof paidState.max_budget_usd === "number" && paidState.max_budget_usd > 0
          ? paidState.max_budget_usd
          : 0;
  if (!confirmPaidRun) {
    throw new TextToVideoPackagePaidPreflightError("paid_run_not_confirmed");
  }
  if (!(packageBudgetUsd > 0)) {
    throw new TextToVideoPackagePaidPreflightError("budget_limit_required");
  }
  const plan = readTextToVideoCreativePlan(args.brief);
  if (!plan) {
    throw new TextToVideoPackagePaidPreflightError("creative_plan_missing");
  }
  const vo =
    typeof args.brief.voiceover_text === "string"
      ? args.brief.voiceover_text
      : "";
  const estimate = estimateTextToVideoOperatorBudget({
    productionVoiceover: vo,
    plan,
    sound: parseTextToVideoSoundPlan(
      args.brief.video_text_to_video_sound_plan,
    ),
    maxBudgetUsd: packageBudgetUsd,
    executionCheckpoint: readExecutionCheckpointFromBrief(args.brief),
  });
  if (estimate.totalUsd > packageBudgetUsd) {
    throw new TextToVideoPackagePaidPreflightError("insufficient_budget");
  }
  return { packageBudgetUsd, confirmPaidRun, totalUsd: estimate.totalUsd };
}

/**
 * Fail closed before any ElevenLabs or Runway POST.
 * Reuse of existing valid artifacts is decided later by the voice/clip phases.
 */
export function assertTextToVideoPackageReadyForPaidProviders(args: {
  brief: Record<string, unknown>;
  review?: CreativeReview | null;
  jobInput?: Record<string, unknown> | null;
  requireWorkerVoiceId?: boolean;
  confirmPaidRun?: boolean;
  maxBudgetUsd?: number;
}): void {
  if (parsePackageVideoProductionMode(args.brief.package_video_mode) !== "text_to_video") {
    return;
  }
  const review = reviewFromBrief(args.brief, args.review);

  assertTextToVideoCreativeSnapshotReady({ brief: args.brief, review });
  assertTextToVideoVoicePlanReady({
    brief: args.brief,
    jobInput: args.jobInput,
    requireWorkerVoiceId: args.requireWorkerVoiceId === true,
  });
  assertTextToVideoRunwayRequestsReady({ brief: args.brief });
  assertTextToVideoPackageBudgetReady({
    brief: args.brief,
    jobInput: args.jobInput,
    confirmPaidRun: args.confirmPaidRun,
    maxBudgetUsd: args.maxBudgetUsd,
  });

  const preflight = evaluateVideoPaidPreflight({
    packageVideoMode: "text_to_video",
    runPackageVideoMode: "text_to_video",
    generationMode: "production",
    creativeReview: review,
    brief: args.brief,
    enforceFuturePaidGates: true,
    confirmPaidRun: true,
    paidPreflightPhase: "elevenlabs",
    maxBudgetUsd:
      args.maxBudgetUsd ??
      (args.jobInput ? readJobPaidGate(args.jobInput)?.packageBudgetUsd : undefined),
  });
  if (!preflight.ok) {
    throw new TextToVideoPackagePaidPreflightError(
      preflight.blockers[0] ?? T2V_PACKAGE_PAID_PREFLIGHT_FAILED,
      preflight.blockers,
    );
  }

  const plan = readTextToVideoCreativePlan(args.brief);
  if (plan?.timing_status === TEXT_TO_VIDEO_TIMING_MEASURED) {
    const runway = evaluateVideoPaidPreflight({
      packageVideoMode: "text_to_video",
      runPackageVideoMode: "text_to_video",
      generationMode: "production",
      creativeReview: review,
      brief: args.brief,
      enforceFuturePaidGates: true,
      confirmPaidRun: true,
      paidPreflightPhase: "runway",
      maxBudgetUsd:
        args.maxBudgetUsd ??
        (args.jobInput ? readJobPaidGate(args.jobInput)?.packageBudgetUsd : undefined),
    });
    if (!runway.ok) {
      throw new TextToVideoPackagePaidPreflightError(
        runway.blockers[0] ?? T2V_PACKAGE_PAID_PREFLIGHT_FAILED,
        runway.blockers,
      );
    }
  }
}
