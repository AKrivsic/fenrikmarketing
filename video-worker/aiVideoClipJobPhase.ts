import type { SupabaseClient } from "@supabase/supabase-js";
import type { RenderSpec, RenderSpecOutput } from "@/lib/video-engine/schemas/renderSchema";
import type { WorkerPayload } from "@/lib/video-engine/schemas/workerPayloadSchema";
import { VIDEO_RENDER_MODE_AI_VIDEO_CLIPS } from "@/lib/video-engine/schemas/videoJobRenderMode";
import {
  AI_VIDEO_INPUT_FINGERPRINT_VERSION,
  computeAiVideoJobInputFingerprint,
  planDefaultsFromPlan,
} from "@/lib/video-worker/aiVideoCheckpointFingerprint";
import {
  AiVideoCheckpointValidationError,
  assertJobInputFingerprintForResume,
  validateAssemblyCompleteCheckpoint,
} from "@/lib/video-worker/aiVideoCheckpointValidation";
import {
  buildAiVideoCheckpointOutput,
  readAiVideoMeta,
  readClipReadyManifestFromOutput,
  readPersistedRenderSpecFromOutput,
  resolveAlreadyCompletedAiVideoJob,
} from "@/lib/video-worker/aiVideoJobOutput";
import type { AiVideoPersistedArtifacts, AiVideoStagingRefs } from "@/lib/video-worker/aiVideoStaging";
import { buildSceneVideoGenerationPlanFromRenderScenes } from "@/lib/scene-video-plan";
import {
  executeSceneVideoPlan,
  type SceneVideoExecutorDeps,
} from "@/lib/scene-video-executor";
import {
  applyExecutorClipResults,
  assembleVideoReel,
  sha256HexFile,
  type ClipReadyRenderManifest,
} from "@/lib/video-reel-assembly";
import {
  persistVideoJobArtifacts,
  renewVideoJobLease,
} from "@/lib/production-runtime";
import { assertVideoJobStillActive } from "@/video-worker/cancellation";
import type { SceneImage } from "@/video-worker/services/images";
import type { DurableAssetDownloader } from "@/video-worker/services/reel/durableDownload";
import { createWorkerDurableAssetDownloader } from "@/video-worker/createWorkerDurableDownloader";
import {
  type AiVideoArtifactStorageDeps,
  uploadAssemblyToStaging,
} from "@/video-worker/aiVideoArtifactStorage";

export class AiVideoClipJobError extends Error {
  readonly code:
    | "generation_blocked"
    | "needs_review"
    | "assembly_failed"
    | "lease_lost"
    | "checkpoint_failed"
    | "checkpoint_input_mismatch"
    | "checkpoint_fingerprint_missing"
    | "checkpoint_invalid";

  constructor(
    code: AiVideoClipJobError["code"],
    message: string,
  ) {
    super(message);
    this.name = "AiVideoClipJobError";
    this.code = code;
  }
}

/** @deprecated Use {@link isAiVideoLeaseLostError} */
export function isAiVideoLeaseLostError(err: unknown): boolean {
  return err instanceof AiVideoClipJobError && err.code === "lease_lost";
}

export interface BuildPersistedRenderSpecArgs {
  spec: RenderSpec;
  images: SceneImage[];
  projectId: string;
  videoJobId: string;
  semanticMotionBeats?: {
    beat_id: string;
    scene_id: string;
    motion_intent: string;
    motion_primitive: string;
    motion_intensity: string;
    motion_version: string;
  }[];
}

export type BuildPersistedRenderSpecFn = (
  args: BuildPersistedRenderSpecArgs,
) => Promise<RenderSpecOutput>;

