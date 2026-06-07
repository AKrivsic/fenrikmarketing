import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadProjectOrThrow, WorkflowError } from "@/lib/ai/workflows/shared";
import {
  errorResponse,
  optionalString,
  readJsonBody,
  requireString,
} from "@/lib/ai/apiResponse";
import { AUTOMATION_WORKFLOWS, sendN8nWebhook } from "@/lib/n8n/client";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody(request);
    const projectId = requireString(body, "project_id");
    const contentPackageId = requireString(body, "content_package_id");
    const reason = optionalString(body, "reason");

    const supabase = await createSupabaseServerClient();
    await loadProjectOrThrow(supabase, projectId);

    // Package must belong to the project (404 if missing).
    const { data: pkg, error } = await supabase
      .from("content_packages")
      .select("id")
      .eq("id", contentPackageId)
      .eq("project_id", projectId)
      .maybeSingle();
    if (error) throw error;
    if (!pkg) {
      throw new WorkflowError(
        "not_found",
        `content package ${contentPackageId} not found`,
      );
    }

    // No status change: package_status enum has no "regenerate_requested" value,
    // so the existing DB model does not allow flagging the request here.

    await sendN8nWebhook({
      workflow: AUTOMATION_WORKFLOWS.regenerateContentPackage,
      projectId,
      payload: {
        content_package_id: contentPackageId,
        ...(reason ? { reason } : {}),
      },
    });

    return Response.json(
      {
        ok: true,
        workflow: AUTOMATION_WORKFLOWS.regenerateContentPackage,
        status: "queued",
      },
      { status: 202 },
    );
  } catch (err) {
    return errorResponse(err);
  }
}
