import { CrossProjectReferenceError } from "@/lib/api/guards";
import { WorkflowError } from "@/lib/ai/workflows/shared";
import type { WorkflowResult } from "@/lib/ai/workflows/shared";

// Maps a workflow result / thrown error to a consistent HTTP response so each
// route handler stays a thin wrapper.
export function workflowResponse<T>(result: WorkflowResult<T>): Response {
  if (result.ok) {
    return Response.json({ ok: true, data: result.data });
  }
  // Concurrent owner or lost claim heartbeat — retryable, not a content failure.
  if (
    result.error === "generation_in_progress" ||
    result.error === "generation_claim_lost"
  ) {
    return Response.json(
      {
        ok: false,
        error: result.error,
        attempts: result.attempts,
        validation_errors: result.validationErrors,
        retryable: true,
      },
      { status: 503 },
    );
  }
  // Validation failed even after repair + retries.
  return Response.json(
    {
      ok: false,
      error: result.error,
      attempts: result.attempts,
      validation_errors: result.validationErrors,
    },
    { status: 422 },
  );
}

export function errorResponse(err: unknown): Response {
  if (err instanceof WorkflowError) {
    const status =
      err.code === "not_found"
        ? 404
        : err.code === "unauthorized"
          ? 401
          : 400;
    return Response.json(
      { ok: false, error: err.code, message: err.message },
      { status },
    );
  }
  if (err instanceof CrossProjectReferenceError) {
    return Response.json(
      { ok: false, error: "cross_project", message: err.message },
      { status: 400 },
    );
  }
  const message = err instanceof Error ? err.message : "Unknown error";
  return Response.json(
    { ok: false, error: "internal_error", message },
    { status: 500 },
  );
}

export async function readJsonBody(
  request: Request,
): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return body as Record<string, unknown>;
    }
    throw new WorkflowError("invalid_input", "request body must be a JSON object");
  } catch (err) {
    if (err instanceof WorkflowError) throw err;
    throw new WorkflowError("invalid_input", "invalid JSON request body");
  }
}

export function requireString(
  body: Record<string, unknown>,
  key: string,
): string {
  const value = body[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new WorkflowError("invalid_input", `${key} is required`);
  }
  return value;
}

export function optionalString(
  body: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = body[key];
  return typeof value === "string" ? value : undefined;
}
