import {
  fetchWithRetry,
  HTTP_MAX_ATTEMPTS,
  HTTP_TIMEOUT_MS,
} from "@/lib/http/fetchWithRetry";
import { N8N_SECRET_HEADER } from "@/lib/n8n/callback";

// Outbound n8n client. Single place that knows how to send a workflow-trigger
// webhook to n8n so route handlers never duplicate fetch/auth logic.

// Canonical workflow discriminators sent in the unified envelope.
export const AUTOMATION_WORKFLOWS = {
  generateContentPackage: "generate_content_package",
  regenerateContentPackage: "regenerate_content_package",
  trendScan: "trend_scan",
  weeklyStrategy: "weekly_strategy",
  publishingPlanner: "publishing_planner",
} as const;

export type AutomationWorkflow =
  (typeof AUTOMATION_WORKFLOWS)[keyof typeof AUTOMATION_WORKFLOWS];

// Missing N8N_BASE_URL / N8N_WEBHOOK_SECRET -> mapped to HTTP 500.
export class N8nConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "N8nConfigError";
  }
}

// Network failure or non-2xx response from n8n -> mapped to HTTP 500.
// status is set for a non-2xx HTTP response (undefined for a transport/network
// failure). bodySnippet carries a truncated copy of the n8n response body so
// callers/logs can show the exact reason (e.g. n8n's "webhook not registered").
export class N8nRequestError extends Error {
  readonly status?: number;
  readonly bodySnippet?: string;

  constructor(
    message: string,
    options?: { status?: number; bodySnippet?: string },
  ) {
    super(message);
    this.name = "N8nRequestError";
    this.status = options?.status;
    this.bodySnippet = options?.bodySnippet;
  }
}

// Unified payload every workflow trigger sends to n8n.
export interface N8nWebhookEnvelope {
  workflow: AutomationWorkflow;
  project_id: string;
  requested_at: string;
  payload: Record<string, unknown>;
}

export interface SendN8nWebhookArgs {
  workflow: AutomationWorkflow;
  projectId: string;
  payload?: Record<string, unknown>;
}

// Reduces a URL to origin + pathname (no query / hash) so logging can never
// leak a secret that some setups put in a query string. Our secret travels in
// the x-n8n-secret header, never the URL.
function safeEndpoint(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    return `${url.origin}${url.pathname}`;
  } catch {
    return "(invalid N8N_BASE_URL)";
  }
}

export async function sendN8nWebhook(args: SendN8nWebhookArgs): Promise<void> {
  const baseUrl = process.env.N8N_BASE_URL;
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!baseUrl || !secret) {
    // Logged so the missing-config case is visible in server logs. No secret
    // value is printed (there is none to print).
    console.error(
      `[n8n] workflow=${args.workflow} not configured: missing ${!baseUrl ? "N8N_BASE_URL" : ""}${!baseUrl && !secret ? " + " : ""}${!secret ? "N8N_WEBHOOK_SECRET" : ""}`,
    );
    throw new N8nConfigError("Missing N8N_BASE_URL or N8N_WEBHOOK_SECRET");
  }

  const endpoint = safeEndpoint(baseUrl);
  const envelope: N8nWebhookEnvelope = {
    workflow: args.workflow,
    project_id: args.projectId,
    requested_at: new Date().toISOString(),
    payload: args.payload ?? {},
  };

  let response: Response;
  try {
    response = await fetchWithRetry(
      baseUrl,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [N8N_SECRET_HEADER]: secret,
        },
        body: JSON.stringify(envelope),
      },
      {
        timeoutMs: HTTP_TIMEOUT_MS.worker,
        maxAttempts: HTTP_MAX_ATTEMPTS.worker,
        label: "n8n:webhook",
      },
    );
  } catch (err) {
    const detail = err instanceof Error ? err.message : "network error";
    // Transport-level failure (timeout / DNS / connection). No HTTP status.
    console.error(
      `[n8n] workflow=${args.workflow} endpoint=${endpoint} transport_error: ${detail}`,
    );
    throw new N8nRequestError(`n8n webhook request failed: ${detail}`);
  }

  if (!response.ok) {
    // Capture a truncated body so the exact n8n reason (e.g. "webhook not
    // registered" / auth message) is visible without leaking secrets — the
    // response body never contains our outbound secret.
    let bodySnippet = "";
    try {
      bodySnippet = (await response.text()).slice(0, 500);
    } catch {
      bodySnippet = "(no body)";
    }
    console.error(
      `[n8n] workflow=${args.workflow} endpoint=${endpoint} status=${response.status} body=${bodySnippet}`,
    );
    throw new N8nRequestError(
      `n8n webhook returned status ${response.status}`,
      { status: response.status, bodySnippet },
    );
  }

  // Success path — concise, secret-free confirmation for observability.
  console.info(
    `[n8n] workflow=${args.workflow} endpoint=${endpoint} status=${response.status} accepted`,
  );
}
