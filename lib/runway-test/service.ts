import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getVideoGenerationProvider,
} from "@/lib/ai/index";
import type { VideoGenerationProvider } from "@/lib/ai/videoGeneration";
import { VideoGenerationError } from "@/lib/ai/videoGenerationError";
import {
  buildRunwayTestPath,
  STORAGE_BUCKETS,
} from "@/lib/api/storage";
import {
  RUNWAY_SCENE_TEST_CONFIG,
  RUNWAY_SCENE_TEST_COST,
} from "@/lib/runway-test/config";
import {
  findUsableSceneStill,
  extractUsableSceneStills,
  redactUrlForLog,
} from "@/lib/runway-test/scenes";
import type {
  RunwayTestJobPublicView,
  RunwayTestJobRow,
  RunwayTestJobStatus,
  RunwayTestSceneOption,
} from "@/lib/runway-test/types";
import { isRunwayTestJobStatus } from "@/lib/runway-test/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface RunwayTestServiceDeps {
  supabase?: SupabaseClient;
  videoProvider?: VideoGenerationProvider;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

function supabaseOf(deps?: RunwayTestServiceDeps): SupabaseClient {
  return deps?.supabase ?? createSupabaseAdminClient();
}

function providerOf(deps?: RunwayTestServiceDeps): VideoGenerationProvider {
  return deps?.videoProvider ?? getVideoGenerationProvider();
}

function fetchOf(deps?: RunwayTestServiceDeps): typeof fetch {
  return deps?.fetchImpl ?? fetch;
}

function mapRow(row: RunwayTestJobRow): Omit<
  RunwayTestJobPublicView,
  "playbackUrl" | "sourcePreviewUrl" | "reusedExistingRequest"
