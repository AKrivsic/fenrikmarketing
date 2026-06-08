import { runRegenerateContentPackage } from "@/lib/ai/workflows/regenerateContentPackage";
import {
  errorResponse,
  optionalString,
  readJsonBody,
  requireString,
  workflowResponse,
} from "@/lib/ai/apiResponse";

// Task 1 — regeneration runs ~60s of AI inline; request the max function budget.
export const maxDuration = 300;

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody(request);
    const result = await runRegenerateContentPackage({
      projectId: requireString(body, "project_id"),
      packageId: requireString(body, "package_id"),
      feedback: optionalString(body, "feedback") ?? null,
    });
    return workflowResponse(result);
  } catch (err) {
    return errorResponse(err);
  }
}
