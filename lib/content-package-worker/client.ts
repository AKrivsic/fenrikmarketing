import { fetchWithRetry } from "@/lib/http/fetchWithRetry";
import { N8N_SECRET_HEADER } from "@/lib/n8n/callback";

// Outbound Content Package Worker client. Pure transport: forwards the same
// n8n generate-content-package request to DigitalOcean so Creative Engine /
// Presentation run off Vercel. Auth stays x-n8n-secret / N8N_CALLBACK_SECRET
// (same as handleGenerateContentPackageRequest).

/** Long enough for Creative Engine + Presentation; do not stack AI transport retries under this. */
export const CONTENT_PACKAGE_WORKER_TIMEOUT_MS = 900_000;

export class ContentPackageWorkerConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentPackageWorkerConfigError";
  }
}

export class ContentPackageWorkerRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentPackageWorkerRequestError";
  }
}

/**
 * When set, Vercel `/api/n8n/generate-content-package` proxies here instead of
 * running generation inline. Prefer a public HTTPS URL (Caddy → worker), not
 * the Docker hostname `content-package-worker` (unreachable from Vercel).
 */
export function getContentPackageWorkerUrl(): string | null {
  const url = process.env.CONTENT_PACKAGE_WORKER_URL?.trim();
  return url && url.length > 0 ? url : null;
}

/**
 * Forward the inbound n8n Request to the Content Package Worker and return its
 * Response unchanged (status + body). Caller must already have decided to proxy.
 */
export async function forwardGenerateContentPackageToWorker(
  request: Request,
  workerUrl: string = getContentPackageWorkerUrl() ?? "",
): Promise<Response> {
  if (!workerUrl) {
    throw new ContentPackageWorkerConfigError(
      "Missing CONTENT_PACKAGE_WORKER_URL",
    );
  }

  const configuredSecret = process.env.N8N_CALLBACK_SECRET;
  if (!configuredSecret) {
    throw new ContentPackageWorkerConfigError("Missing N8N_CALLBACK_SECRET");
  }

  const incomingSecret = request.headers.get(N8N_SECRET_HEADER);
  const secret =
    typeof incomingSecret === "string" && incomingSecret.length > 0
      ? incomingSecret
      : configuredSecret;

  const body = await request.arrayBuffer();
  const bodyInit =
    body.byteLength > 0 ? new Uint8Array(body) : undefined;

  let response: Response;
  try {
    response = await fetchWithRetry(
      workerUrl,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [N8N_SECRET_HEADER]: secret,
        },
        body: bodyInit,
      },
      {
        timeoutMs: CONTENT_PACKAGE_WORKER_TIMEOUT_MS,
        maxAttempts: 1,
        label: "content-package-worker:generate",
      },
    );
  } catch (err) {
    const detail = err instanceof Error ? err.message : "network error";
    throw new ContentPackageWorkerRequestError(
      `content package worker request failed: ${detail}`,
    );
  }

  // Preserve worker status/body for n8n (ok/data, 422 validation, 401, skip).
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
