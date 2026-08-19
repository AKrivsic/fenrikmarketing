import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import type { VideoGenerationProvider } from "@/lib/ai/videoGeneration";
import { VideoGenerationError } from "@/lib/ai/videoGenerationError";
import {
  buildSceneVideoAttemptPath,
  STORAGE_BUCKETS,
} from "@/lib/api/storage";
import {
  findUsableSceneStill,
} from "@/lib/runway-test/scenes";
import { redactUrlForLog } from "@/lib/runway-test/scenes";
import {
  SCENE_VIDEO_ATTEMPT_MAX_OUTPUT_BYTES,
  SCENE_VIDEO_ATTEMPT_TERMINAL_STATUSES,
  SCENE_VIDEO_DOWNLOAD_CLAIM_STALE_MS,
  SCENE_VIDEO_SUBMISSION_CLAIM_STALE_MS,
  SCENE_VIDEO_MOTION_PROMPT_MAX_UTF16,
  isSceneVideoAttemptStatus,
  type SceneVideoAttemptStatus,
} from "@/lib/scene-video-attempts/constants";
import {
  BoundedDownloadError,
  readResponseBodyBounded,
} from "@/lib/scene-video-attempts/boundedDownload";
import {
  classifyCreateFailure,
  validateSceneVideoSeed,
} from "@/lib/scene-video-attempts/createFailure";
import { probeVideoBuffer } from "@/lib/scene-video-attempts/probeOutput";
import {
  mapAttemptRow,
  type SceneVideoAttemptRow,
  type SceneVideoAttemptView,
} from "@/lib/scene-video-attempts/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface SceneVideoAttemptServiceDeps {
  supabase?: SupabaseClient;
  videoProvider?: VideoGenerationProvider;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  /** Override output size cap (tests). Defaults to SCENE_VIDEO_ATTEMPT_MAX_OUTPUT_BYTES. */
  maxOutputBytes?: number;
  /** Injected for tests — production callers must pass a provider. */
  requireProvider?: boolean;
  /** Stable owner id for submission claim (tests / long-lived worker). */
  submissionClaimOwner?: string;
  /** Test hook — peer wait between concurrency executors. */
  sleep?: (ms: number) => Promise<void>;
}

function supabaseOf(deps?: SceneVideoAttemptServiceDeps): SupabaseClient {
  return deps?.supabase ?? createSupabaseAdminClient();
}

function providerOf(deps?: SceneVideoAttemptServiceDeps): VideoGenerationProvider {
  if (!deps?.videoProvider) {
    throw new Error("video_provider_required");
  }
  return deps.videoProvider;
}

function fetchOf(deps?: SceneVideoAttemptServiceDeps): typeof fetch {
  return deps?.fetchImpl ?? fetch;
}

function nowIso(deps?: SceneVideoAttemptServiceDeps): string {
  return (deps?.now ?? (() => new Date()))().toISOString();
}

