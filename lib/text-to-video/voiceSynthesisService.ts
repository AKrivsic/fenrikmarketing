import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import type { Json } from "@/lib/supabase/types";
import type { VideoPaidPreflightInput } from "@/lib/content-package/videoPaidPreflight";
import { assertTextToVideoElevenLabsPreflight } from "@/lib/content-package/textToVideoPaidEntry";
import {
  readTextToVideoCreativePlan,
  TEXT_TO_VIDEO_TIMING_ESTIMATED,
  serializeTextToVideoCreativePlan,
} from "@/lib/content-package/textToVideoCreativePlan";
import { readVoiceDirectionFromBrief } from "@/lib/content-package/voiceDirectionContract";
import {
  serializeVideoCreativeIntegrity,
  syncVideoCreativeIntegrityFromSources,
} from "@/lib/content-package/videoCreativeIntegrity";
import { voiceoverRevisionId } from "@/lib/content-package/videoCreativeRevision";
import { resolveTtsOptions } from "@/lib/voice/resolveTtsOptions";
import { resolveElevenLabsVoiceId } from "@/lib/elevenlabs/voiceResolve";
import {
  buildElevenV3SynthesisText,
  synthesisInputFingerprint,
} from "@/lib/elevenlabs/v3VoiceDirection";
import {
  ELEVENLABS_DEFAULT_OUTPUT_FORMAT,
  ELEVENLABS_MODEL_ELEVEN_V3,
  estimateElevenLabsTtsCostUsd,
  elevenLabsTtsReady,
  isElevenLabsTtsEnabled,
  readElevenLabsApiKey,
  voiceSynthesisBudgetExposureUsd,
} from "@/lib/elevenlabs/config";
import {
  ElevenLabsAdapterError,
  elevenLabsErrorImpliesSubmissionUnknown,
  elevenLabsErrorIsProviderRejected,
  elevenLabsTextToSpeechWithTimestamps,
  type ElevenLabsWithTimestampsResponse,
  validateElevenLabsAlignment,
} from "@/lib/elevenlabs/adapter";
import { alignmentCoversFullVoiceover } from "@/lib/elevenlabs/alignmentVoiceover";
import { selectAlignmentForApprovedVoiceover } from "@/lib/elevenlabs/selectAlignmentForVoiceover";
import {
  cuesToSrt,
  subtitleCuesFromElevenAlignment,
} from "@/lib/elevenlabs/subtitlesFromAlignment";
import { applyAlignmentMeasuredTimingToPlan } from "@/lib/text-to-video/measuredSceneTiming";
import { packageBriefDefersVideoJob } from "@/lib/content-package/creativeReviewDeferral";
import { parsePackageVideoProductionMode } from "@/lib/content-package/packageVideoProductionMode";
import {
  VIDEO_VOICE_SYNTHESIS_CHECKPOINT_KEY,
  type VoiceSynthesisCheckpoint,
} from "@/lib/text-to-video/voiceSynthesisCheckpoint";
import {
  assertAcceptableVoiceoverDuration,
  probeAudioBufferDurationSeconds,
} from "@/lib/audio/probeAudioDuration";
import {
  adoptExistingVoiceArtifactIfPresent,
  assertAllowedVoiceBucket,
  expectedVoiceSynthesisAudioPath,
  uploadVoiceArtifactWithRetries,
} from "@/lib/text-to-video/voiceSynthesisArtifact";
import {
  claimVoiceSynthesisSubmission,
  loadOrCreateVoiceSynthesisAttempt,
  loadVoiceSynthesisAttempt,
  markOwnedVoiceSynthesisTerminal,
  markOwnedVoiceSynthesisUpdate,
  markPreSubmissionFailed,
  markSubmissionUnknownOwned,
  markSubmissionUnknownUnowned,
  resolveVoiceSynthesisRowForSubmit,
  VoiceSynthesisInputIntegrityError,
  VoiceSynthesisLeaseLostError,
  type VoiceSynthesisRow,
  isSubmissionClaimStaleRow,
} from "@/lib/text-to-video/voiceSynthesisRepository";
import { STORAGE_BUCKETS } from "@/lib/api/storage";
import { validateVoiceCheckpointForEarlyReuse } from "@/lib/text-to-video/voiceCheckpointValidation";
import { VOICE_SYNTHESIS_SUBMISSION_CLAIM_STALE_MS } from "@/lib/text-to-video/voiceSynthesisConstants";