export interface AiVideoClipJobPhaseInput {
  payload: WorkerPayload;
  spec: RenderSpec;
  images: SceneImage[];
  renderAudioPath: string;
  srtPath: string;
  subtitlesBurnInRequested: boolean;
  maxBudgetUsd: number;
  confirmPaidRun: true;
  workDir: string;
  leaseSupabase: SupabaseClient;
  leaseOwner: string;
  semanticMotionBeats?: BuildPersistedRenderSpecArgs["semanticMotionBeats"];
  subtitleDebug: Record<string, unknown>;
  signal?: AbortSignal;
}

export type RunAiVideoClipJobPhaseResult =
  | { kind: "already_completed"; artifacts: AiVideoPersistedArtifacts }
  | {
      kind: "needs_final_promotion";
      staging: AiVideoStagingRefs;
      renderSpec: RenderSpecOutput;
      debug: Record<string, unknown>;
      cleanupLocal: () => Promise<void>;
    }
  | { kind: "lease_lost"; detail: string };

export type AiVideoClipJobPhaseDeps = {
  buildPersistedRenderSpec: BuildPersistedRenderSpecFn;
  executePlan?: typeof executeSceneVideoPlan;
  assembleReel?: typeof assembleVideoReel;
  applyClips?: typeof applyExecutorClipResults;
  persistArtifacts?: typeof persistVideoJobArtifacts;
  renewLease?: typeof renewVideoJobLease;
  getJobOutput?: (
    supabase: SupabaseClient,
    jobId: string,
    projectId: string,
  ) => Promise<Record<string, unknown> | null>;
  createDownloader?: () => DurableAssetDownloader;
  uploadStaging?: typeof uploadAssemblyToStaging;
  artifactStorage?: AiVideoArtifactStorageDeps;
  executorDeps?: SceneVideoExecutorDeps;
  assertStillActive?: (videoJobId: string, projectId: string) => Promise<void>;
  /** Test observability — provider POST count from executor gateway. */
  onExecutorTelemetry?: (stats: {
    executorInvoked: boolean;
    providerCreateCount: number;
  }) => void;
};

async function defaultGetJobOutput(
  supabase: SupabaseClient,
  jobId: string,
  projectId: string,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from("video_jobs")
    .select("output")
    .eq("id", jobId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.output || typeof data.output !== "object" || Array.isArray(data.output)) {
    return null;
  }
  return data.output as Record<string, unknown>;
}

async function assertLeaseHeld(
  deps: AiVideoClipJobPhaseDeps,
  input: AiVideoClipJobPhaseInput,
): Promise<void> {
  const renew = deps.renewLease ?? renewVideoJobLease;
  const ok = await renew(input.leaseSupabase, {
    jobId: input.payload.video_job_id,
    projectId: input.payload.project_id,
    ownerToken: input.leaseOwner,
  });
  if (!ok) {
    throw new AiVideoClipJobError("lease_lost", "lease_renew_failed");
  }
}

async function persistCheckpoint(
  deps: AiVideoClipJobPhaseDeps,
  input: AiVideoClipJobPhaseInput,
  patch: ReturnType<typeof buildAiVideoCheckpointOutput>,
): Promise<Record<string, unknown>> {
  await assertLeaseHeld(deps, input);
  const persist = deps.persistArtifacts ?? persistVideoJobArtifacts;
  const ok = await persist(input.leaseSupabase, {
    jobId: input.payload.video_job_id,
    projectId: input.payload.project_id,
    ownerToken: input.leaseOwner,
    output: patch,
  });
  if (!ok) {
    throw new AiVideoClipJobError("lease_lost", "checkpoint_persist_rejected");
  }
  return patch;
}

function mapValidationError(err: unknown): never {
  if (err instanceof AiVideoCheckpointValidationError) {
    throw new AiVideoClipJobError(err.code, err.message);
  }
  throw err;
}

function computeJobInputFingerprint(
  input: AiVideoClipJobPhaseInput,
  planDefaults: ReturnType<typeof planDefaultsFromPlan>,
): string {
  return computeAiVideoJobInputFingerprint({
    videoJobId: input.payload.video_job_id,
    renderMode: VIDEO_RENDER_MODE_AI_VIDEO_CLIPS,
    voiceoverText: input.spec.voiceover_text,
    subtitlesBurnInRequested: input.subtitlesBurnInRequested,
    spec: input.spec,
    planDefaults,
  });
}

