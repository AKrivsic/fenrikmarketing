import { runGenerateContentPackage } from "@/lib/ai/workflows/generateContentPackage";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { unauthorizedResponse, verifyN8nSecret } from "@/lib/n8n/callback";
import {
  errorResponse,
  readJsonBody,
  requireString,
  workflowResponse,
} from "@/lib/ai/apiResponse";

// n8n-invoked execution endpoint for the Generate Content Package workflow.
//
// This is the bridge that lets the sessionless n8n workflow run the EXISTING
// generation business logic: it authenticates with the n8n secret, uses the
// service-role admin client (no user session / RLS), and simply delegates to
// runGenerateContentPackage. No business logic is duplicated here.
//
// Flow: /api/automation/generate-content-package -> n8n (selects strategy item)
//   -> POST here -> AI generation + persist (content_packages = draft, ...)
//   -> n8n confirms via POST /api/n8n/content-package-callback.
export async function POST(request: Request): Promise<Response> {
  if (!verifyN8nSecret(request)) {
    return unauthorizedResponse();
  }

  try {
    const body = await readJsonBody(request);
    const supabase = createSupabaseAdminClient();
    const result = await runGenerateContentPackage(
      {
        projectId: requireString(body, "project_id"),
        strategyItemId: requireString(body, "strategy_item_id"),
      },
      supabase,
    );
    return workflowResponse(result);
  } catch (err) {
    return errorResponse(err);
  }
}
