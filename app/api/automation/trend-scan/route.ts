import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadProjectOrThrow } from "@/lib/ai/workflows/shared";
import { errorResponse, readJsonBody, requireString } from "@/lib/ai/apiResponse";
import { AUTOMATION_WORKFLOWS, sendN8nWebhook } from "@/lib/n8n/client";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody(request);
    const projectId = requireString(body, "project_id");

    const supabase = await createSupabaseServerClient();
    await loadProjectOrThrow(supabase, projectId);

    await sendN8nWebhook({
      workflow: AUTOMATION_WORKFLOWS.trendScan,
      projectId,
    });

    return Response.json(
      { ok: true, workflow: AUTOMATION_WORKFLOWS.trendScan, status: "queued" },
      { status: 202 },
    );
  } catch (err) {
    return errorResponse(err);
  }
}
