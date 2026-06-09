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
  startVideoWorkerJob,
  VideoWorkerConfigError,
} from "@/lib/video-worker/client";

// Stuck-processing recovery threshold (Task 4). A `processing` video_jobs row
// that has not advanced for longer than this is considered stuck (the worker
// died or timed out) and may be re-dispatched. Kept well above the worker's
// own FFmpeg timeout (10 min) so a job that is merely slow is never re-rendered.
const STALE_PROCESSING_MINUTES = (() => {
  const raw = Number(process.env.VIDEO_JOB_STALE_MINUTES);
  return Number.isFinite(raw) && raw > 0 ? raw : 30;
})();

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
      // No video job for an existing package now means a TEXT-ONLY package
      // (no selected platform requires video, so generation skipped the video
      // job). This is a benign no-op, not an error: nothing to render. Returning
      // 2xx prevents n8n from retrying a render that will never exist.
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

    // Idempotence guard (C1). A duplicate render is pure wasted worker cost
    // (TTS + image generation + FFmpeg), so it must never happen.
    //
    // Terminal jobs are never re-dispatched: a `completed` render must survive,
    // and a `failed` job is closed out (re-running it is an explicit new
    // generation, not a dispatch retry).
    if (job.status === "completed" || job.status === "failed") {
      return Response.json(
        {
          ok: true,
          video_job_id: job.id,
          status: job.status,
          idempotent: true,
        },
        { status: 202 },
      );
    }

    // Build the atomic claim (-> processing). A `queued` job claims normally.
    // A `processing` job is re-claimable ONLY when stuck (Task 4): its
    // updated_at (bumped on every status change, migration 014) is older than
    // the stale threshold, meaning the worker never reported back. A freshly
    // `processing` job is a duplicate delivery while the worker still runs and
    // is a safe no-op.
    let claimQuery = supabase
      .from("video_jobs")
      .update({ status: "processing" })
      .eq("id", job.id)
      .eq("project_id", projectId);

    if (job.status === "queued") {
      claimQuery = claimQuery.eq("status", "queued");
    } else {
      const staleBefore = new Date(
        Date.now() - STALE_PROCESSING_MINUTES * 60_000,
      ).toISOString();
      const isStale = !!job.updatedAt && job.updatedAt < staleBefore;
      if (!isStale) {
        return Response.json(
          {
            ok: true,
            video_job_id: job.id,
            status: "processing",
            idempotent: true,
          },
          { status: 202 },
        );
      }
      // Re-claim a still-stale processing row. The set_updated_at trigger bumps
      // updated_at = now() on this UPDATE, so a concurrent recovery attempt no
      // longer matches the < staleBefore guard -> only one re-dispatch wins.
      claimQuery = claimQuery.eq("status", "processing").lt("updated_at", staleBefore);
    }

    const { data: claimed, error: claimErr } = await claimQuery.select("id");
    if (claimErr) throw claimErr;
    if (!claimed || claimed.length === 0) {
      // Lost the race: another delivery / recovery already claimed it.
      return Response.json(
        {
          ok: true,
          video_job_id: job.id,
          status: "processing",
          idempotent: true,
        },
        { status: 202 },
      );
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
        .update({ status: "queued" })
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
  // ISO timestamp of the last status change (migration 014). Used to detect a
  // stuck `processing` job for recovery.
  updatedAt: string | null;
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
      .select("id, status, content_item_id, input, updated_at")
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
          updatedAt: (data.updated_at as string | null) ?? null,
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
    .select("id, status, content_item_id, input, created_at, updated_at")
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
        updatedAt: (latest.updated_at as string | null) ?? null,
      }
    : null;
}
