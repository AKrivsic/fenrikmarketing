import { runRegenerateContentPackage } from "@/lib/ai/workflows/regenerateContentPackage";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { unauthorizedResponse, verifyN8nSecret } from "@/lib/n8n/callback";
import {
  errorResponse,
  optionalString,
  readJsonBody,
  requireString,
  workflowResponse,
} from "@/lib/ai/apiResponse";

// n8n-invoked execution endpoint for the Regenerate Content Package workflow.
//
// Bridge that lets the sessionless n8n workflow run the EXISTING regenerate
// business logic: it authenticates with the n8n secret, uses the service-role
// admin client (no user session / RLS), and delegates to
// runRegenerateContentPackage. Prompts, guardrails, provider routing, version
// snapshots (content_versions) and persistence are all reused — nothing here is
// duplicated.
//
// Flow: /api/automation/regenerate-content-package -> n8n -> POST here
//   -> snapshot to content_versions + AI regenerate + update package (draft)
//      + new video_jobs (queued, NOT started here)
//   -> n8n confirms via POST /api/n8n/content-package-callback (same package id).
export async function POST(request: Request): Promise<Response> {
  if (!verifyN8nSecret(request)) {
    return unauthorizedResponse();
  }

  try {
    const body = await readJsonBody(request);
    const supabase = createSupabaseAdminClient();
    const result = await runRegenerateContentPackage(
      {
        projectId: requireString(body, "project_id"),
        packageId: requireString(body, "content_package_id"),
        feedback: optionalString(body, "reason") ?? null,
      },
      supabase,
    );
    return workflowResponse(result);
  } catch (err) {
    return errorResponse(err);
  }
}
