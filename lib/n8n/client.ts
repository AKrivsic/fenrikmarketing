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
export class N8nRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "N8nRequestError";
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

export async function sendN8nWebhook(args: SendN8nWebhookArgs): Promise<void> {
  const baseUrl = process.env.N8N_BASE_URL;
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!baseUrl || !secret) {
    throw new N8nConfigError("Missing N8N_BASE_URL or N8N_WEBHOOK_SECRET");
  }

  const envelope: N8nWebhookEnvelope = {
    workflow: args.workflow,
    project_id: args.projectId,
    requested_at: new Date().toISOString(),
    payload: args.payload ?? {},
  };

  let response: Response;
  try {
    response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [N8N_SECRET_HEADER]: secret,
      },
      body: JSON.stringify(envelope),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "network error";
    throw new N8nRequestError(`n8n webhook request failed: ${detail}`);
  }

  if (!response.ok) {
    throw new N8nRequestError(`n8n webhook returned status ${response.status}`);
  }
}
