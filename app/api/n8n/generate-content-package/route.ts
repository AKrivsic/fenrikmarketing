import { runGenerateContentPackage } from "@/lib/ai/workflows/generateContentPackage";
import { optionalGenerationModeFromBody } from "@/lib/ai/generationMode";
import {
  assertGenerateContentPackagePreconditions,
  isProductionRunCancelledForStrategyItem,
  MissingWeeklyStrategyError,
  missingWeeklyStrategyResponse,
} from "@/lib/ai/workflows/weeklyStrategyGate";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { unauthorizedResponse, verifyN8nSecret } from "@/lib/n8n/callback";
import {
  errorResponse,
  optionalString,
  readJsonBody,
  requireString,
  workflowResponse,
} from "@/lib/ai/apiResponse";

// Task 1 — content package generation runs ~160s of AI inline. Request the
// platform's max function budget so a properly-provisioned Vercel deployment
// (Pro/fluid) does not cut it at the lower default. See the sprint report for
// the off-Vercel (worker) migration decision for runs beyond this ceiling.
export const maxDuration = 300;

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
    const projectId = requireString(body, "project_id");
    const strategyItemId = requireString(body, "strategy_item_id");
    const weekStart = optionalString(body, "week_start");

    await assertGenerateContentPackagePreconditions(supabase, {
      projectId,
      strategyItemId,
      weekStart,
    });

    if (
      await isProductionRunCancelledForStrategyItem(
        supabase,
        projectId,
        strategyItemId,
      )
    ) {
      return Response.json({
        success: true,
        skipped: true,
        reason: "production_run_cancelled",
      });
    }

    const result = await runGenerateContentPackage(
      {
        projectId,
        strategyItemId,
        generationMode: optionalGenerationModeFromBody(body),
      },
      supabase,
    );
    return workflowResponse(result);
  } catch (err) {
    if (err instanceof MissingWeeklyStrategyError) {
      return missingWeeklyStrategyResponse();
    }
    return errorResponse(err);
  }
}
