import { handleGenerateContentPackageRequest } from "@/lib/n8n/handleGenerateContentPackageRequest";
import {
  ContentPackageWorkerConfigError,
  ContentPackageWorkerRequestError,
  forwardGenerateContentPackageToWorker,
  getContentPackageWorkerUrl,
} from "@/lib/content-package-worker/client";
import { errorResponse } from "@/lib/ai/apiResponse";

// Task 1 — content package generation runs ~160s of AI inline when the worker
// URL is unset. When CONTENT_PACKAGE_WORKER_URL is set, this route only
// proxies to DigitalOcean (generation itself is not bound by Vercel compute
// once n8n calls the worker directly; the proxy path still needs a long
// function budget for passthrough).
export const maxDuration = 300;

// n8n-invoked execution endpoint for the Generate Content Package workflow.
// Thin Vercel adapter: prefer CONTENT_PACKAGE_WORKER_URL → worker; otherwise
// run the shared handler inline (rollback / local).
export async function POST(request: Request): Promise<Response> {
  const workerUrl = getContentPackageWorkerUrl();
  if (workerUrl) {
    try {
      return await forwardGenerateContentPackageToWorker(request, workerUrl);
    } catch (err) {
      if (
        err instanceof ContentPackageWorkerConfigError ||
        err instanceof ContentPackageWorkerRequestError
      ) {
        return errorResponse(err);
      }
      return errorResponse(err);
    }
  }

  return handleGenerateContentPackageRequest(request);
}
