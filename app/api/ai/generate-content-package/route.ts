import { runGenerateContentPackage } from "@/lib/ai/workflows/generateContentPackage";
import {
  errorResponse,
  readJsonBody,
  requireString,
  workflowResponse,
} from "@/lib/ai/apiResponse";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody(request);
    const result = await runGenerateContentPackage({
      projectId: requireString(body, "project_id"),
      // strategy_item_id is mandatory -> a package can never be created
      // without a weekly strategy context.
      strategyItemId: requireString(body, "strategy_item_id"),
    });
    return workflowResponse(result);
  } catch (err) {
    return errorResponse(err);
  }
}
