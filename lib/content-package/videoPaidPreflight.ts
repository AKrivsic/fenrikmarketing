import type { GenerationMode } from "@/lib/ai/generationMode";
import { defersVideoUntilCreativeReview } from "@/lib/ai/generationMode";
import type { PackageVideoProductionMode } from "@/lib/content-package/packageVideoProductionMode";
import {
  DEFAULT_PACKAGE_VIDEO_PRODUCTION_MODE,
  PACKAGE_VIDEO_MODE_TEXT_TO_VIDEO,
  parsePackageVideoProductionMode,
} from "@/lib/content-package/packageVideoProductionMode";
import {
  readTextToVideoCreativePlan,
  isLegacySentenceFallbackPlan,
  TEXT_TO_VIDEO_TIMING_MEASURED,
} from "@/lib/content-package/textToVideoCreativePlan";
import { extractCanonicalVideoScenesFromBrief } from "@/lib/content-package/canonicalVideoPlan";
import {
  readAuthoritativeOpenAiVoiceForT2VOptional,
} from "@/lib/text-to-video/textToVideoAuthoritativeVoice";
import { VIDEO_VOICE_SYNTHESIS_CHECKPOINT_KEY } from "@/lib/text-to-video/voiceSynthesisCheckpoint";
import {
  readVideoCreativeIntegrity,
  type VideoCreativeIntegrity,
} from "@/lib/content-package/videoCreativeIntegrity";
import type { CreativeReview } from "@/lib/creative-review/types";

export type VideoPaidPreflightBlockReason =
  | "manual_review_not_approved"
  | "hook_stale"
  | "subtitles_stale"
  | "visual_plan_stale"
  | "audio_timing_stale"
  | "voiceover_source_stale"
  | "run_video_mode_mismatch"
  | "paid_run_not_confirmed"
  | "similarity_check_pending"
  | "creative_plan_missing"
  | "creative_plan_stale"
  | "creative_plan_not_approved"
  | "repetition_blocked"
  | "creative_plan_fingerprint_mismatch"
  | "plan_sync_stale"
  | "budget_limit_required"
  | "timing_not_measured"
  | "measured_audio_revision_mismatch"
  | "timing_measurement_not_alignment"
  | "sentence_fallback_plan"
  | "canonical_plan_required"
  | "voice_snapshot_missing"
  | "voice_category_undecided";

export type VideoPaidPreflightPhase = "elevenlabs" | "runway";

export interface VideoPaidPreflightInput {
  packageVideoMode: PackageVideoProductionMode;
  runPackageVideoMode: PackageVideoProductionMode;
  generationMode: GenerationMode;
  creativeReview: CreativeReview | null;
  brief: Record<string, unknown>;
  enforceFuturePaidGates?: boolean;
  confirmPaidRun?: boolean;
  similarityCheckPassed?: boolean;
  maxBudgetUsd?: number;
  /** Which paid provider boundary is being checked (Step 2B). */
  paidPreflightPhase?: VideoPaidPreflightPhase;
}

export interface VideoPaidPreflightResult {
  ok: boolean;
  blockers: VideoPaidPreflightBlockReason[];
}

export interface VideoPaidPreflightState {
  similarity_check_status: "not_run" | "passed" | "failed";
  confirm_paid_run: boolean;
  max_budget_usd?: number;
}

export function defaultVideoPaidPreflightState(): VideoPaidPreflightState {
  return {
    similarity_check_status: "not_run",
    confirm_paid_run: false,
  };
}

export function readVideoPaidPreflightState(
  brief: Record<string, unknown> | null | undefined,
): VideoPaidPreflightState {
  const root =
    brief?.video_paid_preflight &&
    typeof brief.video_paid_preflight === "object" &&
    !Array.isArray(brief.video_paid_preflight)
      ? (brief.video_paid_preflight as Record<string, unknown>)
      : null;
  const status = root?.similarity_check_status;
  const similarity_check_status =
    status === "passed" || status === "failed" ? status : "not_run";
  const budgetRaw = root?.max_budget_usd;
  const max_budget_usd =
    typeof budgetRaw === "number" && Number.isFinite(budgetRaw)
      ? budgetRaw
      : undefined;
  return {
    similarity_check_status,
    confirm_paid_run: root?.confirm_paid_run === true,
    ...(max_budget_usd !== undefined ? { max_budget_usd } : {}),
  };
}

function integrityBlockers(
  integrity: VideoCreativeIntegrity,
  voiceoverText: string | null,
): VideoPaidPreflightBlockReason[] {
  const blockers: VideoPaidPreflightBlockReason[] = [];
  const vo = voiceoverText?.trim() ?? "";
  const approved = integrity.approved_voiceover_text?.trim() ?? "";
  if (vo && approved && vo !== approved) {
    blockers.push("voiceover_source_stale");
  }
  if (
    integrity.voiceover_revision_id &&
    vo &&
    integrity.voiceover_revision_id.length > 0
  ) {
    // revision mismatch surfaced via approved text + plan bindings
  }
  if (integrity.hook_status === "stale") blockers.push("hook_stale");
  if (integrity.subtitles_status === "stale") blockers.push("subtitles_stale");
  if (integrity.visual_plan_status === "stale") {
    blockers.push("visual_plan_stale");
  }
  if (integrity.audio_timing_status === "stale") {
    blockers.push("audio_timing_stale");
  }
  if (integrity.plan_sync_status === "stale") {
    blockers.push("plan_sync_stale");
  }
  return blockers;
}