function planScenesForFingerprint(
  input: AiVideoClipJobPhaseInput,
  existingOutput: Record<string, unknown>,
): RenderSpecOutput["scenes"] {
  const persisted = readPersistedRenderSpecFromOutput(existingOutput);
  if (persisted?.scenes.length) return persisted.scenes;
  return input.spec.scenes.map((s) => ({
    id: s.id,
    image_prompt: s.image_prompt,
    image_bucket:
      input.images.find((i) => i.sceneId === s.id)?.reusedBucket ?? "",
    image_path:
      input.images.find((i) => i.sceneId === s.id)?.reusedPath ?? "",
    duration_seconds: s.duration_seconds,
    motion_prompt: s.motion_prompt,
    transition_in: s.transition_in,
  }));
}

/**
 * AI clip reel phase with durable checkpoints (stills → clips → staging → final promotion in caller).
 */
export async function runAiVideoClipJobPhase(
  input: AiVideoClipJobPhaseInput,
  deps: AiVideoClipJobPhaseDeps,
): Promise<RunAiVideoClipJobPhaseResult> {
  const buildSpec = deps.buildPersistedRenderSpec;
  const executePlan = deps.executePlan ?? executeSceneVideoPlan;
  const assembleReel = deps.assembleReel ?? assembleVideoReel;
  const applyClips = deps.applyClips ?? applyExecutorClipResults;
  const getJobOutput = deps.getJobOutput ?? defaultGetJobOutput;
  const createDownloader =
    deps.createDownloader ?? createWorkerDurableAssetDownloader;
  const uploadStaging = deps.uploadStaging ?? uploadAssemblyToStaging;
  const assertStillActive =
    deps.assertStillActive ?? assertVideoJobStillActive;

  let existingOutput =
    (await getJobOutput(
      input.leaseSupabase,
      input.payload.video_job_id,
      input.payload.project_id,
    )) ?? {};

  const planForFingerprint = buildSceneVideoGenerationPlanFromRenderScenes(
    planScenesForFingerprint(input, existingOutput),
  );
  const jobInputFingerprint = computeJobInputFingerprint(
    input,
    planDefaultsFromPlan(planForFingerprint),
  );

  const meta = readAiVideoMeta(existingOutput);
  try {
    assertJobInputFingerprintForResume({
      meta,
      computedJobInputFingerprint: jobInputFingerprint,
    });
  } catch (err) {
    mapValidationError(err);
  }

  const completed = resolveAlreadyCompletedAiVideoJob({
    output: existingOutput,
    videoJobId: input.payload.video_job_id,
    projectId: input.payload.project_id,
    expectedJobInputFingerprint: jobInputFingerprint,
  });
  if (completed) {
    return { kind: "already_completed", artifacts: completed };
  }

  if (meta?.phase === "assembly_complete") {
    try {
      const validated = validateAssemblyCompleteCheckpoint({
        output: existingOutput,
        projectId: input.payload.project_id,
        videoJobId: input.payload.video_job_id,
      });
      return {
        kind: "needs_final_promotion",
        staging: validated.staging,
        renderSpec: validated.renderSpec,
        debug: validated.debug,
        cleanupLocal: async () => undefined,
      };
    } catch (err) {
      mapValidationError(err);
    }
  }

  await assertStillActive(
    input.payload.video_job_id,
    input.payload.project_id,
  );

  let renderSpecOutput = readPersistedRenderSpecFromOutput(existingOutput);
  const hadPersistedRenderSpec = Boolean(renderSpecOutput);

  if (!renderSpecOutput) {
    renderSpecOutput = await buildSpec({
      spec: input.spec,
      images: input.images,
      projectId: input.payload.project_id,
      videoJobId: input.payload.video_job_id,
      semanticMotionBeats: input.semanticMotionBeats,
    });
  }

  const plan = buildSceneVideoGenerationPlanFromRenderScenes(renderSpecOutput.scenes);
  const fingerprint = jobInputFingerprint;
  try {
    assertJobInputFingerprintForResume({
      meta: readAiVideoMeta(existingOutput),
      computedJobInputFingerprint: fingerprint,
    });
  } catch (err) {
    mapValidationError(err);
  }

  const fingerprintMeta = {
    input_fingerprint_version: AI_VIDEO_INPUT_FINGERPRINT_VERSION,
    input_fingerprint: fingerprint,
  };

  if (!hadPersistedRenderSpec) {
    existingOutput = await persistCheckpoint(
      deps,
      input,
      buildAiVideoCheckpointOutput({
        renderSpec: renderSpecOutput,
        existingOutput,
        phase: "checkpoint_stills",
        meta: fingerprintMeta,
      }),
    );
  }

  if (plan.preparableSceneCount !== plan.sceneCount) {
    throw new AiVideoClipJobError(
      "generation_blocked",
      "scene_video_plan_not_fully_preparable",
    );
  }

  let clipManifest: ClipReadyRenderManifest | null =
    readClipReadyManifestFromOutput(existingOutput);

  let executorInvoked = false;
  let providerCreateCount = 0;

  if (!clipManifest) {
    executorInvoked = true;
    const heartbeat: SceneVideoExecutorDeps = {
      ...(deps.executorDeps ?? {}),
      onPollTick: async () => {
        await assertStillActive(
          input.payload.video_job_id,
          input.payload.project_id,
        );
        await (deps.executorDeps?.onPollTick?.() ?? Promise.resolve());
        await assertLeaseHeld(deps, input);
      },
    };

    const executorResult = await executePlan(
      {
        projectId: input.payload.project_id,
        videoJobId: input.payload.video_job_id,
        plan,
        maxBudgetUsd: input.maxBudgetUsd,
        confirmPaidRun: input.confirmPaidRun,
      },
      heartbeat,
    );

    providerCreateCount = executorResult.newlyInitiatedProviderCostUsd > 0
      ? executorResult.newlyCompletedCount
      : 0;

    if (
      executorResult.status === "blocked" ||
      executorResult.status === "stopped" ||
      executorResult.status === "needs_review"
    ) {
      const reason =
        executorResult.blockedReason ??
        executorResult.status ??
        "generation_blocked";
      throw new AiVideoClipJobError(
        executorResult.status === "needs_review"
          ? "needs_review"
          : "generation_blocked",
        reason,
      );
    }

    if (executorResult.status !== "completed") {
      throw new AiVideoClipJobError(
        "generation_blocked",
        `executor_status_${executorResult.status}`,
      );
    }

    if (
      executorResult.unresolvedCount > 0 ||
      executorResult.failedCount > 0 ||
      executorResult.scenes.some(
        (s) => s.attemptStatus === "submission_unknown",
      )
    ) {
      throw new AiVideoClipJobError(
        "needs_review",
        "incomplete_or_submission_unknown_scenes",
      );
    }

    const voiceoverSha256 = await sha256HexFile(input.renderAudioPath);
    const applied = applyClips({
      renderSpec: renderSpecOutput,
      executorResult,
      voiceoverText: input.spec.voiceover_text,
      voiceoverSha256,
      subtitlesBurnInRequested: input.subtitlesBurnInRequested,
      music: null,
      ambient: null,
    });
    if (!applied.ok) {
      throw new AiVideoClipJobError("assembly_failed", applied.reason);
    }
    clipManifest = applied.manifest;

    const finalRenderSpecOut: RenderSpecOutput = {
      version: applied.manifest.version,
      scenes: applied.manifest.scenes,
      duration_seconds: applied.manifest.duration_seconds,
      subtitle_timing: applied.manifest.subtitle_timing,
      metadata: applied.manifest.metadata,
    };

    existingOutput = await persistCheckpoint(
      deps,
      input,
      buildAiVideoCheckpointOutput({
        renderSpec: finalRenderSpecOut,
        existingOutput,
        phase: "scene_clips_complete",
        meta: {
          ...fingerprintMeta,
          clip_ready_manifest: clipManifest,
          generation: {
            status: executorResult.status,
            reusedCount: executorResult.reusedCount,
            newlyCompletedCount: executorResult.newlyCompletedCount,
            theoreticalTotalCostUsd: executorResult.theoreticalTotalCostUsd,
            newlyInitiatedProviderCostUsd:
              executorResult.newlyInitiatedProviderCostUsd,
            provider_create_count: providerCreateCount,
            executor_invoked: true,
          },
        },
      }),
    );
    renderSpecOutput = finalRenderSpecOut;
  }

  deps.onExecutorTelemetry?.({
    executorInvoked,
    providerCreateCount,
  });

  await assertStillActive(
    input.payload.video_job_id,
    input.payload.project_id,
  );

  const voiceoverSha256 = await sha256HexFile(input.renderAudioPath);
  if (!clipManifest) {
    throw new AiVideoClipJobError("assembly_failed", "missing_clip_manifest");
  }

  const assembly = await assembleReel({
    manifest: clipManifest,
    voiceoverLocalPath: input.renderAudioPath,
    subtitlesLocalPath: input.subtitlesBurnInRequested
      ? input.srtPath
      : undefined,
    downloader: createDownloader(),
    tempRoot: input.workDir,
    signal: input.signal,
  });

  if (assembly.status !== "ok") {
    throw new AiVideoClipJobError(
      "assembly_failed",
      assembly.reason + (assembly.detail ? `:${assembly.detail}` : ""),
    );
  }

  const staging = await uploadStaging({
    projectId: input.payload.project_id,
    videoJobId: input.payload.video_job_id,
    mp4LocalPath: assembly.mp4Path,
    thumbnailLocalPath: assembly.thumbnailPath,
    srtLocalPath: input.subtitlesBurnInRequested ? input.srtPath : undefined,
    storage: deps.artifactStorage,
  });

  const finalRenderSpecOut: RenderSpecOutput = {
    version: clipManifest.version,
    scenes: clipManifest.scenes,
    duration_seconds: clipManifest.duration_seconds,
    subtitle_timing: clipManifest.subtitle_timing,
    metadata: clipManifest.metadata,
  };

  const debug = {
    ...input.subtitleDebug,
    video_render_mode: VIDEO_RENDER_MODE_AI_VIDEO_CLIPS,
    ai_video: {
      render_mode: VIDEO_RENDER_MODE_AI_VIDEO_CLIPS,
      phase: "assembly_complete" as const,
      ...fingerprintMeta,
      staging,
      generation: readAiVideoMeta(existingOutput)?.generation,
      assembly: {
        sceneCount: assembly.diagnostics.sceneCount,
        subtitlesBurnInUsed: assembly.diagnostics.subtitlesBurnInUsed,
        voiceover_sha256: voiceoverSha256,
      },
    },
  };

  existingOutput = await persistCheckpoint(
    deps,
    input,
    {
      ...buildAiVideoCheckpointOutput({
        renderSpec: finalRenderSpecOut,
        existingOutput,
        phase: "assembly_complete",
        meta: {
          ...fingerprintMeta,
          staging,
          clip_ready_manifest: clipManifest,
        },
      }),
      debug,
    },
  );

  void existingOutput;

  return {
    kind: "needs_final_promotion",
    staging,
    renderSpec: finalRenderSpecOut,
    debug,
    cleanupLocal: assembly.cleanupAll,
  };
}

export { resolveAlreadyCompletedAiVideoJob } from "@/lib/video-worker/aiVideoJobOutput";
