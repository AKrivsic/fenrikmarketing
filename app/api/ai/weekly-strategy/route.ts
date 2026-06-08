import { runWeeklyStrategy } from "@/lib/ai/workflows/weeklyStrategy";
import {
  errorResponse,
  readJsonBody,
  requireString,
  workflowResponse,
} from "@/lib/ai/apiResponse";

// Task 1 — weekly strategy runs ~90s of AI inline; request the max function budget.
export const maxDuration = 300;

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody(request);
    const result = await runWeeklyStrategy({
      projectId: requireString(body, "project_id"),
      weekStart: requireString(body, "week_start"),
      weekEnd: requireString(body, "week_end"),
    });
    return workflowResponse(result);
  } catch (err) {
    return errorResponse(err);
  }
}