function textToVideoPlanBlockers(
  brief: Record<string, unknown>,
  enforcePaid: boolean,
  phase: VideoPaidPreflightPhase | undefined,
): VideoPaidPreflightBlockReason[] {
  const blockers: VideoPaidPreflightBlockReason[] = [];
  const plan = readTextToVideoCreativePlan(brief);
  if (!plan) {
    blockers.push("creative_plan_missing");
    return blockers;
  }
  if (plan.status === "stale") blockers.push("creative_plan_stale");
  if (plan.status === "repetition_blocked") blockers.push("repetition_blocked");
  if (enforcePaid && plan.status !== "approved") {
    blockers.push("creative_plan_not_approved");
  }
  if (enforcePaid && plan.repetition.status !== "passed") {
    blockers.push("similarity_check_pending");
  }
  if (enforcePaid) {
    const canonicalCount = extractCanonicalVideoScenesFromBrief(brief).length;
    if (canonicalCount >= 3) {
      if (isLegacySentenceFallbackPlan(plan, canonicalCount)) {
        blockers.push("sentence_fallback_plan");
      }
      if (plan.origin !== "canonical_storyboard") {
        blockers.push("canonical_plan_required");
      }
      if (!readAuthoritativeOpenAiVoiceForT2VOptional({ brief })) {
        blockers.push("voice_snapshot_missing");
      }
    }
  }
  const integrity = readVideoCreativeIntegrity(brief);
  if (
    integrity.creative_plan_fingerprint &&
    integrity.creative_plan_fingerprint !== plan.plan_fingerprint
  ) {
    blockers.push("creative_plan_fingerprint_mismatch");
  }
  if (enforcePaid && phase === "runway") {
    if (plan.timing_status !== TEXT_TO_VIDEO_TIMING_MEASURED) {
      blockers.push("timing_not_measured");
    }
    if (plan.timing_measurement_source !== "alignment") {
      blockers.push("timing_measurement_not_alignment");
    }
    const measuredRev = plan.measured_audio_revision_id?.trim() ?? "";
    if (
      !measuredRev ||
      measuredRev !== plan.voiceover_revision_id.trim()
    ) {
      blockers.push("measured_audio_revision_mismatch");
    }
    const checkpoint = brief?.[VIDEO_VOICE_SYNTHESIS_CHECKPOINT_KEY];
    if (
      !checkpoint ||
      typeof checkpoint !== "object" ||
      Array.isArray(checkpoint)
    ) {
      blockers.push("audio_timing_stale");
    } else {
      const cp = checkpoint as Record<string, unknown>;
      if (
        typeof cp.synthesis_fingerprint !== "string" ||
        typeof cp.audio_path !== "string" ||
        !cp.audio_path
      ) {
        blockers.push("audio_timing_stale");
      }
      if (
        typeof cp.voiceover_revision_id === "string" &&
        cp.voiceover_revision_id !== plan.voiceover_revision_id
      ) {
        blockers.push("measured_audio_revision_mismatch");
      }
    }
  }
  return blockers;
}

export function evaluateVideoPaidPreflight(
  input: VideoPaidPreflightInput,
): VideoPaidPreflightResult {
  const blockers: VideoPaidPreflightBlockReason[] = [];
  const integrity = readVideoCreativeIntegrity(input.brief);
  const voiceoverText =
    typeof input.brief.voiceover_text === "string"
      ? input.brief.voiceover_text
      : null;

  if (defersVideoUntilCreativeReview(input.generationMode)) {
    const approved =
      input.creativeReview?.status === "approved" &&
      Boolean(input.creativeReview.voiceover.final_approved?.trim());
    if (!approved) {
      blockers.push("manual_review_not_approved");
    }
  }

  blockers.push(...integrityBlockers(integrity, voiceoverText));

  const briefMode = parsePackageVideoProductionMode(
    input.brief.package_video_mode,
  );
  const jobMode = input.packageVideoMode;
  const runMode =
    input.runPackageVideoMode ?? DEFAULT_PACKAGE_VIDEO_PRODUCTION_MODE;

  if (briefMode !== runMode || jobMode !== runMode) {
    blockers.push("run_video_mode_mismatch");
  }

  const enforcePaid =
    input.enforceFuturePaidGates === true &&
    input.packageVideoMode === PACKAGE_VIDEO_MODE_TEXT_TO_VIDEO;

  if (input.packageVideoMode === PACKAGE_VIDEO_MODE_TEXT_TO_VIDEO) {
    blockers.push(
      ...textToVideoPlanBlockers(
        input.brief,
        enforcePaid,
        input.paidPreflightPhase,
      ),
    );
  }

  if (enforcePaid) {
    if (input.confirmPaidRun !== true) {
      blockers.push("paid_run_not_confirmed");
    }
    const paidState = readVideoPaidPreflightState(input.brief);
    if (input.similarityCheckPassed !== true) {
      if (paidState.similarity_check_status !== "passed") {
        blockers.push("similarity_check_pending");
      }
    }
    const budget = input.maxBudgetUsd ?? paidState.max_budget_usd;
    if (budget === undefined || !Number.isFinite(budget) || budget <= 0) {
      blockers.push("budget_limit_required");
    }
  }

  return { ok: blockers.length === 0, blockers };
}

export const VIDEO_PAID_SIMILARITY_CHECK_STAGE =
  "pre_provider_paid_generation" as const;
