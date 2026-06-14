import { after } from "next/server";
import { unauthorizedResponse, verifyN8nSecret } from "@/lib/n8n/callback";
import {
  drainTranslationJobs,
  triggerTranslationProcessor,
} from "@/lib/ai/workflows/translationJobs";

// Background worker for the asynchronous "Generate translations" flow. Each call
// DRAINS as many translation units as fit in a wall-clock budget that stays well
// under the 300s function limit (one unit is ~10-15s, so a typical package
// finishes in a single invocation). The heavy Claude localization runs in
// `after()` (after the 202 response is sent). Only when units remain after the
// budget is hit does the endpoint re-trigger itself for the rest — and that kick
// is retried — so the queue can no longer be silently stranded by one dropped
// self-trigger. The chain stops automatically once no `pending` unit remains.
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
      const result = await drainTranslationJobs({ videoCallbackUrl });
      // Only hop to a fresh invocation when the budget/cap left work behind.
      // A drained queue (remaining === 0) stops the chain.
      let processorRetriggered = false;
      if (result.remaining > 0) {
        processorRetriggered = await triggerTranslationProcessor(origin);
      }
      console.log(
        `[process-translation-jobs] ${JSON.stringify({
          jobs_claimed: result.claimed,
          jobs_completed: result.completed,
          jobs_failed: result.failed,
          jobs_remaining: result.remaining,
          processor_retriggered: processorRetriggered,
          processor_idle: result.claimed === 0,
        })}`,
      );
    } catch (err) {
      const detail = err instanceof Error ? err.message : "unknown error";
      console.error(`[process-translation-jobs] processing failed: ${detail}`);
    }
  });

  return Response.json({ ok: true, accepted: true }, { status: 202 });
}
