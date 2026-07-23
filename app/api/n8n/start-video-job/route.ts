import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { unauthorizedResponse, verifyN8nSecret } from "@/lib/n8n/callback";
import { WorkflowError } from "@/lib/ai/workflows/shared";
import {
  errorResponse,
  optionalString,
  readJsonBody,
  requireString,
} from "@/lib/ai/apiResponse";
import {
  PRODUCTION_RUN_CANCELLED_MESSAGE,
  isProductionRunCancelledForContentItem,
} from "@/lib/api/production-run-cancel";
import {
  startVideoWorkerJob,
  VideoWorkerConfigError,
} from "@/lib/video-worker/client";
import {
  claimVideoJobForDispatch,
  newOwnerToken,
  promoteVideoJobIfArtifactsReady,
} from "@/lib/production-runtime";
import { reconcileProductionRunForContentItem } from "@/lib/api/production-run-admin";

// n8n-invoked endpoint that hands an existing video_jobs row to the Video
// Worker. Vercel only prepares the payload, marks the job and calls the worker;
// the render result is persisted later via /api/n8n/video-callback.
export async function POST(request: Request): Promise<Response> {
  if (!verifyN8nSecret(request)) {
    return unauthorizedResponse();
  }

  try {
    const body = await readJsonBody(request);
    const projectId = requireString(body, "project_id");
    const contentPackageId = requireString(body, "content_package_id");
    const videoJobId = optionalString(body, "video_job_id");

    const supabase = createSupabaseAdminClient();

    // Ownership: the package must belong to the project.
    const { data: pkg, error: pkgErr } = await supabase
      .from("content_packages")
      .select("id")
      .eq("id", contentPackageId)
      .eq("project_id", projectId)
      .maybeSingle();
    if (pkgErr) throw pkgErr;
    if (!pkg) {
      throw new WorkflowError(
        "not_found",
        `content package ${contentPackageId} not found for project ${projectId}`,
      );
    }

    const job = await findVideoJob(supabase, {
      projectId,
      contentPackageId,
      videoJobId,
    });
    if (!job) {
      const videoRequired = await packageRequiresVideoJob(
        supabase,
        projectId,
        contentPackageId,
      );
      if (videoRequired) {
        return Response.json(
          {
            ok: false,
            status: "missing_video_job",
            text_only: false,
            error: "incomplete_package",
            message:
              "video-required package has no video_jobs row (incomplete package)",
          },
          { status: 409 },
        );
      }
      // Genuine text-only package: benign no-op.
      return Response.json(
        {
          ok: true,
          status: "no_video_job",
          text_only: true,
          message: "no video job for content package (text-only package)",
        },
        { status: 202 },
      );
    }

    // Production-run Stop: never claim/dispatch jobs whose run was cancelled.
    if (
      await isProductionRunCancelledForContentItem(
        supabase,
        projectId,
        job.contentItemId,
      )
    ) {
      await supabase
        .from("video_jobs")
        .update({
          status: "failed",
          error_message: PRODUCTION_RUN_CANCELLED_MESSAGE,
        })
        .eq("id", job.id)
        .eq("project_id", projectId)
        .in("status", ["queued", "processing"]);
      return Response.json(
        {
          ok: true,
          video_job_id: job.id,
          skipped: true,
          reason: "production_run_cancelled",
        },
        { status: 202 },
      );
    }

    // Stable owner lets the worker renew the lease without passing a new token
    // through the transport payload.
    const ownerToken = job.id || newOwnerToken();
    const claim = await claimVideoJobForDispatch(supabase, {
      jobId: job.id,
      projectId,
      ownerToken,
    });
    if (claim.status === "artifacts_ready") {
      const promoted = await promoteVideoJobIfArtifactsReady(supabase, {
        jobId: job.id,
        projectId,
      });
      if (promoted) {
        const { error: packageErr } = await supabase
          .from("content_packages")
          .update({ status: "draft" })
          .eq("id", contentPackageId)
          .eq("project_id", projectId);
        if (packageErr) throw packageErr;
      }
      await reconcileProductionRunForContentItem(projectId, job.contentItemId);
      return Response.json(
        {
          ok: true,
          video_job_id: job.id,
          status: promoted ? "completed" : "artifacts_ready",
          idempotent: true,
        },
        { status: 202 },
      );
    }
    if (claim.status === "terminal") {
      return Response.json(
        {
          ok: true,
          video_job_id: job.id,
          status: claim.jobStatus,
          idempotent: true,
        },
        { status: 202 },
      );
    }
    if (claim.status === "busy") {
      return Response.json(
        {
          ok: true,
          video_job_id: job.id,
          status: claim.jobStatus,
          idempotent: true,
        },
        { status: 202 },
      );
    }
    if (claim.status === "missing") {
      throw new WorkflowError("not_found", `video job ${job.id} not found`);
    }

    // Worker reports back to the existing video callback (absolute URL derived
    // from the incoming request origin).
    const callbackUrl = new URL("/api/n8n/video-callback", request.url).toString();

    try {
      await startVideoWorkerJob({
        video_job_id: job.id,
        project_id: projectId,
        content_package_id: contentPackageId,
        content_item_id: job.contentItemId,
        callback_url: callbackUrl,
        input: (job.input as Record<string, unknown> | null) ?? {},
      });
    } catch (dispatchErr) {
      // Dispatch failed after the claim: release the job back to `queued` so a
      // later retry can re-claim and re-dispatch it (no job stuck processing).
      await supabase
        .from("video_jobs")
        .update({
          status: "queued",
          lease_owner: null,
          lease_expires_at: null,
        })
        .eq("id", job.id)
        .eq("project_id", projectId)
        .eq("status", "processing");
      throw dispatchErr;
    }

    return Response.json(
      { ok: true, video_job_id: job.id, status: "processing" },
      { status: 202 },
    );
  } catch (err) {
    if (err instanceof VideoWorkerConfigError) {
      return Response.json(
        { ok: false, error: "video_worker_not_configured", message: err.message },
        { status: 500 },
      );
    }
    return errorResponse(err);
  }
}

