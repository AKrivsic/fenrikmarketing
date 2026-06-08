import { runGenerateContentPackage } from "@/lib/ai/workflows/generateContentPackage";
import {
  errorResponse,
  readJsonBody,
  requireString,
  workflowResponse,
} from "@/lib/ai/apiResponse";

// Task 1 — content package generation runs ~160s of AI inline; request the
// platform's max function budget (see sprint report for the worker-offload
// decision for runs beyond this ceiling).
export const maxDuration = 300;

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
