import { runGenerateLanguageVariants } from "@/lib/ai/workflows/generateLanguageVariants";
import { errorResponse, readJsonBody, requireString } from "@/lib/ai/apiResponse";

// Package-level entry: delegates each approved video-platform primary to the
// item-level workflow (one small AI call per platform per language). Request
// the max function budget for safety; typical runs finish well under 300s.
export const maxDuration = 300;

// Internal endpoint that generates language variants for an APPROVED primary
// content package. No UI button yet — callable from a future Review Queue
// action. The video callback URL is derived from the request origin, mirroring
// /api/n8n/start-video-job, so the worker reports back to the existing
// /api/n8n/video-callback handler.
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody(request);
    const projectId = requireString(body, "project_id");
    const packageId = requireString(body, "package_id");

    const videoCallbackUrl = new URL(
      "/api/n8n/video-callback",
      request.url,
    ).toString();

    const summary = await runGenerateLanguageVariants(
      { projectId, packageId },
      { videoCallbackUrl },
    );

    return Response.json({ ok: true, data: summary });
  } catch (err) {
    return errorResponse(err);
  }
}
