// Content Package Worker — local/server HTTP entry for package generation.
//
// Thin Node adapter around handleGenerateContentPackageRequest (same shell as
// app/api/n8n/generate-content-package). No business logic here: convert the
// Node request to a Fetch Request, call the shared handler, write the Response.
//
// Unlike video-worker /render (202 + queue), this endpoint is synchronous —
// callers need the package generation result body before continuing.

import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { handleGenerateContentPackageRequest } from "@/lib/n8n/handleGenerateContentPackageRequest";

const PORT = Number(process.env.CONTENT_PACKAGE_WORKER_PORT ?? 8081);

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json" });
  res.end(payload);
}

async function toFetchRequest(req: IncomingMessage): Promise<Request> {
  const host = req.headers.host ?? `localhost:${PORT}`;
  const url = `http://${host}${req.url ?? "/"}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else {
      headers.set(key, value);
    }
  }

  const method = req.method ?? "GET";
  if (method === "GET" || method === "HEAD") {
    return new Request(url, { method, headers });
  }

  const body = await readBody(req);
  return new Request(url, {
    method,
    headers,
    // Uint8Array is a valid BodyInit; Node Buffer is not under DOM typings.
    body: body.length > 0 ? new Uint8Array(body) : undefined,
  });
}

async function writeFetchResponse(
  res: ServerResponse,
  response: Response,
): Promise<void> {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  const buf = Buffer.from(await response.arrayBuffer());
  res.writeHead(response.status, headers);
  res.end(buf);
}

async function handleGenerate(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    const request = await toFetchRequest(req);
    const response = await handleGenerateContentPackageRequest(request);
    await writeFetchResponse(res, response);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      "[content-package-worker] generate-content-package failed",
      JSON.stringify({ error: message }),
    );
    sendJson(res, 500, { ok: false, error: "server_error", message });
  }
}

const server = createServer((req, res) => {
  void route(req, res);
});

async function route(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method === "GET" && req.url === "/health") {
    sendJson(res, 200, { ok: true, status: "healthy" });
    return;
  }

  if (req.url === "/generate-content-package") {
    if (req.method !== "POST") {
      sendJson(res, 405, { ok: false, error: "method_not_allowed" });
      return;
    }
    await handleGenerate(req, res);
    return;
  }

  sendJson(res, 404, { ok: false, error: "not_found" });
}

server.listen(PORT, () => {
  console.log(`[content-package-worker] listening on port ${PORT}`);
});