function validateUuid(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field}_required`);
  }
  const v = value.trim();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      v,
    )
  ) {
    throw new Error(`${field}_invalid`);
  }
  return v;
}

function validateMotionPrompt(prompt: unknown): string {
  if (typeof prompt !== "string" || !prompt.trim()) {
    throw new Error("motion_prompt_required");
  }
  const trimmed = prompt.trim();
  if (trimmed.length > SCENE_VIDEO_MOTION_PROMPT_MAX_UTF16) {
    throw new Error("motion_prompt_too_long");
  }
  return trimmed;
}

async function assertValidParentAttempt(
  supabase: SupabaseClient,
  args: {
    parentAttemptId: string;
    projectId: string;
    videoJobId: string;
    sceneId: string;
  },
): Promise<SceneVideoAttemptRow> {
  const parent = await loadAttempt(supabase, args.parentAttemptId);
  if (parent.project_id !== args.projectId) {
    throw new Error("parent_project_mismatch");
  }
  if (parent.video_job_id !== args.videoJobId) {
    throw new Error("parent_video_job_mismatch");
  }
  if (parent.scene_id !== args.sceneId) {
    throw new Error("parent_scene_mismatch");
  }
  if (parent.status === "submission_unknown") {
    throw new Error("retry_forbidden_submission_unknown");
  }
  return parent;
}

async function signSourceImage(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  ttlSeconds = 600,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, ttlSeconds);
  if (error || !data?.signedUrl) {
    throw new Error("source_signed_url_failed");
  }
  return data.signedUrl;
}

async function loadAttempt(
  supabase: SupabaseClient,
  attemptId: string,
): Promise<SceneVideoAttemptRow> {
  const id = validateUuid(attemptId, "attempt_id");
  const { data, error } = await supabase
    .from("scene_video_generation_attempts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("attempt_not_found");
  const row = data as SceneVideoAttemptRow;
  if (!isSceneVideoAttemptStatus(row.status)) {
    throw new Error("attempt_invalid_status");
  }
  return row;
}

function submissionOwner(deps?: SceneVideoAttemptServiceDeps): string {
  return deps?.submissionClaimOwner ?? randomUUID();
}

function isSubmissionClaimStale(
  row: SceneVideoAttemptRow,
  deps?: SceneVideoAttemptServiceDeps,
): boolean {
  if (!row.submission_claimed_at || !row.submission_claim_owner) return false;
  const claimedAt = Date.parse(row.submission_claimed_at);
  if (!Number.isFinite(claimedAt)) return false;
  const now = (deps?.now ?? (() => new Date()))().getTime();
  return now - claimedAt >= SCENE_VIDEO_SUBMISSION_CLAIM_STALE_MS;
}

async function markStaleSubmissionUnknown(
  supabase: SupabaseClient,
  row: SceneVideoAttemptRow,
  deps?: SceneVideoAttemptServiceDeps,
): Promise<SceneVideoAttemptRow> {
  let query = supabase
    .from("scene_video_generation_attempts")
    .update({
      status: "submission_unknown",
      error_message:
        "Submission claim expired without provider_task_id — manual review required.",
      failure_code: "submission_claim_stale",
      completed_at: nowIso(deps),
      submission_claimed_at: null,
      submission_claim_owner: null,
    })
    .eq("id", row.id)
    .eq("status", "submitting")
    .is("provider_task_id", null);

  if (row.submission_claim_owner && row.submission_claimed_at) {
    query = query
      .eq("submission_claim_owner", row.submission_claim_owner)
      .eq("submission_claimed_at", row.submission_claimed_at);
  }

  const { data, error } = await query.select("*").maybeSingle();
  if (error) throw error;
  if (data) return data as SceneVideoAttemptRow;
  return loadAttempt(supabase, row.id);
}

/**
 * Sync-path stale `submitting` handling (same rules as create claim).
 * Never POSTs to provider.
 */
async function resolveSubmittingRowForSync(
  supabase: SupabaseClient,
  row: SceneVideoAttemptRow,
  deps?: SceneVideoAttemptServiceDeps,
): Promise<SceneVideoAttemptRow> {
  if (row.status !== "submitting" || row.provider_task_id) {
    return row;
  }
  if (isSubmissionClaimStale(row, deps)) {
    return markStaleSubmissionUnknown(supabase, row, deps);
  }
  return row;
}

/**
 * Atomic submission claim before provider create POST.
 * Never reclaims a stale claim for another POST — stale → submission_unknown.
 */
async function claimSubmission(
  supabase: SupabaseClient,
  row: SceneVideoAttemptRow,
  owner: string,
  deps?: SceneVideoAttemptServiceDeps,
): Promise<SceneVideoAttemptRow | null> {
  if (row.provider_task_id) return null;

  const current = await loadAttempt(supabase, row.id);
  if (current.provider_task_id) return null;

  if (current.status === "submitting") {
    if (isSubmissionClaimStale(current, deps)) {
      await markStaleSubmissionUnknown(supabase, current, deps);
      return null;
    }
    if (current.submission_claim_owner === owner) {
      return current;
    }
    return null;
  }

  if (current.status !== "created") return null;

  const nowDate = (deps?.now ?? (() => new Date()))();
  const { data, error } = await supabase
    .from("scene_video_generation_attempts")
    .update({
      status: "submitting",
      submission_claimed_at: nowDate.toISOString(),
      submission_claim_owner: owner,
    })
    .eq("id", row.id)
    .eq("status", "created")
    .is("provider_task_id", null)
    .is("submission_claim_owner", null)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? (data as SceneVideoAttemptRow) : null;
}

async function loadAttemptByClientRequestId(
  supabase: SupabaseClient,
  clientRequestId: string,
): Promise<SceneVideoAttemptRow | null> {
  const { data, error } = await supabase
    .from("scene_video_generation_attempts")
    .select("*")
    .eq("client_request_id", clientRequestId)
    .maybeSingle();
  if (error) throw error;
  return data ? (data as SceneVideoAttemptRow) : null;
}

async function waitForPeerSubmissionOutcome(
  supabase: SupabaseClient,
  attemptId: string,
  clientRequestId: string,
  deps?: SceneVideoAttemptServiceDeps,
  maxWaitMs = Number(process.env.T2V_TEST_PEER_WAIT_MS) > 0
    ? Number(process.env.T2V_TEST_PEER_WAIT_MS)
    : 120_000,
): Promise<SceneVideoAttemptView> {
  const sleep =
    deps?.sleep ??
    ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const canonical = await getSceneVideoAttemptByClientRequestId(
      clientRequestId,
      { supabase, ...deps },
    );
    if (canonical?.providerTaskId || canonical?.status === "succeeded") {
      return canonical;
    }
    if (
      canonical &&
      (SCENE_VIDEO_ATTEMPT_TERMINAL_STATUSES as readonly string[]).includes(
        canonical.status,
      )
    ) {
      return canonical;
    }
    const dbRow =
      (await loadAttemptByClientRequestId(supabase, clientRequestId)) ??
      (await loadAttempt(supabase, attemptId));
    if (!dbRow) {
      await sleep(10);
      continue;
    }
    if (dbRow.provider_task_id) {
      return mapAttemptRow(dbRow, true);
    }
    if (
      (SCENE_VIDEO_ATTEMPT_TERMINAL_STATUSES as readonly string[]).includes(
        dbRow.status,
      )
    ) {
      return mapAttemptRow(dbRow, true);
    }
    if (
      dbRow.status === "submitting" &&
      !dbRow.provider_task_id &&
      isSubmissionClaimStale(dbRow, deps)
    ) {
      return mapAttemptRow(dbRow, true);
    }
    await sleep(10);
  }
  const finalCanonical = await getSceneVideoAttemptByClientRequestId(
    clientRequestId,
    { supabase, ...deps },
  );
  if (finalCanonical) return finalCanonical;
  const finalRow =
    (await loadAttemptByClientRequestId(supabase, clientRequestId)) ??
    (await loadAttempt(supabase, attemptId));
  if (!finalRow) {
    throw new Error("scene_video_attempt_peer_wait_exhausted");
  }
  return mapAttemptRow(finalRow, true);
}

async function markOwnedSubmissionTerminal(
  supabase: SupabaseClient,
  id: string,
  owner: string,
  status: Extract<SceneVideoAttemptStatus, "failed" | "submission_unknown">,
  errorMessage: string,
  failureCode: string | null,
  deps?: SceneVideoAttemptServiceDeps,
): Promise<SceneVideoAttemptRow | "claim_lost"> {
  const { data, error } = await supabase
    .from("scene_video_generation_attempts")
    .update({
      status,
      error_message: errorMessage.slice(0, 1000),
      failure_code: failureCode,
      completed_at: nowIso(deps),
      submission_claimed_at: null,
      submission_claim_owner: null,
      download_claimed_at: null,
      download_claim_owner: null,
    })
    .eq("id", id)
    .eq("status", "submitting")
    .eq("submission_claim_owner", owner)
    .is("provider_task_id", null)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) return "claim_lost";
  return data as SceneVideoAttemptRow;
}

function needsProviderSubmit(row: SceneVideoAttemptRow): boolean {
  if (row.provider_task_id) return false;
  return row.status === "created" || row.status === "submitting";
}

async function completeExistingOrSubmit(
  row: SceneVideoAttemptRow,
  imageBucket: string,
  imagePath: string,
  deps?: SceneVideoAttemptServiceDeps,
): Promise<SceneVideoAttemptView> {
  if (!(needsProviderSubmit(row))) {
    return mapAttemptRow(row, true);
  }
  return submitProviderCreate(row, imageBucket, imagePath, deps);
}

export interface CreateSceneVideoAttemptInput {
  projectId: string;
  videoJobId: string;
  sceneId: string;
  motionPrompt: string;
  clientRequestId: string;
  provider: string;
  model: string;
  durationSeconds: number;
  ratio: string;
  seed?: number;
  estimatedCredits?: number;
  estimatedCostUsd?: number;
  /** When set, must exactly match the scene still in the video job render_spec. */
  sourceImageBucket?: string;
  sourceImagePath?: string;
  /** Conscious retry lineage only — never set for first attempts. */
  parentAttemptId?: string;
}

/**
 * Create (or idempotently reuse) a generation attempt and POST provider create
 * exactly once for the insert winner.
 */
export async function createSceneVideoAttempt(
  input: CreateSceneVideoAttemptInput,
  deps?: SceneVideoAttemptServiceDeps,
): Promise<SceneVideoAttemptView> {
  const projectId = validateUuid(input.projectId, "project_id");
  const videoJobId = validateUuid(input.videoJobId, "video_job_id");
  const clientRequestId = validateUuid(
    input.clientRequestId,
    "client_request_id",
  );
  const sceneId = typeof input.sceneId === "string" ? input.sceneId.trim() : "";
  if (!sceneId) throw new Error("scene_id_required");
  const motionPrompt = validateMotionPrompt(input.motionPrompt);
  if (!input.provider?.trim()) throw new Error("provider_required");
  if (!input.model?.trim()) throw new Error("model_required");
  if (
    !Number.isFinite(input.durationSeconds) ||
    input.durationSeconds < 1 ||
    input.durationSeconds > 30
  ) {
    throw new Error("duration_invalid");
  }
  if (!input.ratio?.trim()) throw new Error("ratio_required");

  const supabase = supabaseOf(deps);

  const { data: existing, error: existingError } = await supabase
    .from("scene_video_generation_attempts")
    .select("*")
    .eq("client_request_id", clientRequestId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    const row = existing as SceneVideoAttemptRow;
    return completeExistingOrSubmit(
      row,
      row.source_image_bucket,
      row.source_image_path,
      deps,
    );
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();
  if (projectError) throw projectError;
  if (!project) throw new Error("project_not_found");

  const { data: job, error: jobError } = await supabase
    .from("video_jobs")
    .select("id, project_id, status, output")
    .eq("id", videoJobId)
    .maybeSingle();
  if (jobError) throw jobError;
  if (!job) throw new Error("video_job_not_found");
  if (job.project_id !== projectId) throw new Error("video_job_project_mismatch");

  const still = findUsableSceneStill(job.output, sceneId);
  if (!still) throw new Error("scene_not_found");

  if (input.sourceImageBucket || input.sourceImagePath) {
    if (
      input.sourceImageBucket !== still.imageBucket ||
      input.sourceImagePath !== still.imagePath
    ) {
      throw new Error("source_image_mismatch");
    }
  }

  let parentAttemptId: string | null = null;
  if (input.parentAttemptId) {
    const parentId = validateUuid(input.parentAttemptId, "parent_attempt_id");
    await assertValidParentAttempt(supabase, {
      parentAttemptId: parentId,
      projectId,
      videoJobId,
      sceneId: still.sceneId,
    });
    parentAttemptId = parentId;
  }

  const seed = validateSceneVideoSeed(
    input.seed === undefined ? null : input.seed,
  );

  const insertPayload = {
    project_id: projectId,
    video_job_id: videoJobId,
    scene_id: still.sceneId,
    client_request_id: clientRequestId,
    parent_attempt_id: parentAttemptId,
    source_image_bucket: still.imageBucket,
    source_image_path: still.imagePath,
    motion_prompt: motionPrompt,
    provider: input.provider.trim(),
    model: input.model.trim(),
    duration_seconds: Math.round(input.durationSeconds),
    ratio: input.ratio.trim(),
    seed,
    status: "created" as const,
    estimated_credits: input.estimatedCredits ?? null,
    estimated_cost_usd: input.estimatedCostUsd ?? null,
  };

  const { data: inserted, error: insertError } = await supabase
    .from("scene_video_generation_attempts")
    .insert(insertPayload)
    .select("*")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: raced, error: racedError } = await supabase
        .from("scene_video_generation_attempts")
        .select("*")
        .eq("client_request_id", clientRequestId)
        .maybeSingle();
      if (racedError) throw racedError;
      if (raced) {
        const racedRow = raced as SceneVideoAttemptRow;
        return completeExistingOrSubmit(
          racedRow,
          racedRow.source_image_bucket,
          racedRow.source_image_path,
          deps,
        );
      }
    }
    throw insertError;
  }

  const row = inserted as SceneVideoAttemptRow;
  if (row.provider_task_id) {
    return mapAttemptRow(row, true);
  }

  // Only the insert winner reaches provider create.
  return submitProviderCreate(row, still.imageBucket, still.imagePath, deps);
}

async function submitProviderCreate(
  row: SceneVideoAttemptRow,
  imageBucket: string,
  imagePath: string,
  deps?: SceneVideoAttemptServiceDeps,
): Promise<SceneVideoAttemptView> {
  const supabase = supabaseOf(deps);
  const provider = providerOf(deps);
  const owner = submissionOwner(deps);

  const claimed = await claimSubmission(supabase, row, owner, deps);
  if (!claimed) {
    const current = await loadAttempt(supabase, row.id);
    if (
      current.status === "submitting" &&
      !current.provider_task_id &&
      isSubmissionClaimStale(current, deps)
    ) {
      await markStaleSubmissionUnknown(supabase, current, deps);
      throw new Error("submission_unknown");
    }
    if (current.status === "submission_unknown") {
      throw new Error("submission_unknown");
    }
    return mapAttemptRow(current, true);
  }

  const working = claimed;

  let sourceSignedUrl: string;
  try {
    sourceSignedUrl = await signSourceImage(supabase, imageBucket, imagePath);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "source_signed_url_failed";
    const marked = await markOwnedSubmissionTerminal(
      supabase,
      working.id,
      owner,
      "failed",
      msg,
      "source_signed_url_failed",
      deps,
    );
    if (marked === "claim_lost") {
      return mapAttemptRow(await loadAttempt(supabase, working.id), true);
    }
    throw err;
  }

  try {
    const created = await provider.createImageToVideo({
      imageUrl: sourceSignedUrl,
      motionPrompt: working.motion_prompt,
      model: working.model,
      duration: working.duration_seconds,
      ratio: working.ratio,
      ...(working.seed != null ? { seed: working.seed } : {}),
      // Single create POST — never transport-retry paid create.
      dangerousCreateMaxTransportAttempts: 1,
    });

    const submittedAt = nowIso(deps);
    const { data: updated, error: updateError } = await supabase
      .from("scene_video_generation_attempts")
      .update({
        provider_task_id: created.providerTaskId,
        status: "submitted",
        submitted_at: submittedAt,
        submission_claimed_at: null,
        submission_claim_owner: null,
      })
      .eq("id", working.id)
      .eq("submission_claim_owner", owner)
      .is("provider_task_id", null)
      .eq("status", "submitting")
      .select("*")
      .maybeSingle();
    if (updateError) throw updateError;

    if (!updated) {
      const current = await loadAttempt(supabase, working.id);
      return mapAttemptRow(current, true);
    }
    return mapAttemptRow(updated as SceneVideoAttemptRow, false);
  } catch (err) {
    const message =
      err instanceof Error ? err.message.slice(0, 1000) : "provider_create_failed";
    const failureCode =
      err instanceof VideoGenerationError
        ? err.failureCode ?? err.code
        : "provider_create_failed";

    const classified = classifyCreateFailure(err);
    if (classified === "submission_unknown") {
      const marked = await markOwnedSubmissionTerminal(
        supabase,
        working.id,
        owner,
        "submission_unknown",
        message,
        failureCode,
        deps,
      );
      if (marked === "claim_lost") {
        return mapAttemptRow(await loadAttempt(supabase, working.id), true);
      }
      throw new Error("submission_unknown");
    }

    const marked = await markOwnedSubmissionTerminal(
      supabase,
      working.id,
      owner,
      "failed",
      message,
      failureCode,
      deps,
    );
    if (marked === "claim_lost") {
      return mapAttemptRow(await loadAttempt(supabase, working.id), true);
    }
    throw err;
  }
}

/**
 * Finalize-path failure while holding an exclusive download claim.
 * Returns `claim_lost` when another worker already reclaimed ownership —
 * caller must not throw a state-mutating follow-up; return current row instead.
 */
async function markOwnedDownloadFailure(
  supabase: SupabaseClient,
  id: string,
  owner: string,
  errorMessage: string,
  failureCode: string | null,
  deps?: SceneVideoAttemptServiceDeps,
): Promise<"marked" | "claim_lost"> {
  const { data, error } = await supabase
    .from("scene_video_generation_attempts")
    .update({
      status: "download_failed",
      error_message: errorMessage.slice(0, 1000),
      failure_code: failureCode,
      completed_at: nowIso(deps),
      download_claimed_at: null,
      download_claim_owner: null,
    })
    .eq("id", id)
    .eq("status", "downloading")
    .eq("download_claim_owner", owner)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? "marked" : "claim_lost";
}

async function failOwnedDownloadOrReturnCurrent(
  supabase: SupabaseClient,
  id: string,
  owner: string,
  errorMessage: string,
  failureCode: string | null,
  deps?: SceneVideoAttemptServiceDeps,
): Promise<SceneVideoAttemptRow | "marked"> {
  const outcome = await markOwnedDownloadFailure(
    supabase,
    id,
    owner,
    errorMessage,
    failureCode,
    deps,
  );
  if (outcome === "claim_lost") {
    return loadAttempt(supabase, id);
  }
  return "marked";
}

export async function getSceneVideoAttempt(
  attemptId: string,
  deps?: SceneVideoAttemptServiceDeps,
): Promise<SceneVideoAttemptView> {
  const row = await loadAttempt(supabaseOf(deps), attemptId);
  return mapAttemptRow(row, false);
}

/** Read-only lookup by idempotency key — never creates or calls the provider. */
export async function getSceneVideoAttemptByClientRequestId(
  clientRequestId: string,
  deps?: SceneVideoAttemptServiceDeps,
): Promise<SceneVideoAttemptView | null> {
  const id = validateUuid(clientRequestId, "client_request_id");
  const { data, error } = await supabaseOf(deps)
    .from("scene_video_generation_attempts")
    .select("*")
    .eq("client_request_id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as SceneVideoAttemptRow;
  if (!isSceneVideoAttemptStatus(row.status)) {
    throw new Error("attempt_invalid_status");
  }
  return mapAttemptRow(row, true);
}

export async function listSceneVideoAttemptsForScene(
  args: { videoJobId: string; sceneId: string },
  deps?: SceneVideoAttemptServiceDeps,
): Promise<SceneVideoAttemptView[]> {
  const videoJobId = validateUuid(args.videoJobId, "video_job_id");
  const sceneId = args.sceneId.trim();
  if (!sceneId) throw new Error("scene_id_required");
  const { data, error } = await supabaseOf(deps)
    .from("scene_video_generation_attempts")
    .select("*")
    .eq("video_job_id", videoJobId)
    .eq("scene_id", sceneId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as SceneVideoAttemptRow[])
    .filter((r) => isSceneVideoAttemptStatus(r.status))
    .map((r) => mapAttemptRow(r, false));
}

function mapProviderStatus(
  status: string,
): Extract<
  SceneVideoAttemptStatus,
  "pending" | "running" | "succeeded" | "failed" | "cancelled"
> | null {
  switch (status) {
    case "pending":
    case "throttled":
      return "pending";
    case "running":
      return "running";
    case "succeeded":
      return "succeeded";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
    default:
      return null;
  }
}

async function claimDownload(
  supabase: SupabaseClient,
  row: SceneVideoAttemptRow,
  owner: string,
  deps?: SceneVideoAttemptServiceDeps,
): Promise<SceneVideoAttemptRow | null> {
  const now = deps?.now ?? (() => new Date());
  const nowDate = now();

  // Fresh claim from in-progress provider states.
  {
    const { data, error } = await supabase
      .from("scene_video_generation_attempts")
      .update({
        status: "downloading",
        download_claimed_at: nowDate.toISOString(),
        download_claim_owner: owner,
      })
      .eq("id", row.id)
      .in("status", ["submitted", "pending", "running"])
      .is("output_path", null)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (data) return data as SceneVideoAttemptRow;
  }

  // Stale downloading reclaim — compare-and-swap on prior claim fields.
  const fresh = await loadAttempt(supabase, row.id);
  if (
    fresh.status === "downloading" &&
    !fresh.output_path &&
    fresh.download_claimed_at &&
    fresh.download_claim_owner
  ) {
    const claimedAt = Date.parse(fresh.download_claimed_at);
    if (
      Number.isFinite(claimedAt) &&
      nowDate.getTime() - claimedAt >= SCENE_VIDEO_DOWNLOAD_CLAIM_STALE_MS
    ) {
      const { data, error } = await supabase
        .from("scene_video_generation_attempts")
        .update({
          status: "downloading",
          download_claimed_at: nowDate.toISOString(),
          download_claim_owner: owner,
        })
        .eq("id", row.id)
        .eq("status", "downloading")
        .is("output_path", null)
        .eq("download_claim_owner", fresh.download_claim_owner)
        .eq("download_claimed_at", fresh.download_claimed_at)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      if (data) return data as SceneVideoAttemptRow;
    }
  }

  return null;
}

async function finalizeSucceededOutput(
  row: SceneVideoAttemptRow,
  videoUrl: string,
  deps?: SceneVideoAttemptServiceDeps,
): Promise<SceneVideoAttemptRow> {
  const supabase = supabaseOf(deps);
  const fetchImpl = fetchOf(deps);
  const owner = randomUUID();

  const claimed = await claimDownload(supabase, row, owner, deps);
  if (!claimed) {
    // Another worker won — return current row.
    return loadAttempt(supabase, row.id);
  }

  let response: Response;
  try {
    response = await fetchImpl(videoUrl, { method: "GET", redirect: "error" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "download_failed";
    const lostOrMarked = await failOwnedDownloadOrReturnCurrent(
      supabase,
      row.id,
      owner,
      `Download failed: ${msg}`,
      "download_failed",
      deps,
    );
    if (lostOrMarked !== "marked") return lostOrMarked;
    throw new Error("download_failed");
  }

  if (!response.ok) {
    const lostOrMarked = await failOwnedDownloadOrReturnCurrent(
      supabase,
      row.id,
      owner,
      `Download HTTP ${response.status} from ${redactUrlForLog(videoUrl)}`,
      "download_http_failed",
      deps,
    );
    if (lostOrMarked !== "marked") return lostOrMarked;
    throw new Error("download_http_failed");
  }

  const contentType = (response.headers.get("content-type") ?? "")
    .split(";")[0]
    ?.trim()
    .toLowerCase();
  if (!contentType || !contentType.startsWith("video/")) {
    const lostOrMarked = await failOwnedDownloadOrReturnCurrent(
      supabase,
      row.id,
      owner,
      `Unexpected content-type: ${contentType || "missing"}`,
      "download_not_video",
      deps,
    );
    if (lostOrMarked !== "marked") return lostOrMarked;
    throw new Error("download_not_video");
  }

  let buffer: Buffer;
  try {
    buffer = await readResponseBodyBounded(
      response,
      deps?.maxOutputBytes ?? SCENE_VIDEO_ATTEMPT_MAX_OUTPUT_BYTES,
    );
  } catch (err) {
    if (err instanceof BoundedDownloadError && err.code === "download_too_large") {
      const lostOrMarked = await failOwnedDownloadOrReturnCurrent(
        supabase,
        row.id,
        owner,
        err.message,
        "download_too_large",
        deps,
      );
      if (lostOrMarked !== "marked") return lostOrMarked;
      throw new Error("download_too_large");
    }
    throw err;
  }

  const probed = await probeVideoBuffer(buffer);
  if (!probed.hasVideo) {
    const lostOrMarked = await failOwnedDownloadOrReturnCurrent(
      supabase,
      row.id,
      owner,
      "Downloaded file has no video stream",
      "download_no_video_stream",
      deps,
    );
    if (lostOrMarked !== "marked") return lostOrMarked;
    throw new Error("download_no_video_stream");
  }

  const outputBucket = STORAGE_BUCKETS.videoRenders;
  const outputPath = buildSceneVideoAttemptPath(
    claimed.project_id,
    claimed.id,
    "output.mp4",
  );

  const { error: uploadError } = await supabase.storage
    .from(outputBucket)
    .upload(outputPath, buffer, {
      contentType: contentType || "video/mp4",
      upsert: true,
    });
  if (uploadError) {
    const lostOrMarked = await failOwnedDownloadOrReturnCurrent(
      supabase,
      row.id,
      owner,
      `Upload failed: ${uploadError.message}`,
      "upload_failed",
      deps,
    );
    if (lostOrMarked !== "marked") return lostOrMarked;
    throw new Error("upload_failed");
  }

  const completedAt = nowIso(deps);
  const generationDurationMs =
    claimed.submitted_at != null
      ? Math.max(
          0,
          Date.parse(completedAt) - Date.parse(claimed.submitted_at),
        )
      : null;

  // Success DB write is also ownership-gated (same owner + downloading).
  const { data: updated, error: updateError } = await supabase
    .from("scene_video_generation_attempts")
    .update({
      status: "succeeded",
      output_bucket: outputBucket,
      output_path: outputPath,
      output_duration_seconds: probed.durationSeconds,
      output_has_audio: probed.hasAudio,
      error_message: null,
      failure_code: null,
      completed_at: completedAt,
      generation_duration_ms: generationDurationMs,
      download_claimed_at: null,
      download_claim_owner: null,
    })
    .eq("id", claimed.id)
    .eq("status", "downloading")
    .eq("download_claim_owner", owner)
    .is("output_path", null)
    .select("*")
    .maybeSingle();
  if (updateError) throw updateError;

  if (!updated) {
    // Claim lost after upload — durable upsert may have run; do not mutate state.
    return loadAttempt(supabase, row.id);
  }
  return updated as SceneVideoAttemptRow;
}

/**
 * Poll provider task for an attempt and finalize durable output once.
 * Never accepts an arbitrary task id from the client — uses stored provider_task_id.
 */
export async function syncSceneVideoAttempt(
  attemptId: string,
  deps?: SceneVideoAttemptServiceDeps,
): Promise<SceneVideoAttemptView> {
  const supabase = supabaseOf(deps);
  let row = await loadAttempt(supabase, attemptId);

  if (
    (SCENE_VIDEO_ATTEMPT_TERMINAL_STATUSES as readonly string[]).includes(
      row.status,
    )
  ) {
    return mapAttemptRow(row, false);
  }

  row = await resolveSubmittingRowForSync(supabase, row, deps);
  if (row.status === "submission_unknown") {
    return mapAttemptRow(row, false);
  }
  if (row.status === "submitting" && !row.provider_task_id) {
    row = await loadAttempt(supabase, row.id);
    if (row.status === "submitting" && !row.provider_task_id) {
      return mapAttemptRow(row, false);
    }
  }

  if (row.status === "created" || !row.provider_task_id) {
    // No reliable task — do not call provider; do not auto-retry.
    return mapAttemptRow(row, false);
  }

  if (row.status === "succeeded" && row.output_bucket && row.output_path) {
    return mapAttemptRow(row, false);
  }

  const snapshot =
    (row.generation_mode ?? "image_to_video") === "text_to_video"
      ? await providerOf(deps).getTextToVideoTask(row.provider_task_id, {
          model: row.model,
          maxTransportAttempts: 1,
        })
      : await providerOf(deps).getImageToVideoTask(row.provider_task_id, {
          model: row.model,
          maxTransportAttempts: 1,
        });

  const mapped = mapProviderStatus(snapshot.status);
  if (!mapped) throw new Error("unexpected_provider_status");

  if (mapped === "pending" || mapped === "running") {
    const patch: Record<string, unknown> = { status: mapped };
    if (mapped === "running" && !row.started_at) {
      patch.started_at = nowIso(deps);
    }
    const { data: updated } = await supabase
      .from("scene_video_generation_attempts")
      .update(patch)
      .eq("id", row.id)
      .in("status", ["submitted", "pending", "running"])
      .select("*")
      .maybeSingle();
    if (updated) row = updated as SceneVideoAttemptRow;
    return mapAttemptRow(row, false);
  }

  if (mapped === "failed" || mapped === "cancelled") {
    const { data: updated } = await supabase
      .from("scene_video_generation_attempts")
      .update({
        status: mapped,
        error_message: (snapshot.error?.message ?? mapped).slice(0, 1000),
        failure_code: snapshot.error?.code ?? null,
        completed_at: nowIso(deps),
        download_claimed_at: null,
        download_claim_owner: null,
      })
      .eq("id", row.id)
      .in("status", ["submitted", "pending", "running", "downloading"])
      .select("*")
      .maybeSingle();
    return mapAttemptRow((updated as SceneVideoAttemptRow | null) ?? row, false);
  }

  // Provider succeeded.
  if (!snapshot.videoUrl) throw new Error("missing_video_url");

  row = await loadAttempt(supabase, row.id);
  if (row.output_bucket && row.output_path) {
    return mapAttemptRow(row, false);
  }

  row = await finalizeSucceededOutput(row, snapshot.videoUrl, deps);
  return mapAttemptRow(row, false);
}

export interface CreateTextToVideoSceneVideoAttemptInput {
  projectId: string;
  videoJobId: string;
  sceneId: string;
  promptText: string;
  clientRequestId: string;
  durationSeconds: number;
  ratio: string;
  seed?: number;
  estimatedCredits?: number;
  estimatedCostUsd?: number;
  requestFingerprint: string;
  requiredTrimmedDurationSeconds: number;
  promptContractVersion: number;
  parentAttemptId?: string;
}

async function submitTextToVideoProviderCreate(
  row: SceneVideoAttemptRow,
  deps?: SceneVideoAttemptServiceDeps,
): Promise<SceneVideoAttemptView> {
  const supabase = supabaseOf(deps);
  const provider = providerOf(deps);
  const owner = submissionOwner(deps);

  const claimed = await claimSubmission(supabase, row, owner, deps);
  if (!claimed) {
    const current = await loadAttempt(supabase, row.id);
    if (
      current.status === "submitting" &&
      !current.provider_task_id &&
      isSubmissionClaimStale(current, deps)
    ) {
      await markStaleSubmissionUnknown(supabase, current, deps);
      throw new Error("submission_unknown");
    }
    if (current.status === "submission_unknown") {
      throw new Error("submission_unknown");
    }
    const canonicalView = await getSceneVideoAttemptByClientRequestId(
      current.client_request_id,
      deps,
    );
    if (canonicalView?.status === "succeeded") {
      return canonicalView;
    }
    const peerList = await listSceneVideoAttemptsForScene(
      { videoJobId: row.video_job_id, sceneId: row.scene_id },
      deps,
    );
    for (const peer of peerList) {
      if (
        peer.generationMode === "text_to_video" &&
        peer.requestFingerprint === row.request_fingerprint &&
        peer.status === "succeeded"
      ) {
        return peer;
      }
    }
    if (
      current.status === "submitting" &&
      !current.provider_task_id &&
      !isSubmissionClaimStale(current, deps)
    ) {
      return waitForPeerSubmissionOutcome(
        supabase,
        current.id,
        current.client_request_id,
        deps,
      );
    }
    return mapAttemptRow(current, true);
  }

  const working = claimed;
  try {
    const created = await provider.createTextToVideo({
      promptText: working.motion_prompt,
      model: working.model,
      duration: working.duration_seconds,
      ratio: working.ratio,
      ...(working.seed != null ? { seed: working.seed } : {}),
      dangerousCreateMaxTransportAttempts: 1,
    });

    const submittedAt = nowIso(deps);
    const { data: updated, error: updateError } = await supabase
      .from("scene_video_generation_attempts")
      .update({
        provider_task_id: created.providerTaskId,
        status: "submitted",
        submitted_at: submittedAt,
        submission_claimed_at: null,
        submission_claim_owner: null,
      })
      .eq("id", working.id)
      .eq("submission_claim_owner", owner)
      .is("provider_task_id", null)
      .eq("status", "submitting")
      .select("*")
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updated) {
      return mapAttemptRow(await loadAttempt(supabase, working.id), true);
    }
    return mapAttemptRow(updated as SceneVideoAttemptRow, false);
  } catch (err) {
    const message =
      err instanceof Error ? err.message.slice(0, 1000) : "provider_create_failed";
    const failureCode =
      err instanceof VideoGenerationError
        ? err.failureCode ?? err.code
        : "provider_create_failed";
    const classified = classifyCreateFailure(err);
    if (classified === "submission_unknown") {
      const marked = await markOwnedSubmissionTerminal(
        supabase,
        working.id,
        owner,
        "submission_unknown",
        message,
        failureCode,
        deps,
      );
      if (marked === "claim_lost") {
        return mapAttemptRow(await loadAttempt(supabase, working.id), true);
      }
      throw new Error("submission_unknown");
    }
    const marked = await markOwnedSubmissionTerminal(
      supabase,
      working.id,
      owner,
      "failed",
      message,
      failureCode,
      deps,
    );
    if (marked === "claim_lost") {
      return mapAttemptRow(await loadAttempt(supabase, working.id), true);
    }
    throw err;
  }
}

function needsTextToVideoSubmit(row: SceneVideoAttemptRow): boolean {
  if (row.provider_task_id) return false;
  return row.status === "created" || row.status === "submitting";
}

export async function createTextToVideoSceneVideoAttempt(
  input: CreateTextToVideoSceneVideoAttemptInput,
  deps?: SceneVideoAttemptServiceDeps,
): Promise<SceneVideoAttemptView> {
  const projectId = validateUuid(input.projectId, "project_id");
  const videoJobId = validateUuid(input.videoJobId, "video_job_id");
  const clientRequestId = validateUuid(
    input.clientRequestId,
    "client_request_id",
  );
  const sceneId = input.sceneId.trim();
  if (!sceneId) throw new Error("scene_id_required");
  const promptText = validateMotionPrompt(input.promptText);
  if (
    !Number.isFinite(input.durationSeconds) ||
    input.durationSeconds < 2 ||
    input.durationSeconds > 10
  ) {
    throw new Error("duration_invalid");
  }
  if (input.ratio.trim() !== "720:1280") {
    throw new Error("ratio_invalid");
  }
  const supabase = supabaseOf(deps);
  const { data: existing, error: existingError } = await supabase
    .from("scene_video_generation_attempts")
    .select("*")
    .eq("client_request_id", clientRequestId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    const row = existing as SceneVideoAttemptRow;
    if (!needsTextToVideoSubmit(row)) {
      return mapAttemptRow(row, true);
    }
    return submitTextToVideoProviderCreate(row, deps);
  }

  const seed = validateSceneVideoSeed(input.seed === undefined ? null : input.seed);
  const insertPayload = {
    project_id: projectId,
    video_job_id: videoJobId,
    scene_id: sceneId,
    client_request_id: clientRequestId,
    parent_attempt_id: input.parentAttemptId ?? null,
    source_image_bucket: null,
    source_image_path: null,
    motion_prompt: promptText,
    provider: "runway",
    model: "gen4.5",
    duration_seconds: Math.round(input.durationSeconds),
    ratio: input.ratio.trim(),
    seed,
    status: "created" as const,
    estimated_credits: input.estimatedCredits ?? null,
    estimated_cost_usd: input.estimatedCostUsd ?? null,
    generation_mode: "text_to_video" as const,
    request_fingerprint: input.requestFingerprint,
    required_trimmed_duration_seconds: input.requiredTrimmedDurationSeconds,
    prompt_contract_version: input.promptContractVersion,
    provider_metadata: {
      request_fingerprint: input.requestFingerprint,
    },
  };

  const { data: inserted, error: insertError } = await supabase
    .from("scene_video_generation_attempts")
    .insert(insertPayload)
    .select("*")
    .single();
  if (insertError) {
    if (insertError.code === "23505") {
      const { data: raced } = await supabase
        .from("scene_video_generation_attempts")
        .select("*")
        .eq("client_request_id", clientRequestId)
        .maybeSingle();
      if (raced) {
        const racedRow = raced as SceneVideoAttemptRow;
        if (!needsTextToVideoSubmit(racedRow)) {
          return mapAttemptRow(racedRow, true);
        }
        return submitTextToVideoProviderCreate(racedRow, deps);
      }
    }
    throw insertError;
  }
  const row = inserted as SceneVideoAttemptRow;
  if (row.provider_task_id) {
    return mapAttemptRow(row, true);
  }
  return submitTextToVideoProviderCreate(row, deps);
}

export interface RetrySceneVideoAttemptInput {
  parentAttemptId: string;
  clientRequestId: string;
  /** Optional replacement motion prompt; defaults to parent. */
  motionPrompt?: string;
}

/**
 * Conscious paid retry: new row + new client_request_id + parent lineage.
 * Refuses parents in submission_unknown (no automatic or casual re-create).
 */
export async function createRetrySceneVideoAttempt(
  input: RetrySceneVideoAttemptInput,
  deps?: SceneVideoAttemptServiceDeps,
): Promise<SceneVideoAttemptView> {
  const parentId = validateUuid(input.parentAttemptId, "parent_attempt_id");
  const clientRequestId = validateUuid(
    input.clientRequestId,
    "client_request_id",
  );
  const supabase = supabaseOf(deps);
  const parent = await loadAttempt(supabase, parentId);

  if (parent.status === "submission_unknown") {
    throw new Error("retry_forbidden_submission_unknown");
  }

  const motionPrompt = validateMotionPrompt(
    input.motionPrompt ?? parent.motion_prompt,
  );

  return createSceneVideoAttempt(
    {
      projectId: parent.project_id,
      videoJobId: parent.video_job_id,
      sceneId: parent.scene_id,
      motionPrompt,
      clientRequestId,
      provider: parent.provider,
      model: parent.model,
      durationSeconds: parent.duration_seconds,
      ratio: parent.ratio,
      parentAttemptId: parent.id,
      ...(parent.seed != null ? { seed: parent.seed } : {}),
      ...(parent.estimated_credits != null
        ? { estimatedCredits: Number(parent.estimated_credits) }
        : {}),
      ...(parent.estimated_cost_usd != null
        ? { estimatedCostUsd: Number(parent.estimated_cost_usd) }
        : {}),
      sourceImageBucket: parent.source_image_bucket,
      sourceImagePath: parent.source_image_path,
    },
    deps,
  );
}
