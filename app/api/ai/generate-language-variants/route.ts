import { after } from "next/server";
import {
  enqueuePackageTranslations,
  triggerTranslationProcessor,
} from "@/lib/ai/workflows/translationJobs";
import { errorResponse, readJsonBody, requireString } from "@/lib/ai/apiResponse";

// Package-level entry: ASYNC. Enqueues one pending translation unit per
// (approved video primary, missing target language) and kicks the background
// processor, then returns immediately. The Claude localization + variant video
// dispatch run in /api/ai/process-translation-jobs (one unit at a time), so this
// request finishes in milliseconds and never approaches the 300s limit.
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody(request);
    const projectId = requireString(body, "project_id");
    const packageId = requireString(body, "package_id");

    const result = await enqueuePackageTranslations({ projectId, packageId });

    const origin = new URL(request.url).origin;
    after(() => triggerTranslationProcessor(origin));

    return Response.json({ ok: true, data: result }, { status: 202 });
  } catch (err) {
    return errorResponse(err);
  }
}