export type { VoiceSynthesisCheckpoint } from "@/lib/text-to-video/voiceSynthesisCheckpoint";
export { VIDEO_VOICE_SYNTHESIS_CHECKPOINT_KEY } from "@/lib/text-to-video/voiceSynthesisCheckpoint";

export class TextToVideoVoiceSynthesisError extends Error {
  readonly code: string;
  constructor(code: string, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

export interface VoiceSynthesisDeps {
  supabase: SupabaseClient;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  elevenLabsCall?: (
    req: Parameters<typeof elevenLabsTextToSpeechWithTimestamps>[0],
  ) => Promise<ElevenLabsWithTimestampsResponse>;
  probeDuration?: (audio: Buffer) => Promise<number>;
}

function nowFn(deps: VoiceSynthesisDeps): () => Date {
  return deps.now ?? (() => new Date());
}

export async function runTextToVideoElevenLabsVoicePhase(
  input: VideoPaidPreflightInput & {
    projectId: string;
    packageId: string;
  },
  deps: VoiceSynthesisDeps,
): Promise<{ checkpoint: VoiceSynthesisCheckpoint; brief: Record<string, unknown> }> {
  const mode = parsePackageVideoProductionMode(input.brief.package_video_mode);
  if (mode !== "text_to_video") {
    throw new TextToVideoVoiceSynthesisError("not_text_to_video");
  }
  if (!isElevenLabsTtsEnabled()) {
    throw new TextToVideoVoiceSynthesisError("elevenlabs_disabled");
  }
  if (!readElevenLabsApiKey()) {
    throw new TextToVideoVoiceSynthesisError("elevenlabs_api_key_missing");
  }
  assertTextToVideoElevenLabsPreflight(input);
  if (packageBriefDefersVideoJob(input.brief)) {
    throw new TextToVideoVoiceSynthesisError("creative_review_pending");
  }

  const built = await buildSynthesisContext(input, deps);
  if ("earlyReturn" in built && built.earlyReturn) {
    return built.earlyReturn;
  }
  const ctx = built;
  const audioPath = expectedVoiceSynthesisAudioPath(
    input.projectId,
    input.packageId,
    ctx.fingerprint,
  );

  let attempt: VoiceSynthesisRow;
  try {
    attempt = await loadOrCreateVoiceSynthesisAttempt(deps.supabase, {
    projectId: input.projectId,
    packageId: input.packageId,
    fingerprint: ctx.fingerprint,
    voiceoverRevisionId: ctx.voRev,
    voiceId: ctx.resolvedVoice.voiceId,
    modelId: ELEVENLABS_MODEL_ELEVEN_V3,
    outputFormat: ELEVENLABS_DEFAULT_OUTPUT_FORMAT,
    estimatedCostUsd: ctx.estimate,
    synthesisInput: ctx.synthesisInput,
    });
  } catch (e) {
    if (e instanceof VoiceSynthesisInputIntegrityError) {
      throw new TextToVideoVoiceSynthesisError("synthesis_input_integrity_mismatch");
    }
    throw e;
  }

  attempt = await resolveVoiceSynthesisRowForSubmit(
    deps.supabase,
    attempt,
    nowFn(deps),
  );

  const budget =
    input.maxBudgetUsd ??
    (input.brief.video_paid_preflight as { max_budget_usd?: number } | undefined)
      ?.max_budget_usd;
  const exposure = voiceSynthesisBudgetExposureUsd({
    estimatedCostUsd: ctx.estimate,
    status: attempt.status,
  });
  if (budget !== undefined && exposure > budget) {
    throw new TextToVideoVoiceSynthesisError("budget_insufficient");
  }

  if (attempt.status === "completed") {
    return reuseCompletedAttempt(deps, input, ctx, attempt, audioPath);
  }

  if (
    attempt.status === "submission_unknown" ||
    attempt.status === "needs_review" ||
    attempt.status === "provider_rejected"
  ) {
    throw new TextToVideoVoiceSynthesisError("submission_unknown_needs_review");
  }

  if (attempt.status === "artifact_recovery_required") {
    const adopted = await adoptExistingVoiceArtifactIfPresent(
      deps.supabase,
      audioPath,
      attempt.audio_duration_seconds as number | undefined,
      deps.probeDuration,
    );
    if (adopted) {
      return completeFromAdoptedArtifact(deps, input, ctx, attempt, {
        audioPath,
        duration: adopted.duration,
        align: attempt.alignment,
        cues: attempt.subtitle_cues,
      });
    }
    throw new TextToVideoVoiceSynthesisError("artifact_recovery_needs_review");
  }

  const owner = randomUUID();
  const claimed = await claimVoiceSynthesisSubmission(
    deps.supabase,
    attempt,
    owner,
    nowFn(deps),
  );
  if (!claimed) {
    const refreshed = await loadVoiceSynthesisAttempt(deps.supabase, attempt.id);
    if (refreshed.status === "completed") {
      return reuseCompletedAttempt(deps, input, ctx, refreshed, audioPath);
    }
    throw new TextToVideoVoiceSynthesisError("synthesis_claim_busy");
  }
  attempt = claimed;

  const call =
    deps.elevenLabsCall ??
    ((req) =>
      elevenLabsTextToSpeechWithTimestamps(req, {
        fetchImpl: deps.fetchImpl,
        apiKey: readElevenLabsApiKey(),
      }));

  let response: ElevenLabsWithTimestampsResponse;
  try {
    response = await call({
      voiceId: ctx.resolvedVoice.voiceId,
      text: ctx.synthesis.synthesis_text,
      modelId: ELEVENLABS_MODEL_ELEVEN_V3,
      outputFormat: ELEVENLABS_DEFAULT_OUTPUT_FORMAT,
    });
  } catch (err) {
    await handleProviderCallFailure(deps, attempt.id, owner, err);
    throw classifyProviderError(err);
  }

  try {
    attempt = await markOwnedVoiceSynthesisUpdate(deps.supabase, {
      id: attempt.id,
      owner,
      expectedStatus: "submitting",
      patch: { status: "response_received" },
      now: nowFn(deps),
    });
  } catch (e) {
    if (e instanceof VoiceSynthesisLeaseLostError) {
      throw new TextToVideoVoiceSynthesisError("synthesis_claim_lost");
    }
    throw e;
  }

  return processProviderResponse(deps, input, ctx, attempt, owner, response, audioPath);
}

async function buildSynthesisContext(
  input: VideoPaidPreflightInput & { projectId: string; packageId: string },
  deps: VoiceSynthesisDeps,
) {
  const { data: projectRow, error: projectErr } = await deps.supabase
    .from("projects")
    .select("id, language, tone_of_voice, knowledge, target_audience")
    .eq("id", input.projectId)
    .maybeSingle();
  if (projectErr) throw projectErr;
  if (!projectRow) {
    throw new TextToVideoVoiceSynthesisError("project_not_found");
  }
  const plan = readTextToVideoCreativePlan(input.brief);
  if (!plan || plan.status !== "approved" || plan.repetition.status !== "passed") {
    throw new TextToVideoVoiceSynthesisError("creative_plan_not_ready");
  }
  if (plan.timing_status !== TEXT_TO_VIDEO_TIMING_ESTIMATED) {
    const existing = input.brief[VIDEO_VOICE_SYNTHESIS_CHECKPOINT_KEY];
    if (existing && typeof existing === "object") {
      /* validated below after synthesis context fields are known */
    }
  }
  const vo =
    typeof input.brief.voiceover_text === "string"
      ? input.brief.voiceover_text.trim()
      : "";
  if (!vo) throw new TextToVideoVoiceSynthesisError("voiceover_missing");
  const voRev = voiceoverRevisionId(vo);
  if (voRev !== plan.voiceover_revision_id) {
    throw new TextToVideoVoiceSynthesisError("voiceover_revision_mismatch");
  }
  const direction = readVoiceDirectionFromBrief(input.brief);
  if (!direction) {
    throw new TextToVideoVoiceSynthesisError("voice_direction_missing");
  }
  const ttsOpts = resolveTtsOptions({
    projectId: input.projectId,
    language: (projectRow.language as "cs") ?? "cs",
    toneOfVoice: projectRow.tone_of_voice ?? {},
    knowledge: projectRow.knowledge ?? {},
    targetAudience: projectRow.target_audience ?? null,
  });
  const resolvedVoice = resolveElevenLabsVoiceId({
    openAiSelectedVoice: ttsOpts.voice,
  });
  if (!resolvedVoice) {
    throw new TextToVideoVoiceSynthesisError("elevenlabs_voice_unconfigured");
  }
  const synthesis = buildElevenV3SynthesisText({
    approvedVoiceover: vo,
    direction,
  });
  const fingerprint = synthesisInputFingerprint({
    voiceover_revision_id: voRev,
    voice_direction_revision: direction.revision ?? 0,
    synthesis_text: synthesis.synthesis_text,
    voice_id: resolvedVoice.voiceId,
    model_id: ELEVENLABS_MODEL_ELEVEN_V3,
    output_format: ELEVENLABS_DEFAULT_OUTPUT_FORMAT,
    direction_contract_version: synthesis.direction_contract_version,
  });
  const estimate = estimateElevenLabsTtsCostUsd(synthesis.synthesis_text.length);
  const synthesisInput = {
    ...synthesis,
    voice_id: resolvedVoice.voiceId,
    model_id: ELEVENLABS_MODEL_ELEVEN_V3,
    output_format: ELEVENLABS_DEFAULT_OUTPUT_FORMAT,
    voice_diagnostic: resolvedVoice.diagnostic,
  };
  if (plan.timing_status !== TEXT_TO_VIDEO_TIMING_ESTIMATED) {
    const existing = input.brief[VIDEO_VOICE_SYNTHESIS_CHECKPOINT_KEY];
    if (existing && typeof existing === "object") {
      try {
        const checkpoint = await validateVoiceCheckpointForEarlyReuse(
          deps.supabase,
          {
            brief: input.brief,
            projectId: input.projectId,
            packageId: input.packageId,
            fingerprint,
            voiceId: resolvedVoice.voiceId,
            modelId: ELEVENLABS_MODEL_ELEVEN_V3,
            outputFormat: ELEVENLABS_DEFAULT_OUTPUT_FORMAT,
            synthesisInput,
            probeDuration: deps.probeDuration,
          },
        );
        return {
          earlyReturn: {
            checkpoint,
            brief: input.brief,
          },
        } as const;
      } catch {
        throw new TextToVideoVoiceSynthesisError("voice_checkpoint_reuse_blocked");
      }
    }
  }
  return {
    plan,
    vo,
    voRev,
    synthesis,
    fingerprint,
    estimate,
    synthesisInput,
    resolvedVoice,
  } as const;
}

type SynthesisContext = {
  plan: NonNullable<ReturnType<typeof readTextToVideoCreativePlan>>;
  vo: string;
  voRev: string;
  synthesis: ReturnType<typeof buildElevenV3SynthesisText>;
  fingerprint: string;
  estimate: number;
  synthesisInput: Record<string, unknown>;
  resolvedVoice: NonNullable<ReturnType<typeof resolveElevenLabsVoiceId>>;
};

function classifyProviderError(err: unknown): TextToVideoVoiceSynthesisError {
  if (err instanceof ElevenLabsAdapterError) {
    if (elevenLabsErrorIsProviderRejected(err)) {
      return new TextToVideoVoiceSynthesisError("provider_rejected");
    }
    if (elevenLabsErrorImpliesSubmissionUnknown(err)) {
      return new TextToVideoVoiceSynthesisError("submission_unknown");
    }
  }
  return new TextToVideoVoiceSynthesisError("elevenlabs_failed");
}

async function handleProviderCallFailure(
  deps: VoiceSynthesisDeps,
  attemptId: string,
  owner: string,
  err: unknown,
): Promise<void> {
  if (err instanceof ElevenLabsAdapterError) {
    if (elevenLabsErrorIsProviderRejected(err)) {
      try {
        await markOwnedVoiceSynthesisTerminal(deps.supabase, {
          id: attemptId,
          owner,
          status: "provider_rejected",
          errorCode: err.code,
          errorMessage: err.message,
          now: nowFn(deps),
        });
      } catch {
        /* claim lost — row may already be terminal */
      }
      return;
    }
    if (elevenLabsErrorImpliesSubmissionUnknown(err)) {
      try {
        await markSubmissionUnknownOwned(
          deps.supabase,
          attemptId,
          owner,
          err.code,
          nowFn(deps),
        );
      } catch {
        /* claim lost */
      }
      return;
    }
  }
  try {
    await markSubmissionUnknownOwned(
      deps.supabase,
      attemptId,
      owner,
      "provider_error",
      nowFn(deps),
    );
  } catch {
    /* */
  }
}

async function markPostResponseNeedsReview(
  deps: VoiceSynthesisDeps,
  attemptId: string,
  owner: string,
  errorCode: string,
  errorMessage: string,
): Promise<void> {
  try {
    await markOwnedVoiceSynthesisTerminal(deps.supabase, {
      id: attemptId,
      owner,
      status: "needs_review",
      errorCode,
      errorMessage,
      now: nowFn(deps),
    });
  } catch {
    /* */
  }
}

async function markArtifactRecoveryRequired(
  deps: VoiceSynthesisDeps,
  attemptId: string,
  owner: string,
  patch: Record<string, unknown>,
): Promise<void> {
  try {
    await markOwnedVoiceSynthesisUpdate(deps.supabase, {
      id: attemptId,
      owner,
      expectedStatus: ["response_received", "submitting"],
      patch: {
        status: "artifact_recovery_required",
        submission_claim_owner: null,
        submission_claimed_at: null,
        ...patch,
      },
      now: nowFn(deps),
    });
  } catch {
    /* */
  }
}

async function processProviderResponse(
  deps: VoiceSynthesisDeps,
  input: VideoPaidPreflightInput & { projectId: string; packageId: string },
  ctx: SynthesisContext,
  attempt: VoiceSynthesisRow,
  owner: string,
  response: ElevenLabsWithTimestampsResponse,
  audioPath: string,
): Promise<{ checkpoint: VoiceSynthesisCheckpoint; brief: Record<string, unknown> }> {
  let audio: Buffer;
  try {
    audio = Buffer.from(response.audio_base64, "base64");
    if (audio.length < 128) throw new Error("invalid_audio");
  } catch {
    await markPostResponseNeedsReview(
      deps,
      attempt.id,
      owner,
      "invalid_audio",
      "Provider audio invalid after response",
    );
    throw new TextToVideoVoiceSynthesisError("needs_review");
  }

  const probeFn = deps.probeDuration ?? probeAudioBufferDurationSeconds;
  let duration: number;
  try {
    duration = await probeFn(audio);
    assertAcceptableVoiceoverDuration(duration);
  } catch {
    await markPostResponseNeedsReview(
      deps,
      attempt.id,
      owner,
      "audio_duration_invalid",
      "Audio duration invalid after provider response",
    );
    throw new TextToVideoVoiceSynthesisError("needs_review");
  }

  let align;
  try {
    const selected = selectAlignmentForApprovedVoiceover(response, ctx.vo);
    align = selected.alignment;
    alignmentCoversFullVoiceover(align, ctx.vo, duration);
  } catch (e) {
    await markPostResponseNeedsReview(
      deps,
      attempt.id,
      owner,
      "alignment_invalid",
      e instanceof Error ? e.message : "alignment_invalid",
    );
    throw new TextToVideoVoiceSynthesisError("needs_review");
  }

  let cues;
  let srt: string;
  try {
    cues = subtitleCuesFromElevenAlignment(align, ctx.vo);
    if (cues.length === 0) throw new Error("alignment_empty");
    srt = cuesToSrt(cues);
  } catch (e) {
    await markPostResponseNeedsReview(
      deps,
      attempt.id,
      owner,
      "alignment_voiceover_mismatch",
      e instanceof Error ? e.message : "subtitle_failed",
    );
    throw new TextToVideoVoiceSynthesisError("needs_review");
  }

  try {
    await uploadVoiceArtifactWithRetries(deps.supabase, audioPath, audio);
  } catch (e) {
    await markArtifactRecoveryRequired(deps, attempt.id, owner, {
      error_code: "storage_upload_failed",
      error_message: e instanceof Error ? e.message : "storage_failed",
      alignment: align as unknown as Json,
      subtitle_cues: cues as unknown as Json,
      audio_duration_seconds: duration,
    });
    throw new TextToVideoVoiceSynthesisError("artifact_recovery_required");
  }

  let completed: VoiceSynthesisRow;
  try {
    completed = await markOwnedVoiceSynthesisUpdate(deps.supabase, {
      id: attempt.id,
      owner,
      expectedStatus: "response_received",
      patch: {
        status: "completed",
        audio_bucket: STORAGE_BUCKETS.videoRenders,
        audio_path: audioPath,
        audio_duration_seconds: duration,
        alignment: align as unknown as Json,
        subtitle_cues: cues as unknown as Json,
        submission_claim_owner: null,
        submission_claimed_at: null,
        error_code: null,
        error_message: null,
      },
      now: nowFn(deps),
    });
  } catch (e) {
    if (e instanceof VoiceSynthesisLeaseLostError) {
      const adopted = await adoptExistingVoiceArtifactIfPresent(
        deps.supabase,
        audioPath,
        duration,
        deps.probeDuration,
      );
      if (adopted) {
        return finalizeFromAttempt(deps, input, ctx.plan, {
          ...attempt,
          status: "completed",
          audio_bucket: STORAGE_BUCKETS.videoRenders,
          audio_path: audioPath,
          audio_duration_seconds: duration,
          synthesis_fingerprint: ctx.fingerprint,
        }, { subtitle_cues: cues, subtitle_srt: srt, align });
      }
    }
    await markArtifactRecoveryRequired(deps, attempt.id, owner, {
      error_code: "db_complete_failed",
      alignment: align as unknown as Json,
      subtitle_cues: cues as unknown as Json,
      audio_duration_seconds: duration,
    });
    throw new TextToVideoVoiceSynthesisError("artifact_recovery_required");
  }

  return finalizeFromAttempt(deps, input, ctx.plan, completed, {
    subtitle_cues: cues,
    subtitle_srt: srt,
    align,
  });
}

async function reuseCompletedAttempt(
  deps: VoiceSynthesisDeps,
  input: VideoPaidPreflightInput & { projectId: string; packageId: string },
  ctx: SynthesisContext,
  row: VoiceSynthesisRow,
  expectedPath: string,
): Promise<{ checkpoint: VoiceSynthesisCheckpoint; brief: Record<string, unknown> }> {
  const bucket = String(row.audio_bucket ?? "");
  const path = String(row.audio_path ?? "");
  try {
    assertAllowedVoiceBucket(bucket);
    if (path !== expectedPath) {
      throw new Error("audio_path_mismatch");
    }
    if (String(row.voiceover_revision_id) !== ctx.voRev) {
      throw new Error("voiceover_revision_mismatch");
    }
    if (row.synthesis_fingerprint !== ctx.fingerprint) {
      throw new Error("fingerprint_mismatch");
    }
    await adoptExistingVoiceArtifactIfPresent(
      deps.supabase,
      path,
      row.audio_duration_seconds as number | undefined,
      deps.probeDuration,
    );
  } catch {
    await deps.supabase
      .from("text_to_video_voice_syntheses")
      .update({
        status: "needs_review",
        error_code: "completed_artifact_invalid",
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .eq("status", "completed");
    throw new TextToVideoVoiceSynthesisError("completed_artifact_invalid");
  }
  return finalizeFromAttempt(deps, input, ctx.plan, row);
}

async function completeFromAdoptedArtifact(
  deps: VoiceSynthesisDeps,
  input: VideoPaidPreflightInput & { projectId: string; packageId: string },
  ctx: SynthesisContext,
  row: VoiceSynthesisRow,
  args: {
    audioPath: string;
    duration: number;
    align: unknown;
    cues: unknown;
  },
): Promise<{ checkpoint: VoiceSynthesisCheckpoint; brief: Record<string, unknown> }> {
  const align = validateElevenLabsAlignment(args.align);
  const cues = subtitleCuesFromElevenAlignment(align, ctx.vo);
  const srt = cuesToSrt(cues);
  const { data, error } = await deps.supabase
    .from("text_to_video_voice_syntheses")
    .update({
      status: "completed",
      audio_bucket: STORAGE_BUCKETS.videoRenders,
      audio_path: args.audioPath,
      audio_duration_seconds: args.duration,
      alignment: align as unknown as Json,
      subtitle_cues: cues as unknown as Json,
      submission_claim_owner: null,
      submission_claimed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .eq("status", "artifact_recovery_required")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new TextToVideoVoiceSynthesisError("artifact_recovery_race");
  }
  return finalizeFromAttempt(deps, input, ctx.plan, data as VoiceSynthesisRow, {
    subtitle_cues: cues,
    subtitle_srt: srt,
    align,
  });
}

async function finalizeFromAttempt(
  deps: VoiceSynthesisDeps,
  input: VideoPaidPreflightInput & { projectId: string; packageId: string },
  plan: NonNullable<ReturnType<typeof readTextToVideoCreativePlan>>,
  row: Record<string, unknown>,
  extras?: {
    subtitle_cues?: unknown;
    subtitle_srt?: string;
    align?: import("@/lib/elevenlabs/adapter").ElevenLabsCharacterAlignment;
  },
): Promise<{ checkpoint: VoiceSynthesisCheckpoint; brief: Record<string, unknown> }> {
  const vo =
    typeof input.brief.voiceover_text === "string"
      ? input.brief.voiceover_text.trim()
      : "";
  const duration = Number(row.audio_duration_seconds);
  let align = extras?.align;
  if (!align && row.alignment) {
    align = validateElevenLabsAlignment(row.alignment);
  }
  if (!align) {
    throw new TextToVideoVoiceSynthesisError("alignment_missing");
  }
  const measured = applyAlignmentMeasuredTimingToPlan({
    plan,
    alignment: align,
    approvedVoiceover: vo,
    audioDurationSeconds: duration,
    measuredAudioRevisionId: plan.voiceover_revision_id,
    synthesisFingerprint: String(row.synthesis_fingerprint),
  });
  const checkpoint: VoiceSynthesisCheckpoint = {
    synthesis_attempt_id: String(row.id),
    synthesis_fingerprint: String(row.synthesis_fingerprint),
    voiceover_revision_id: plan.voiceover_revision_id,
    voice_id: String(row.voice_id),
    model_id: String(row.model_id),
    audio_bucket: String(row.audio_bucket),
    audio_path: String(row.audio_path),
    audio_duration_seconds: duration,
    phase: "voice_complete",
  };
  const srt =
    extras?.subtitle_srt ??
    (typeof row.subtitle_cues === "object" && Array.isArray(row.subtitle_cues)
      ? cuesToSrt(row.subtitle_cues as Parameters<typeof cuesToSrt>[0])
      : typeof input.brief.subtitles === "string"
        ? input.brief.subtitles
        : undefined);
  const direction = readVoiceDirectionFromBrief(input.brief);
  const integrity = syncVideoCreativeIntegrityFromSources({
    voiceoverText: vo,
    hookText: measured.approved_hook,
    voiceDirection: direction ?? { style: "auto", revision: 0 },
    plan: measured,
    packageVideoMode: "text_to_video",
  });
  const brief = {
    ...input.brief,
    hook: measured.approved_hook,
    subtitles: srt ?? input.brief.subtitles,
    video_creative_integrity: serializeVideoCreativeIntegrity(integrity),
    video_voice_synthesis: {
      synthesis_fingerprint: checkpoint.synthesis_fingerprint,
      synthesis_text_version: 1,
      estimated_cost_usd: row.estimated_cost_usd,
    },
    [VIDEO_VOICE_SYNTHESIS_CHECKPOINT_KEY]: checkpoint,
    video_text_to_video_creative_plan: serializeTextToVideoCreativePlan(measured),
    ...(extras?.subtitle_cues
      ? { video_subtitle_cues: extras.subtitle_cues }
      : row.subtitle_cues
        ? { video_subtitle_cues: row.subtitle_cues }
        : {}),
  };
  const { data, error } = await deps.supabase
    .from("content_packages")
    .update({ package_brief: brief as unknown as Json })
    .eq("id", input.packageId)
    .eq("project_id", input.projectId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) {
    throw new TextToVideoVoiceSynthesisError("package_brief_update_failed");
  }
  return { checkpoint, brief };
}

export function elevenLabsGateOpen(): boolean {
  return elevenLabsTtsReady();
}

export function submissionClaimStale(iso: string, nowMs: number): boolean {
  const t = Date.parse(iso);
  return Number.isFinite(t) && nowMs - t > VOICE_SYNTHESIS_SUBMISSION_CLAIM_STALE_MS;
}

export {
  VoiceSynthesisInputIntegrityError,
  isSubmissionClaimStaleRow,
};
