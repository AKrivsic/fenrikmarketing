import { timingSafeEqual } from "node:crypto";

// Header n8n sends with each callback request. Kept here so every route and the
// shared helpers reference a single source of truth.
export const N8N_SECRET_HEADER = "x-n8n-secret";

// Thrown by callback handlers when the JSON payload is structurally invalid
// (missing field, wrong type, unknown enum value, unknown reference). Mapped to
// HTTP 400 by handleN8nCallback. Anything else thrown from a handler (e.g. a
// Supabase/DB error) is treated as a server/persist failure and mapped to 500.
export class CallbackValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CallbackValidationError";
  }
}

// Constant-time comparison so a wrong secret cannot be guessed via timing.
function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

// Returns true only when the configured secret exists and matches the header.
export function verifyN8nSecret(request: Request): boolean {
  const expected = process.env.N8N_CALLBACK_SECRET;
  if (!expected) return false;
  const provided = request.headers.get(N8N_SECRET_HEADER);
  if (!provided) return false;
  return safeEqual(provided, expected);
}

export function unauthorizedResponse(): Response {
  return Response.json(
    { ok: false, error: "unauthorized" },
    { status: 401 },
  );
}

export function badRequestResponse(): Response {
  return Response.json(
    { ok: false, error: "invalid_json" },
    { status: 400 },
  );
}

export function validationErrorResponse(message: string): Response {
  return Response.json(
    { ok: false, error: "invalid_payload", message },
    { status: 400 },
  );
}

export function serverErrorResponse(): Response {
  return Response.json(
    { ok: false, error: "server_error" },
    { status: 500 },
  );
}

export function okResponse(): Response {
  return Response.json({ ok: true });
}

async function parseJsonPayload(request: Request): Promise<unknown> {
  return request.json();
}

// Shared pipeline for every n8n callback route: validate the secret, parse the
// JSON body, then hand off to a route-specific handler. Keeps each route file
// tiny and guarantees consistent 401 / 400 / 200 behaviour.
export async function handleN8nCallback(
  request: Request,
  handler: (payload: unknown) => Promise<void> | void,
): Promise<Response> {
  if (!verifyN8nSecret(request)) {
    return unauthorizedResponse();
  }

  let payload: unknown;
  try {
    payload = await parseJsonPayload(request);
  } catch {
    return badRequestResponse();
  }

  try {
    await handler(payload);
  } catch (err) {
    // Payload-shape problems are the caller's fault -> 400.
    if (err instanceof CallbackValidationError) {
      return validationErrorResponse(err.message);
    }
    // Persist/DB/unexpected failures -> 500 (no detail leaked to the caller).
    console.error("[n8n callback] handler failed:", err);
    return serverErrorResponse();
  }

  return okResponse();
}
