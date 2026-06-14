import { after } from "next/server";
import { unauthorizedResponse, verifyN8nSecret } from "@/lib/n8n/callback";
import {
  processNextTranslationJob,
  triggerTranslationProcessor,
} from "@/lib/ai/workflows/translationJobs";

// Background worker for the asynchronous "Generate translations" flow. Each call
// processes EXACTLY ONE translation unit (one source item × one language) so a
// single invocation stays small and never approaches the 300s function limit.
// The heavy Claude localization runs in `after()` (after the 202 response is
// sent), then the endpoint re-triggers itself for the next pending unit. The
// chain stops automatically once no `pending` unit remains.
export const maxDuration = 300;

// Guarded by the same shared secret as the n8n callbacks (x-n8n-secret). The
// server action and the self-re-trigger both send it; no public/unauthenticated
// caller can drive the worker.
export async function POST(request: Request): Promise<Response> {
  if (!verifyN8nSecret(request)) {
    return unauthorizedResponse();
  }

  // Worker reports rendered videos to the existing callback; both URLs are
  // derived from the request origin (mirrors /api/n8n/start-video-job).
  const videoCallbackUrl = new URL(
    "/api/n8n/video-callback",
    request.url,
  ).toString();
  const origin = new URL(request.url).origin;

  // Do the actual work AFTER the response is sent. This keeps the request fast
  // (so the caller's trigger fetch returns immediately) while the localization
  // continues within this invocation's max duration.
  after(async () => {
    try {
      const result = await processNextTranslationJob({ videoCallbackUrl });
      if (result.processed && result.hasMore) {
        // Hand the next pending unit to a fresh invocation so no single one
        // accumulates time.
        await triggerTranslationProcessor(origin);
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : "unknown error";
      console.error(`[process-translation-jobs] processing failed: ${detail}`);
    }
  });

  return Response.json({ ok: true, accepted: true }, { status: 202 });
}
