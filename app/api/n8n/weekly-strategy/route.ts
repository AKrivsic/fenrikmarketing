import { runWeeklyStrategy } from "@/lib/ai/workflows/weeklyStrategy";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { unauthorizedResponse, verifyN8nSecret } from "@/lib/n8n/callback";
import { WorkflowError } from "@/lib/ai/workflows/shared";
import {
  errorResponse,
  readJsonBody,
  requireString,
  workflowResponse,
} from "@/lib/ai/apiResponse";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// n8n-invoked execution endpoint for the Weekly Strategy workflow.
//
// Bridge that lets the sessionless n8n workflow run the EXISTING strategy
// business logic: authenticates with the n8n secret, uses the service-role
// admin client (no user session / RLS), and delegates to runWeeklyStrategy.
// AI prompts, provider routing, trend scoring and persistence
// (content_strategies + content_strategy_items) are all reused — nothing here
// is duplicated. Multi-project: project_id comes from the payload, no hardcoding.
//
// Flow: /api/automation/weekly-strategy -> n8n -> POST here
//   -> AI strategy + persist (content_strategies + content_strategy_items)
//   -> n8n confirms via POST /api/n8n/weekly-strategy-callback.
export async function POST(request: Request): Promise<Response> {
  if (!verifyN8nSecret(request)) {
    return unauthorizedResponse();
  }

  try {
    const body = await readJsonBody(request);
    const projectId = requireString(body, "project_id");
    const weekStart = requireString(body, "week_start");
    if (!ISO_DATE.test(weekStart)) {
      throw new WorkflowError("invalid_input", "week_start must be YYYY-MM-DD");
    }

    const supabase = createSupabaseAdminClient();
    const result = await runWeeklyStrategy(
      {
        projectId,
        weekStart,
        // The workflow requires a week_end; derive the 7-day window end from the
        // provided week_start (input mapping, not business logic).
        weekEnd: deriveWeekEnd(weekStart),
      },
      supabase,
    );
    return workflowResponse(result);
  } catch (err) {
    return errorResponse(err);
  }
}

// week_start + 6 days, in UTC, as YYYY-MM-DD.
function deriveWeekEnd(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) {
    throw new WorkflowError("invalid_input", "week_start is not a valid date");
  }
  start.setUTCDate(start.getUTCDate() + 6);
  return start.toISOString().slice(0, 10);
}
