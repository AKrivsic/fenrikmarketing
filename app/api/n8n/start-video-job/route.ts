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
      throw new WorkflowError(
        "not_found",
        "no queued video job found for the content package",
      );
    }

    // Worker reports back to the existing video callback (absolute URL derived
    // from the incoming request origin).
    const callbackUrl = new URL("/api/n8n/video-callback", request.url).toString();

    // Send to the worker first; only mark the job processing if it was accepted
    // (so a config/worker failure leaves the job queued for a retry).
    await startVideoWorkerJob({
      video_job_id: job.id,
      project_id: projectId,
      content_package_id: contentPackageId,
      content_item_id: job.contentItemId,
      callback_url: callbackUrl,
      input: (job.input as Record<string, unknown> | null) ?? {},
    });

    // job_status enum has no "running"; the in-flight value is "processing".
    const { error: updErr } = await supabase
      .from("video_jobs")
      .update({ status: "processing" })
      .eq("id", job.id)
      .eq("project_id", projectId);
    if (updErr) throw updErr;

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
  contentItemId: string | null;
  input: unknown;
}

// Resolves the target video job, scoped by project. video_jobs has no
// content_package_id column, so without an explicit id we resolve the package's
// content items first and then the latest queued job for them.
async function findVideoJob(
  supabase: SupabaseClient,
  args: { projectId: string; contentPackageId: string; videoJobId?: string },
): Promise<ResolvedVideoJob | null> {
  const { projectId, contentPackageId, videoJobId } = args;

  if (videoJobId) {
    const { data, error } = await supabase
      .from("video_jobs")
      .select("id, content_item_id, input")
      .eq("id", videoJobId)
      .eq("project_id", projectId)
      .maybeSingle();
    if (error) throw error;
    return data
      ? {
          id: data.id as string,
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
    .select("id, content_item_id, input, created_at")
    .eq("project_id", projectId)
    .in("content_item_id", itemIds)
    .eq("status", "queued")
    .order("created_at", { ascending: false })
    .limit(1);
  if (jobErr) throw jobErr;
  const latest = (jobs ?? [])[0];
  return latest
    ? {
        id: latest.id as string,
        contentItemId: (latest.content_item_id as string | null) ?? null,
        input: latest.input,
      }
    : null;
}
