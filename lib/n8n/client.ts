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

// n8n publishes one production webhook per workflow. The path segment after
// /webhook/ for each workflow discriminator.
export const WORKFLOW_WEBHOOK_PATHS: Record<AutomationWorkflow, string> = {
  trend_scan: "trend-scan",
  weekly_strategy: "weekly-strategy",
  generate_content_package: "generate-content-package",
  regenerate_content_package: "regenerate-content-package",
  publishing_planner: "publishing-planner",
};

// Optional per-workflow full URL overrides. When set, they win over anything
// derived from N8N_BASE_URL (lets ops point a single workflow elsewhere).
export const WORKFLOW_ENV_VARS: Record<AutomationWorkflow, string> = {
  trend_scan: "N8N_TREND_SCAN_URL",
  weekly_strategy: "N8N_WEEKLY_STRATEGY_URL",
  generate_content_package: "N8N_GENERATE_CONTENT_PACKAGE_URL",
  regenerate_content_package: "N8N_REGENERATE_CONTENT_PACKAGE_URL",
  publishing_planner: "N8N_PUBLISHING_PLANNER_URL",
};

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
    return "(invalid url)";
  }
}

// Resolves the per-workflow n8n webhook URL.
//
// Priority:
//   1. Per-workflow override env var (e.g. N8N_GENERATE_CONTENT_PACKAGE_URL).
//   2. Derived from N8N_BASE_URL's ORIGIN + "/webhook/<path>".
//
// N8N_BASE_URL historically points at a single (non-existent) router path such
// as "https://n8n.fenrik.chat/webhook/ai-content-manager". We deliberately use
// only its origin ("https://n8n.fenrik.chat") and append the real published
// path, so we never POST to /webhook/ai-content-manager.
export function resolveWebhookUrl(workflow: AutomationWorkflow): string {
  const override = process.env[WORKFLOW_ENV_VARS[workflow]]?.trim();
  if (override) return override;

  const baseUrl = process.env.N8N_BASE_URL?.trim();
  if (!baseUrl) {
    throw new N8nConfigError(
      `Missing ${WORKFLOW_ENV_VARS[workflow]} and N8N_BASE_URL`,
    );
  }

  let origin: string;
  try {
    origin = new URL(baseUrl).origin;
  } catch {
    throw new N8nConfigError(`Invalid N8N_BASE_URL: ${baseUrl}`);
  }

  return `${origin}/webhook/${WORKFLOW_WEBHOOK_PATHS[workflow]}`;
}

export async function sendN8nWebhook(args: SendN8nWebhookArgs): Promise<void> {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!secret) {
    // Logged so the missing-config case is visible in server logs. No secret
    // value is printed (there is none to print).
    console.error(
      `[n8n] workflow=${args.workflow} not configured: missing N8N_WEBHOOK_SECRET`,
    );
    throw new N8nConfigError("Missing N8N_WEBHOOK_SECRET");
  }

  // Resolve the per-workflow URL first; a missing/invalid base config surfaces
  // as N8nConfigError (HTTP 500) before any network call.
  const webhookUrl = resolveWebhookUrl(args.workflow);
  const endpoint = safeEndpoint(webhookUrl);
  const envelope: N8nWebhookEnvelope = {
    workflow: args.workflow,
    project_id: args.projectId,
    requested_at: new Date().toISOString(),
    payload: args.payload ?? {},
  };

  let response: Response;
  try {
    response = await fetchWithRetry(
      webhookUrl,
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
    // A 404 means n8n has no registered/active production webhook at this path.
    // Surface the exact resolved path so the fix (activate the workflow / check
    // the URL) is obvious from the message alone.
    const pathname = new URL(webhookUrl).pathname;
    const message =
      response.status === 404
        ? `n8n webhook not registered: ${pathname}`
        : `n8n webhook returned status ${response.status}`;
    throw new N8nRequestError(message, {
      status: response.status,
      bodySnippet,
    });
  }

  // Success path — concise, secret-free confirmation for observability.
  console.info(
    `[n8n] workflow=${args.workflow} endpoint=${endpoint} status=${response.status} accepted`,
  );
}
