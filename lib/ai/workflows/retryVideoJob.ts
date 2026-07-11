import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ContentItem, Json, LanguageCode } from "@/lib/supabase/types";
import { WorkflowError } from "@/lib/ai/workflows/shared";
import {
  startVideoWorkerJob,
  type VideoWorkerJobPayload,
} from "@/lib/video-worker/client";
import { claimAndDispatchVariantVideoJob } from "@/lib/ai/workflows/dispatchVariantVideoJob";
import { extractRenderSpecScenes } from "@/lib/ai/workflows/languageVariantsHelpers";
import { attachTtsToVideoJobInput } from "@/lib/voice/videoJobTtsInput";
import {
  applySemanticMotionPreservationFromSourceJob,
  resolveSourceJobOutputForSemanticMotion,
} from "@/lib/video-engine/semanticMotion/storedSemanticMotionJobInput";

// Retry a FAILED video render/upload for ONE language without touching any
// generated text, content_items or scene images.
//
// Background: a render can succeed end-to-end and still fail only while uploading
// the MP4 to Supabase Storage (observed as an aborted mid-upload surfaced as HTTP
// 400). The expensive work — localization, content_items and scene images — is
// already done and durable. This workflow therefore creates a BRAND-NEW video_job
// for the SAME content_item, reusing the failed job's stored render input verbatim
// (its `scenes` carry image_bucket + image_path, so the worker reuses the exact
// stills with no image generation), and dispatches it to the worker.
//
// The original failed job is kept as history; the new job is simply newer, so the
// read layer (newestByContentItem) naturally prefers it. A duplicate is never
// created when a queued/processing job already exists for the same content_item.

export interface RetryVideoJobInput {
  projectId: string;
  // The failed video_jobs.id the user clicked "Retry video render" on.
  videoJobId: string;
  /** When set, overrides voiceover_text on the new job input (failed-job editor). */
  voiceoverText?: string;
}

export interface RetryVideoJobSummary {
  // The job that is now the active/latest render for the language. Either the
  // newly created job, or the already-active job when one existed (idempotent).
  videoJobId: string;
  language: LanguageCode | null;
  // True when a NEW job row was inserted; false when an existing active job was
  // returned instead (queued/processing already in flight).
  created: boolean;
  dispatched: boolean;
  warnings: string[];
}