> {
  return {
    id: row.id,
    projectId: row.project_id,
    clientRequestId: row.client_request_id,
    sourceVideoJobId: row.source_video_job_id,
    sourceSceneId: row.source_scene_id,
    sourceImageBucket: row.source_image_bucket,
    sourceImagePath: row.source_image_path,
    motionPrompt: row.motion_prompt,
    provider: row.provider,
    model: row.model,
    durationSeconds: row.duration_seconds,
    ratio: row.ratio,
    runwayTaskId: row.runway_task_id,
    status: row.status,
    estimatedCredits:
      row.estimated_credits === null ? null : Number(row.estimated_credits),
    estimatedCostUsd:
      row.estimated_cost_usd === null ? null : Number(row.estimated_cost_usd),
    outputBucket: row.output_bucket,
    outputPath: row.output_path,
    errorMessage: row.error_message,
    failureCode: row.failure_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

async function signPath(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  ttlSeconds: number,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, ttlSeconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

async function toPublicView(
  supabase: SupabaseClient,
  row: RunwayTestJobRow,
  reusedExistingRequest: boolean,
): Promise<RunwayTestJobPublicView> {
  const base = mapRow(row);
  const sourcePreviewUrl = await signPath(
    supabase,
    row.source_image_bucket,
    row.source_image_path,
    RUNWAY_SCENE_TEST_CONFIG.playbackSignedUrlTtlSeconds,
  );
  let playbackUrl: string | null = null;
  if (row.output_bucket && row.output_path) {
    playbackUrl = await signPath(
      supabase,
      row.output_bucket,
      row.output_path,
      RUNWAY_SCENE_TEST_CONFIG.playbackSignedUrlTtlSeconds,
    );
  }
  return {
    ...base,
    sourcePreviewUrl,
    playbackUrl,
    reusedExistingRequest,
  };
}

function validateMotionPrompt(prompt: unknown): string {
  if (typeof prompt !== "string" || !prompt.trim()) {
    throw new Error("motion_prompt_required");
  }
  const trimmed = prompt.trim();
  if (trimmed.length > RUNWAY_SCENE_TEST_CONFIG.motionPromptMaxUtf16) {
    throw new Error("motion_prompt_too_long");
  }
  return trimmed;
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

export async function listRunwayTestScenesForProject(
  projectId: string,
  deps?: RunwayTestServiceDeps,
): Promise<RunwayTestSceneOption[]> {
  const pid = validateUuid(projectId, "project_id");
  const supabase = supabaseOf(deps);

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", pid)
    .maybeSingle();
  if (projectError) throw projectError;
  if (!project) throw new Error("project_not_found");

  const { data: jobs, error: jobsError } = await supabase
    .from("video_jobs")
    .select("id, status, output, created_at")
    .eq("project_id", pid)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(40);
  if (jobsError) throw jobsError;

  const options: RunwayTestSceneOption[] = [];
  for (const job of jobs ?? []) {
    const stills = extractUsableSceneStills(job.output);
    for (const still of stills) {
      const previewUrl = await signPath(
        supabase,
        still.imageBucket,
        still.imagePath,
        RUNWAY_SCENE_TEST_CONFIG.playbackSignedUrlTtlSeconds,
      );
      options.push({
        projectId: pid,
        videoJobId: job.id as string,
        sceneId: still.sceneId,
        imageBucket: still.imageBucket,
        imagePath: still.imagePath,
        previewUrl,
        videoJobCreatedAt: job.created_at as string,
        videoJobStatus: job.status as string,
      });
    }
  }
  return options;
}

export async function listRunwayTestJobs(
  projectId?: string,
  deps?: RunwayTestServiceDeps,
): Promise<RunwayTestJobPublicView[]> {
  const supabase = supabaseOf(deps);
  let query = supabase
    .from("runway_test_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30);
  if (projectId) {
    query = query.eq("project_id", validateUuid(projectId, "project_id"));
  }
  const { data, error } = await query;
  if (error) throw error;
  const views: RunwayTestJobPublicView[] = [];
  for (const row of (data ?? []) as RunwayTestJobRow[]) {
    if (!isRunwayTestJobStatus(row.status)) continue;
    views.push(await toPublicView(supabase, row, false));
  }
  return views;
}

export interface CreateRunwayTestInput {
  projectId: string;
  videoJobId: string;
  sceneId: string;
  motionPrompt: string;
  clientRequestId: string;
  /** Must be true — paid generation confirmation from the admin UI. */
  confirmPaidGeneration: boolean;
}

export async function createRunwayTestJob(
  input: CreateRunwayTestInput,
  deps?: RunwayTestServiceDeps,
): Promise<RunwayTestJobPublicView> {
  if (input.confirmPaidGeneration !== true) {
    throw new Error("paid_confirmation_required");
  }

  const projectId = validateUuid(input.projectId, "project_id");
  const videoJobId = validateUuid(input.videoJobId, "video_job_id");
  const clientRequestId = validateUuid(input.clientRequestId, "client_request_id");
  const sceneId = typeof input.sceneId === "string" ? input.sceneId.trim() : "";
  if (!sceneId) throw new Error("scene_id_required");
  const motionPrompt = validateMotionPrompt(input.motionPrompt);

  const supabase = supabaseOf(deps);

  const { data: existing, error: existingError } = await supabase
    .from("runway_test_jobs")
    .select("*")
    .eq("client_request_id", clientRequestId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    return toPublicView(supabase, existing as RunwayTestJobRow, true);
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

  const insertPayload = {
    project_id: projectId,
    client_request_id: clientRequestId,
    source_video_job_id: videoJobId,
    source_scene_id: still.sceneId,
    source_image_bucket: still.imageBucket,
    source_image_path: still.imagePath,
    motion_prompt: motionPrompt,
    provider: RUNWAY_SCENE_TEST_CONFIG.provider,
    model: RUNWAY_SCENE_TEST_CONFIG.model,
    duration_seconds: RUNWAY_SCENE_TEST_CONFIG.durationSeconds,
    ratio: RUNWAY_SCENE_TEST_CONFIG.ratio,
    status: "created" as const,
    estimated_credits: RUNWAY_SCENE_TEST_COST.credits,
    estimated_cost_usd: RUNWAY_SCENE_TEST_COST.usd,
  };

  const { data: inserted, error: insertError } = await supabase
    .from("runway_test_jobs")
    .insert(insertPayload)
    .select("*")
    .single();

  if (insertError) {
    // Race: another request inserted the same client_request_id.
    if (insertError.code === "23505") {
      const { data: raced, error: racedError } = await supabase
        .from("runway_test_jobs")
        .select("*")
        .eq("client_request_id", clientRequestId)
        .maybeSingle();
      if (racedError) throw racedError;
      if (raced) {
        return toPublicView(supabase, raced as RunwayTestJobRow, true);
      }
    }
    throw insertError;
  }

  const row = inserted as RunwayTestJobRow;

  // If a concurrent insert won and somehow we still have a row without task,
  // only the winner of insert creates. Re-check runway_task_id before POST.
  if (row.runway_task_id) {
    return toPublicView(supabase, row, true);
  }

  const sourceSignedUrl = await signPath(
    supabase,
    still.imageBucket,
    still.imagePath,
    RUNWAY_SCENE_TEST_CONFIG.sourceSignedUrlTtlSeconds,
  );
  if (!sourceSignedUrl) {
    await markFailed(supabase, row.id, "source_signed_url_failed", null);
    throw new Error("source_signed_url_failed");
  }

  try {
    const created = await providerOf(deps).createImageToVideo({
      imageUrl: sourceSignedUrl,
      motionPrompt,
      model: RUNWAY_SCENE_TEST_CONFIG.model,
      duration: RUNWAY_SCENE_TEST_CONFIG.durationSeconds,
      ratio: RUNWAY_SCENE_TEST_CONFIG.ratio,
    });

    const { data: updated, error: updateError } = await supabase
      .from("runway_test_jobs")
      .update({
        runway_task_id: created.providerTaskId,
        status: "pending",
      })
      .eq("id", row.id)
      .is("runway_task_id", null)
      .select("*")
      .maybeSingle();

    if (updateError) throw updateError;

    // Another worker already set the task id — do not treat as new create.
    if (!updated) {
      const { data: current } = await supabase
        .from("runway_test_jobs")
        .select("*")
        .eq("id", row.id)
        .single();
      return toPublicView(supabase, current as RunwayTestJobRow, true);
    }

    return toPublicView(supabase, updated as RunwayTestJobRow, false);
  } catch (err) {
    const message =
      err instanceof VideoGenerationError
        ? err.message
        : err instanceof Error
          ? err.message
          : "runway_create_failed";
    await markFailed(
      supabase,
      row.id,
      message,
      err instanceof VideoGenerationError ? err.failureCode ?? err.code : null,
    );
    throw err;
  }
}

async function markFailed(
  supabase: SupabaseClient,
  id: string,
  errorMessage: string,
  failureCode: string | null,
): Promise<void> {
  await supabase
    .from("runway_test_jobs")
    .update({
      status: "failed",
      error_message: errorMessage.slice(0, 1000),
      failure_code: failureCode,
      completed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .in("status", ["created", "pending", "running"]);
}

async function loadJobForProject(
  supabase: SupabaseClient,
  testJobId: string,
  projectId: string,
): Promise<RunwayTestJobRow> {
  const id = validateUuid(testJobId, "test_job_id");
  const pid = validateUuid(projectId, "project_id");
  const { data, error } = await supabase
    .from("runway_test_jobs")
    .select("*")
    .eq("id", id)
    .eq("project_id", pid)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("test_job_not_found");
  const row = data as RunwayTestJobRow;
  if (!isRunwayTestJobStatus(row.status)) {
    throw new Error("test_job_invalid_status");
  }
  return row;
}

async function downloadAndStoreOutput(
  row: RunwayTestJobRow,
  videoUrl: string,
  deps?: RunwayTestServiceDeps,
): Promise<RunwayTestJobRow> {
  const supabase = supabaseOf(deps);
  const fetchImpl = fetchOf(deps);

  // Already stored — never re-download.
  if (row.output_bucket && row.output_path) {
    return row;
  }

  let response: Response;
  try {
    response = await fetchImpl(videoUrl, { method: "GET", redirect: "error" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "download_failed";
    await supabase
      .from("runway_test_jobs")
      .update({
        status: "download_failed",
        error_message: `Download failed: ${msg}`.slice(0, 1000),
        completed_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    throw new Error("download_failed");
  }

  if (!response.ok) {
    await supabase
      .from("runway_test_jobs")
      .update({
        status: "download_failed",
        error_message: `Download HTTP ${response.status} from ${redactUrlForLog(videoUrl)}`.slice(
          0,
          1000,
        ),
        completed_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    throw new Error("download_http_failed");
  }

  const contentType = (response.headers.get("content-type") ?? "")
    .split(";")[0]
    ?.trim()
    .toLowerCase();
  if (!contentType || !contentType.startsWith("video/")) {
    await supabase
      .from("runway_test_jobs")
      .update({
        status: "download_failed",
        error_message: `Unexpected content-type: ${contentType || "missing"}`.slice(
          0,
          1000,
        ),
        completed_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    throw new Error("download_not_video");
  }

  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (
    Number.isFinite(contentLength) &&
    contentLength > RUNWAY_SCENE_TEST_CONFIG.maxOutputBytes
  ) {
    await supabase
      .from("runway_test_jobs")
      .update({
        status: "download_failed",
        error_message: `Output exceeds size limit (${contentLength} bytes)`,
        completed_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    throw new Error("download_too_large");
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > RUNWAY_SCENE_TEST_CONFIG.maxOutputBytes) {
    await supabase
      .from("runway_test_jobs")
      .update({
        status: "download_failed",
        error_message: `Output exceeds size limit (${buffer.byteLength} bytes)`,
        completed_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    throw new Error("download_too_large");
  }

  const outputBucket = STORAGE_BUCKETS.videoRenders;
  const outputPath = buildRunwayTestPath(row.project_id, row.id, "output.mp4");

  const { error: uploadError } = await supabase.storage
    .from(outputBucket)
    .upload(outputPath, buffer, {
      contentType: contentType || "video/mp4",
      upsert: true,
    });
  if (uploadError) {
    await supabase
      .from("runway_test_jobs")
      .update({
        status: "download_failed",
        error_message: `Upload failed: ${uploadError.message}`.slice(0, 1000),
        completed_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    throw new Error("upload_failed");
  }

  const { data: updated, error: updateError } = await supabase
    .from("runway_test_jobs")
    .update({
      status: "succeeded",
      output_bucket: outputBucket,
      output_path: outputPath,
      error_message: null,
      failure_code: null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .is("output_path", null)
    .select("*")
    .maybeSingle();

  if (updateError) throw updateError;

  if (!updated) {
    // Concurrent status poll already persisted output.
    const { data: current } = await supabase
      .from("runway_test_jobs")
      .select("*")
      .eq("id", row.id)
      .single();
    return current as RunwayTestJobRow;
  }

  return updated as RunwayTestJobRow;
}

function mapProviderStatusToJobStatus(
  status: string,
): RunwayTestJobStatus | null {
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

export async function syncRunwayTestJobStatus(
  args: { testJobId: string; projectId: string },
  deps?: RunwayTestServiceDeps,
): Promise<RunwayTestJobPublicView> {
  const supabase = supabaseOf(deps);
  let row = await loadJobForProject(supabase, args.testJobId, args.projectId);

  // Terminal with stored output — no Runway call, no re-download.
  if (
    row.status === "succeeded" &&
    row.output_bucket &&
    row.output_path
  ) {
    return toPublicView(supabase, row, false);
  }

  if (
    row.status === "failed" ||
    row.status === "cancelled" ||
    row.status === "download_failed"
  ) {
    return toPublicView(supabase, row, false);
  }

  if (!row.runway_task_id) {
    return toPublicView(supabase, row, false);
  }

  const snapshot = await providerOf(deps).getImageToVideoTask(row.runway_task_id, {
    model: row.model,
    maxTransportAttempts: 1,
  });

  const mapped = mapProviderStatusToJobStatus(snapshot.status);
  if (!mapped) {
    throw new Error("unexpected_provider_status");
  }

  if (mapped === "pending" || mapped === "running") {
    if (row.status !== mapped) {
      const { data: updated } = await supabase
        .from("runway_test_jobs")
        .update({ status: mapped })
        .eq("id", row.id)
        .in("status", ["created", "pending", "running"])
        .select("*")
        .maybeSingle();
      if (updated) row = updated as RunwayTestJobRow;
    }
    return toPublicView(supabase, row, false);
  }

  if (mapped === "failed" || mapped === "cancelled") {
    const { data: updated } = await supabase
      .from("runway_test_jobs")
      .update({
        status: mapped,
        error_message: (snapshot.error?.message ?? mapped).slice(0, 1000),
        failure_code: snapshot.error?.code ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .in("status", ["created", "pending", "running"])
      .select("*")
      .maybeSingle();
    return toPublicView(
      supabase,
      (updated as RunwayTestJobRow | null) ?? row,
      false,
    );
  }

  // SUCCEEDED — download once.
  if (!snapshot.videoUrl) {
    throw new Error("missing_video_url");
  }

  // If another poll already stored output, skip download.
  {
    const { data: fresh } = await supabase
      .from("runway_test_jobs")
      .select("*")
      .eq("id", row.id)
      .single();
    row = fresh as RunwayTestJobRow;
    if (row.output_bucket && row.output_path) {
      return toPublicView(supabase, row, false);
    }
  }

  row = await downloadAndStoreOutput(row, snapshot.videoUrl, deps);
  return toPublicView(supabase, row, false);
}