interface ResolvedVideoJob {
  id: string;
  status: string;
  contentItemId: string | null;
  input: unknown;
}

/**
 * Authoritative video requirement: production run plan video platforms when
 * present; otherwise any content_item on a default video platform.
 */
async function packageRequiresVideoJob(
  supabase: SupabaseClient,
  projectId: string,
  contentPackageId: string,
): Promise<boolean> {
  const { data: items, error: itemErr } = await supabase
    .from("content_items")
    .select("id, platform, generation_metadata")
    .eq("package_id", contentPackageId)
    .eq("project_id", projectId);
  if (itemErr) throw itemErr;
  const rows = (items ?? []) as Array<{
    id: string;
    platform: string;
    generation_metadata: Record<string, unknown> | null;
  }>;
  if (rows.length === 0) return false;

  const runId = rows
    .map((r) => r.generation_metadata?.production_run_id)
    .find((id): id is string => typeof id === "string" && id.length > 0);

  if (runId) {
    const { data: run, error: runErr } = await supabase
      .from("production_runs")
      .select("requested_config")
      .eq("id", runId)
      .eq("project_id", projectId)
      .maybeSingle();
    if (runErr) throw runErr;
    const cfg = run?.requested_config;
    if (cfg && typeof cfg === "object" && !Array.isArray(cfg)) {
      const plan = (cfg as Record<string, unknown>).plan;
      if (plan && typeof plan === "object" && !Array.isArray(plan)) {
        const active = (plan as Record<string, unknown>).activeVideoPlatforms;
        if (Array.isArray(active) && active.length > 0) return true;
        const outputs = (plan as Record<string, unknown>).platformOutputs;
        if (
          Array.isArray(outputs) &&
          outputs.some(
            (o) =>
              o &&
              typeof o === "object" &&
              (o as Record<string, unknown>).kind === "video",
          )
        ) {
          return true;
        }
        // Explicit empty video list on a run plan → text-only.
        if (Array.isArray(active) && active.length === 0) return false;
      }
    }
  }

  // Fallback: package has an item on a typical video platform.
  const VIDEO_PLATFORMS = new Set([
    "tiktok",
    "instagram",
    "youtube",
    "facebook",
  ]);
  return rows.some((r) => VIDEO_PLATFORMS.has(r.platform));
}

// Resolves the target video job, scoped by project. video_jobs has no
// content_package_id column, so without an explicit id we resolve the package's
// content items first and then the LATEST job for them (any status). The status
// is returned so the caller can detect a duplicate delivery (already
// processing/completed) and dispatch only a genuinely `queued` job.
async function findVideoJob(
  supabase: SupabaseClient,
  args: { projectId: string; contentPackageId: string; videoJobId?: string },
): Promise<ResolvedVideoJob | null> {
  const { projectId, contentPackageId, videoJobId } = args;

  if (videoJobId) {
    const { data, error } = await supabase
      .from("video_jobs")
      .select("id, status, content_item_id, input")
      .eq("id", videoJobId)
      .eq("project_id", projectId)
      .maybeSingle();
    if (error) throw error;
    return data
      ? {
          id: data.id as string,
          status: data.status as string,
          contentItemId: (data.content_item_id as string | null) ?? null,
          input: data.input,
        }
      : null;
  }

  const { data: items, error: itemErr } = await supabase
    .from("content_items")
    .select("id")
    .eq("package_id", contentPackageId)
    .eq("project_id", projectId);
  if (itemErr) throw itemErr;
  const itemIds = (items ?? []).map((row) => row.id as string);
  if (itemIds.length === 0) return null;

  const { data: jobs, error: jobErr } = await supabase
    .from("video_jobs")
    .select("id, status, content_item_id, input, created_at")
    .eq("project_id", projectId)
    .in("content_item_id", itemIds)
    .order("created_at", { ascending: false })
    .limit(1);
  if (jobErr) throw jobErr;
  const latest = (jobs ?? [])[0];
  return latest
    ? {
        id: latest.id as string,
        status: latest.status as string,
        contentItemId: (latest.content_item_id as string | null) ?? null,
        input: latest.input,
      }
    : null;
}
