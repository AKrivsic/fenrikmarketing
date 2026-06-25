import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadProjectOrThrow, WorkflowError } from "@/lib/ai/workflows/shared";
import {
  errorResponse,
  optionalString,
  readJsonBody,
  requireString,
} from "@/lib/ai/apiResponse";
import { AUTOMATION_WORKFLOWS, sendN8nWebhook } from "@/lib/n8n/client";
import { optionalGenerationModeFromBody } from "@/lib/ai/generationMode";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody(request);
    const projectId = requireString(body, "project_id");

    const supabase = await createSupabaseServerClient();
    await loadProjectOrThrow(supabase, projectId);

    const payload: Record<string, unknown> = {};
    const packageCount = body["package_count"];
    if (packageCount !== undefined) {
      if (
        typeof packageCount !== "number" ||
        !Number.isFinite(packageCount) ||
        packageCount < 1
      ) {
        throw new WorkflowError(
          "invalid_input",
          "package_count must be a positive number",
        );
      }
      payload.package_count = Math.round(packageCount);
    }
    const funnelStage = optionalString(body, "funnel_stage");
    if (funnelStage) payload.funnel_stage = funnelStage;

    const generationMode = optionalGenerationModeFromBody(body);
    if (generationMode !== undefined) {
      payload.generation_mode = generationMode;
    }

    await sendN8nWebhook({
      workflow: AUTOMATION_WORKFLOWS.generateContentPackage,
      projectId,
      payload,
    });

    return Response.json(
      {
        ok: true,
        workflow: AUTOMATION_WORKFLOWS.generateContentPackage,
        status: "queued",
      },
      { status: 202 },
    );
  } catch (err) {
    return errorResponse(err);
  }
}
