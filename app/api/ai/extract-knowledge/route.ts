import { runProjectKnowledgeExtraction } from "@/lib/ai/workflows/extractKnowledge";
import { errorResponse, readJsonBody, requireString } from "@/lib/ai/apiResponse";

// Task 1 — fetches the source URL then runs one AI extraction; can take tens of
// seconds. Request a generous function budget.
export const maxDuration = 120;

// Re-runs Knowledge Model V2 extraction for an existing project using the URL
// stored in projects.knowledge.source_url, persisting a fresh "proposed" block.
// Mirrors the thin-wrapper pattern of /api/ai/generate-language-variants.
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody(request);
    const projectId = requireString(body, "project_id");

    const summary = await runProjectKnowledgeExtraction(projectId);

    return Response.json({ ok: true, data: summary });
  } catch (err) {
    return errorResponse(err);
  }
}
