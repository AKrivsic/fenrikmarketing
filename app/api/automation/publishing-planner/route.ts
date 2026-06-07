import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadProjectOrThrow, WorkflowError } from "@/lib/ai/workflows/shared";
import { errorResponse, readJsonBody, requireString } from "@/lib/ai/apiResponse";
import { AUTOMATION_WORKFLOWS, sendN8nWebhook } from "@/lib/n8n/client";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody(request);
    const projectId = requireString(body, "project_id");
    const weekStart = requireString(body, "week_start");
    if (!ISO_DATE.test(weekStart)) {
      throw new WorkflowError("invalid_input", "week_start must be YYYY-MM-DD");
    }

    const supabase = await createSupabaseServerClient();
    await loadProjectOrThrow(supabase, projectId);

    await sendN8nWebhook({
      workflow: AUTOMATION_WORKFLOWS.publishingPlanner,
      projectId,
      payload: { week_start: weekStart },
    });

    return Response.json(
      {
        ok: true,
        workflow: AUTOMATION_WORKFLOWS.publishingPlanner,
        status: "queued",
      },
      { status: 202 },
    );
  } catch (err) {
    return errorResponse(err);
  }
}
