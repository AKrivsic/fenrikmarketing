import { runScoreTrend } from "@/lib/ai/workflows/scoreTrend";
import {
  errorResponse,
  readJsonBody,
  requireString,
  workflowResponse,
} from "@/lib/ai/apiResponse";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody(request);
    const result = await runScoreTrend({
      projectId: requireString(body, "project_id"),
      trendId: requireString(body, "trend_id"),
    });
    return workflowResponse(result);
  } catch (err) {
    return errorResponse(err);
  }
}
