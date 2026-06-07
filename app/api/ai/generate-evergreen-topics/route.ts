import { runGenerateEvergreenTopics } from "@/lib/ai/workflows/evergreenTopics";
import {
  errorResponse,
  optionalString,
  readJsonBody,
  requireString,
  workflowResponse,
} from "@/lib/ai/apiResponse";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody(request);
    const countRaw = body["count"];
    const result = await runGenerateEvergreenTopics({
      projectId: requireString(body, "project_id"),
      count: typeof countRaw === "number" ? countRaw : undefined,
      pillar: optionalString(body, "pillar") ?? null,
    });
    return workflowResponse(result);
  } catch (err) {
    return errorResponse(err);
  }
}