export interface RetryVideoJobDeps {
  client?: SupabaseClient;
  // Request-derived worker callback URL. When omitted the new job is left queued
  // (no inline dispatch), recoverable by a later retry.
  videoCallbackUrl?: string;
  startVideoJob?: (payload: VideoWorkerJobPayload) => Promise<void>;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

// Reusable scenes carried directly on a video_jobs.input blob (the form variant
// jobs are created with). Returns null when absent or not durably reusable.
function extractInputScenes(
  input: unknown,
): Record<string, unknown>[] | null {
  const record = asRecord(input);
  if (!record) return null;
  const scenes = record.scenes;
  if (!Array.isArray(scenes) || scenes.length === 0) return null;
  const usable = scenes.every(
    (scene) =>
      scene &&
      typeof scene === "object" &&
      !Array.isArray(scene) &&
      typeof (scene as Record<string, unknown>).image_path === "string",
  );
  return usable ? (scenes as Record<string, unknown>[]) : null;
}

// Resolves reusable scenes for the retry: prefer the failed job's own input
// scenes; otherwise fall back to the newest completed render_spec for the same
// content item (older jobs that did not persist scenes on input). Returns null
// only when no durable visuals exist anywhere (legacy — needs a full re-render).
async function resolveReusableScenes(
  supabase: SupabaseClient,
  args: { projectId: string; contentItemId: string; failedInput: unknown },
): Promise<Record<string, unknown>[] | null> {
  const fromInput = extractInputScenes(args.failedInput);
  if (fromInput) return fromInput;

  const { data: jobRows, error } = await supabase
    .from("video_jobs")
    .select("output")
    .eq("project_id", args.projectId)
    .eq("content_item_id", args.contentItemId)
    .eq("status", "completed")
    .order("created_at", { ascending: false });
  if (error) throw error;

  for (const job of jobRows ?? []) {
    const scenes = extractRenderSpecScenes((job as { output: unknown }).output);
    if (scenes) return scenes;
  }
  return null;
}

export async function runRetryVideoJob(
  input: RetryVideoJobInput,
  deps: RetryVideoJobDeps = {},
): Promise<RetryVideoJobSummary> {
  const { projectId, videoJobId } = input;
  if (!projectId) throw new WorkflowError("invalid_input", "project_id is required");
  if (!videoJobId) {
    throw new WorkflowError("invalid_input", "video_job_id is required");
  }

  const supabase: SupabaseClient = deps.client ?? createSupabaseAdminClient();
  const startVideoJob = deps.startVideoJob ?? startVideoWorkerJob;

  // Load the job the user is retrying, strictly scoped to the project.
  const { data: jobRow, error: jobErr } = await supabase
    .from("video_jobs")
    .select("id, project_id, content_item_id, provider, status, input, output")
    .eq("id", videoJobId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (jobErr) throw jobErr;
  if (!jobRow) {
    throw new WorkflowError(
      "not_found",
      `video job ${videoJobId} not found for project ${projectId}`,
    );
  }

  const failedStatus = jobRow.status as string;
  const contentItemId = (jobRow.content_item_id as string | null) ?? null;
  const provider = (jobRow.provider as string | null) ?? "video_engine";
  const failedInput = jobRow.input;
  const failedOutput = jobRow.output;

  // Only a FAILED render is retried here. A queued/processing job is still in
  // flight, and a completed one already succeeded — re-rendering either would be
  // wasted worker cost.
  if (failedStatus !== "failed") {
    throw new WorkflowError(
      "invalid_input",
      `video job ${videoJobId} is '${failedStatus}', only 'failed' jobs can be retried`,
    );
  }

  if (!contentItemId) {
    throw new WorkflowError(
      "invalid_input",
      `video job ${videoJobId} has no content_item; cannot retry a detached job`,
    );
  }

  // Resolve the content item (for language + package scoping). Scoped by project.
  const { data: itemRow, error: itemErr } = await supabase
    .from("content_items")
    .select("id, package_id, language")
    .eq("id", contentItemId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (itemErr) throw itemErr;
  if (!itemRow) {
    throw new WorkflowError(
      "not_found",
      `content item ${contentItemId} not found for project ${projectId}`,
    );
  }
  const item = itemRow as Pick<ContentItem, "id" | "package_id" | "language">;
  const packageId = item.package_id;
  const language = item.language ?? null;

  const warnings: string[] = [];

  // Duplicate guard: never create a second active render for the same language.
  // If a queued/processing job already exists for this content item, return it
  // (idempotent) instead of inserting another.
  const { data: activeRows, error: activeErr } = await supabase
    .from("video_jobs")
    .select("id")
    .eq("project_id", projectId)
    .eq("content_item_id", contentItemId)
    .in("status", ["queued", "processing"])
    .order("created_at", { ascending: false })
    .limit(1);
  if (activeErr) throw activeErr;
  const existingActive = (activeRows ?? [])[0] as { id: string } | undefined;
  if (existingActive) {
    return {
      videoJobId: existingActive.id,
      language,
      created: false,
      dispatched: false,
      warnings: [
        `an active render (job ${existingActive.id}) already exists for this language; retry skipped (idempotent)`,
      ],
    };
  }

  // Reuse the exact visuals: scenes from the failed input (or a completed
  // render_spec fallback). No images are regenerated.
  const scenes = await resolveReusableScenes(supabase, {
    projectId,
    contentItemId,
    failedInput,
  });

  // Build the new job input by reusing the failed job's input verbatim (text,
  // voiceover, subtitles, language all preserved). When reusable scene stills
  // exist, pin them so the worker skips image generation. When they do not
  // (early failure — e.g. TTS tail validation before render_spec was saved),
  // omit scenes so the worker runs the full pipeline again.
  const baseInput = asRecord(failedInput) ?? {};
  if (!scenes) {
    warnings.push(
      "no reusable scenes on the failed job; retry will run a full render (TTS + images)",
    );
  }
  const voiceoverOverride = input.voiceoverText?.trim();
  const motionSourceOutput = await resolveSourceJobOutputForSemanticMotion(
    supabase,
    {
      projectId,
      contentItemId,
      primaryOutput: failedOutput,
    },
  );
  let jobInput = await attachTtsToVideoJobInput(
    supabase,
    projectId,
    applySemanticMotionPreservationFromSourceJob({
      jobInput: {
        ...baseInput,
        ...(scenes ? { scenes } : {}),
        ...(voiceoverOverride ? { voiceover_text: voiceoverOverride } : {}),
        retry_of_video_job_id: videoJobId,
      },
      sourceJobOutput: motionSourceOutput,
    }),
    baseInput,
  );

  const { data: insertedRow, error: insertErr } = await supabase
    .from("video_jobs")
    .insert({
      project_id: projectId,
      content_item_id: contentItemId,
      provider,
      status: "queued",
      input: jobInput as unknown as Json,
    })
    .select("id")
    .single();
  if (insertErr) throw insertErr;
  const newVideoJobId = insertedRow.id as string;

  // Dispatch needs the package id (worker payload requires content_package_id).
  // A content item should always have a package; guard defensively.
  if (!packageId) {
    warnings.push(
      `content item ${contentItemId} has no package; new job ${newVideoJobId} left queued (no inline dispatch)`,
    );
    return {
      videoJobId: newVideoJobId,
      language,
      created: true,
      dispatched: false,
      warnings,
    };
  }

  if (!deps.videoCallbackUrl) {
    warnings.push(
      `new job ${newVideoJobId} left queued (no callback url for inline start)`,
    );
    return {
      videoJobId: newVideoJobId,
      language,
      created: true,
      dispatched: false,
      warnings,
    };
  }

  const dispatch = await claimAndDispatchVariantVideoJob(supabase, {
    videoJobId: newVideoJobId,
    projectId,
    contentPackageId: packageId,
    contentItemId,
    callbackUrl: deps.videoCallbackUrl,
    input: jobInput as Record<string, unknown>,
    startVideoJob,
  });
  if (dispatch.warning) warnings.push(dispatch.warning);

  return {
    videoJobId: newVideoJobId,
    language,
    created: true,
    dispatched: dispatch.dispatched,
    warnings,
  };
}
