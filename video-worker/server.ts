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
import { z } from "zod";
import { workerPayloadSchema } from "@/lib/video-engine/schemas/workerPayloadSchema";
import { enqueueVideoJob } from "@/video-worker/queue";
import { regenerateSceneImage } from "@/video-worker/services/regenerateSceneImage";
import { editSceneImage } from "@/video-worker/services/editSceneImage";
import { insertSceneBrandAsset } from "@/video-worker/services/insertSceneBrandAsset";

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

const regenerateSceneImageSchema = z.object({
  project_id: z.string().min(1),
  source_video_job_id: z.string().min(1),
  scene_id: z.string().min(1),
  image_prompt: z.string().min(1),
  instruction: z.string().min(1),
});

async function handleRegenerateSceneImage(
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

  const result = regenerateSceneImageSchema.safeParse(parsed);
  if (!result.success) {
    sendJson(res, 400, {
      ok: false,
      error: "invalid_payload",
      issues: result.error.issues,
    });
    return;
  }

  const body = result.data;
  try {
    const uploaded = await regenerateSceneImage({
      projectId: body.project_id,
      sourceVideoJobId: body.source_video_job_id,
      sceneId: body.scene_id,
      imagePrompt: body.image_prompt,
      instruction: body.instruction,
    });
    sendJson(res, 200, {
      ok: true,
      image_bucket: uploaded.image_bucket,
      image_path: uploaded.image_path,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "regenerate_failed";
    console.error(
      "[video-worker] regenerate-scene-image failed",
      JSON.stringify({ error: message }),
    );
    sendJson(res, 500, { ok: false, error: message });
  }
}

const editSceneImageSchema = z.object({
  project_id: z.string().min(1),
  source_video_job_id: z.string().min(1),
  scene_id: z.string().min(1),
  image_bucket: z.string().min(1),
  image_path: z.string().min(1),
  instruction: z.string().min(1),
});

async function handleEditSceneImage(
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

  const result = editSceneImageSchema.safeParse(parsed);
  if (!result.success) {
    sendJson(res, 400, {
      ok: false,
      error: "invalid_payload",
      issues: result.error.issues,
    });
    return;
  }

  const body = result.data;
  try {
    const uploaded = await editSceneImage({
      projectId: body.project_id,
      sourceVideoJobId: body.source_video_job_id,
      sceneId: body.scene_id,
      imageBucket: body.image_bucket,
      imagePath: body.image_path,
      instruction: body.instruction,
    });
    sendJson(res, 200, {
      ok: true,
      image_bucket: uploaded.image_bucket,
      image_path: uploaded.image_path,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "edit_failed";
    console.error(
      "[video-worker] edit-scene-image failed",
      JSON.stringify({ error: message }),
    );
    sendJson(res, 500, { ok: false, error: message });
  }
}

const insertSceneAssetSchema = z.object({
  project_id: z.string().min(1),
  source_video_job_id: z.string().min(1),
  scene_id: z.string().min(1),
  scene_image_bucket: z.string().min(1),
  scene_image_path: z.string().min(1),
  asset_bucket: z.string().min(1),
  asset_path: z.string().min(1),
  instruction: z.string().min(1),
});

async function handleInsertSceneAsset(
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

  const result = insertSceneAssetSchema.safeParse(parsed);
  if (!result.success) {
    sendJson(res, 400, {
      ok: false,
      error: "invalid_payload",
      issues: result.error.issues,
    });
    return;
  }

  const body = result.data;
  try {
    const uploaded = await insertSceneBrandAsset({
      projectId: body.project_id,
      sourceVideoJobId: body.source_video_job_id,
      sceneId: body.scene_id,
      sceneImageBucket: body.scene_image_bucket,
      sceneImagePath: body.scene_image_path,
      assetBucket: body.asset_bucket,
      assetPath: body.asset_path,
      instruction: body.instruction,
    });
    sendJson(res, 200, {
      ok: true,
      image_bucket: uploaded.image_bucket,
      image_path: uploaded.image_path,
      provider: uploaded.provider,
      model: uploaded.model,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "insert_failed";
    console.error(
      "[video-worker] insert-scene-asset failed",
      JSON.stringify({ error: message }),
    );
    sendJson(res, 500, { ok: false, error: message });
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

  if (req.url === "/render") {
    if (req.method !== "POST") {
      sendJson(res, 405, { ok: false, error: "method_not_allowed" });
      return;
    }
    await handleRender(req, res);
    return;
  }

  if (req.url === "/regenerate-scene-image") {
    if (req.method !== "POST") {
      sendJson(res, 405, { ok: false, error: "method_not_allowed" });
      return;
    }
    await handleRegenerateSceneImage(req, res);
    return;
  }

  if (req.url === "/edit-scene-image") {
    if (req.method !== "POST") {
      sendJson(res, 405, { ok: false, error: "method_not_allowed" });
      return;
    }
    await handleEditSceneImage(req, res);
    return;
  }

  if (req.url === "/insert-scene-asset") {
    if (req.method !== "POST") {
      sendJson(res, 405, { ok: false, error: "method_not_allowed" });
      return;
    }
    await handleInsertSceneAsset(req, res);
    return;
  }

  sendJson(res, 404, { ok: false, error: "not_found" });
}

server.listen(PORT, () => {
  console.log(`[video-worker] listening on port ${PORT}`);
});
