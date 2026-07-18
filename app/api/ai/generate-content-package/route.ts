import { runGenerateContentPackage } from "@/lib/ai/workflows/generateContentPackage";
import { optionalGenerationModeFromBody } from "@/lib/ai/generationMode";
import {
  errorResponse,
  readJsonBody,
  requireString,
  workflowResponse,
} from "@/lib/ai/apiResponse";
import { markProductionRunItemGenerationFailed } from "@/lib/api/production-run-admin";

// Task 1 — content package generation runs ~160s of AI inline; request the
// platform's max function budget (see sprint report for the worker-offload
// decision for runs beyond this ceiling).
export const maxDuration = 300;

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody(request);
    const projectId = requireString(body, "project_id");
    const strategyItemId = requireString(body, "strategy_item_id");
    const result = await runGenerateContentPackage({
      projectId,
      // strategy_item_id is mandatory -> a package can never be created
      // without a weekly strategy context.
      strategyItemId,
      generationMode: optionalGenerationModeFromBody(body),
    });
    if (!result.ok) {
      try {
        await markProductionRunItemGenerationFailed({
          projectId,
          strategyItemId,
          diagnostics: {
            error: result.error,
            validation_errors: result.validationErrors,
            attempts: result.attempts,
          },
        });
      } catch (markErr) {
        console.error(
          "[ai/generate-content-package] failed to mark production run item",
          markErr,
        );
      }
    }
    return workflowResponse(result);
  } catch (err) {
    return errorResponse(err);
  }
}
