// Video Worker — HTTP entrypoint for /api/n8n/start-video-job.
//
// POST /render authenticates, validates the payload, returns 202 immediately, and
// hands the job to an in-process concurrency queue (see queue.ts). The queue runs
// at most MAX_CONCURRENT_VIDEO_JOBS render pipelines (TTS, images, subtitles,
// FFmpeg, storage upload, callback) at a time; jobs over the limit wait in line.
// Pipeline failures are logged and reported via failed callback; they do not
// crash this process or stall the queue.

import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { timingSafeEqual } from "node:crypto";
import { workerPayloadSchema } from "@/lib/video-engine/schemas/workerPayloadSchema";
import { enqueueVideoJob } from "@/video-worker/queue";

// Auth header the Vercel client (lib/video-worker/client.ts) sends with every
// render request. Single source of truth shared with that caller by convention.
const WORKER_SECRET_HEADER = "x-video-worker-secret";
const PORT = Number(process.env.VIDEO_WORKER_PORT ?? 8080);

// Reads the full request body as a UTF-8 string.
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

// Writes a JSON response with the given status code.
function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json" });
  res.end(payload);
}

// Constant-time check of the shared worker secret. Returns false when the secret
// is unconfigured or the header is missing/wrong (no timing side-channel).
function isAuthorized(req: IncomingMessage): boolean {
  const expected = process.env.VIDEO_WORKER_SECRET;
  if (!expected) return false;
  const provided = req.headers[WORKER_SECRET_HEADER];
  if (typeof provided !== "string" || provided.length === 0) return false;

  const providedBuf = Buffer.from(provided, "utf8");
  const expectedBuf = Buffer.from(expected, "utf8");
  if (providedBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(providedBuf, expectedBuf);
}

// POST /render — authenticate, validate, enqueue into the concurrency queue,
// return 202.
async function handleRender(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (!isAuthorized(req)) {
    sendJson(res, 401, { ok: false, error: "unauthorized" });
    return;
  }

  let raw: string;
  try {
    raw = await readBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: "read_error" });
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    sendJson(res, 400, { ok: false, error: "invalid_json" });
    return;
  }

  const result = workerPayloadSchema.safeParse(parsed);
  if (!result.success) {
    sendJson(res, 400, {
      ok: false,
      error: "invalid_payload",
      issues: result.error.issues,
    });
    return;
  }

  const payload = result.data;

  console.log(
    "[video-worker] render job accepted",
    JSON.stringify({
      video_job_id: payload.video_job_id,
      project_id: payload.project_id,
      content_package_id: payload.content_package_id,
      received_at: new Date().toISOString(),
    }),
  );

  // Hand off to the in-process concurrency queue: it starts the job now if there
  // is free capacity (MAX_CONCURRENT_VIDEO_JOBS) or holds it until a slot opens.
  enqueueVideoJob(payload);

  sendJson(res, 202, {
    ok: true,
    video_job_id: payload.video_job_id,
    status: "accepted",
  });
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

  if (req.url === "/render") {
    if (req.method !== "POST") {
      sendJson(res, 405, { ok: false, error: "method_not_allowed" });
      return;
    }
    await handleRender(req, res);
    return;
  }

  sendJson(res, 404, { ok: false, error: "not_found" });
}

server.listen(PORT, () => {
  console.log(`[video-worker] listening on port ${PORT}`);
});
