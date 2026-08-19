// Mocked HTTP checks for Runway text-to-video (no real network, no paid calls).
//   npm run check:runway-text-to-video

import assert from "node:assert/strict";
import {
  RUNWAY_API_BASE,
  RUNWAY_API_VERSION,
  RUNWAY_CREATE_MAX_TRANSPORT_ATTEMPTS,
  RUNWAY_TEXT_TO_VIDEO_PATH,
  RunwayVideoGenerationProvider,
} from "@/lib/ai/runway";
import { VideoGenerationError } from "@/lib/ai/videoGenerationError";
import type { TextToVideoRequest } from "@/lib/ai/videoGeneration";
import { getVideoGenerationProvider } from "@/lib/ai/index";
import { buildRunwayTextToVideoBody, resolveRunwayTextToVideoRequest } from "@/lib/ai/runwayTextToVideoBody";

let passed = 0;
let failed = 0;

async function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  FAIL ${name}`);
    console.error(`       ${message.replace(/\n/g, "\n       ")}`);
  }
}

const API_KEY = "key_abcdef0123456789deadbeefcafebabe";
const TASK_ID = "d2e3d1f4-1b3c-4b5c-8d46-1c1d7ee86892";
const VIDEO_URL =
  "https://dnznrvs05pmza.cloudfront.net/output.mp4?_jwt=test-token";

const BASE_REQUEST: TextToVideoRequest = {
  promptText: "A technician walks into a workshop and starts a short task.",
  model: "gen4.5",
  duration: 4,
  ratio: "720:1280",
};

type FetchCall = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
};

function headerMap(headers: HeadersInit | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headers) return out;
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      out[key.toLowerCase()] = value;
    });
    return out;
  }
  if (Array.isArray(headers)) {
    for (const [key, value] of headers) out[key.toLowerCase()] = value;
    return out;
  }
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === "string") out[key.toLowerCase()] = value;
  }
  return out;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function withMockedFetch(
  handler: (call: FetchCall, init: RequestInit) => Promise<Response> | Response,
  fn: () => Promise<void>,
): Promise<FetchCall[]> {
  const calls: FetchCall[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    if (!url.startsWith(RUNWAY_API_BASE)) {
      throw new Error(`unexpected fetch URL (refusing real network): ${url}`);
    }
    const call: FetchCall = {
      url,
      method: (init?.method ?? "GET").toUpperCase(),
      headers: headerMap(init?.headers),
      body: typeof init?.body === "string" ? init.body : null,
    };
    calls.push(call);
    return handler(call, init ?? {});
  }) as typeof fetch;
  try {
    await fn();
  } finally {
    globalThis.fetch = original;
  }
  return calls;
}

function provider(): RunwayVideoGenerationProvider {
  return new RunwayVideoGenerationProvider(API_KEY);
}

console.log("check:runway-text-to-video");

await check("production routing stays image-to-video provider", () => {
  const routed = getVideoGenerationProvider();
  assert.equal(routed.name, "runway");
  assert.equal("createTextToVideo" in routed, true);
  assert.equal(typeof routed.createImageToVideo, "function");
});

await check("createTextToVideo posts /v1/text_to_video once and returns task id", async () => {
  const calls = await withMockedFetch(
    (call) => {
      if (call.method === "POST" && call.url.endsWith(RUNWAY_TEXT_TO_VIDEO_PATH)) {
        return jsonResponse(200, { id: TASK_ID, estimatedCost: { credits: 48 } });
      }
      throw new Error(`unexpected ${call.method} ${call.url}`);
    },
    async () => {
      const created = await provider().createTextToVideo({
        ...BASE_REQUEST,
        dangerousCreateMaxTransportAttempts: 1,
      });
      assert.equal(created.providerTaskId, TASK_ID);
      assert.equal(created.status, "pending");
      assert.equal(created.model, "gen4.5");
    },
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.method, "POST");
  assert.equal(calls[0]?.url, `${RUNWAY_API_BASE}${RUNWAY_TEXT_TO_VIDEO_PATH}`);
  assert.equal(calls[0]?.headers["x-runway-version"], RUNWAY_API_VERSION);
  const body = JSON.parse(calls[0]!.body ?? "{}") as Record<string, unknown>;
  assert.equal(body.model, "gen4.5");
  assert.equal(body.promptText, BASE_REQUEST.promptText);
  assert.equal(body.ratio, "720:1280");
  assert.equal(body.duration, 4);
  assert.equal("audio" in body, false);
  assert.equal("promptImage" in body, false);
  assert.equal("references" in body, false);
});

await check("Veo and Seedance send documented audio=true and no references in Round T", async () => {
  for (const modelId of ["veo3.1_fast", "seedance2_fast"] as const) {
    const calls = await withMockedFetch(
      () => jsonResponse(200, { id: TASK_ID }),
      async () => {
        await provider().createTextToVideo({
          ...BASE_REQUEST,
          model: modelId,
          generateAudio: true,
        });
      },
    );
    const body = JSON.parse(calls[0]!.body ?? "{}") as Record<string, unknown>;
    assert.equal(body.model, modelId);
    assert.equal(body.audio, true);
    assert.equal("references" in body, false);
    assert.equal("seed" in body, false);
  }
});

await check("create POST transport attempts stay 1", () => {
  assert.equal(RUNWAY_CREATE_MAX_TRANSPORT_ATTEMPTS, 1);
  const { resolved } = resolveRunwayTextToVideoRequest(BASE_REQUEST, "gen4.5");
  const body = buildRunwayTextToVideoBody(resolved);
  assert.equal(body.model, "gen4.5");
});

await check("poll reuses GET /v1/tasks", async () => {
  const calls = await withMockedFetch(
    (call) => {
      if (call.method === "GET" && call.url.includes("/v1/tasks/")) {
        return jsonResponse(200, {
          id: TASK_ID,
          status: "SUCCEEDED",
          output: [VIDEO_URL],
        });
      }
      throw new Error(`unexpected ${call.method} ${call.url}`);
    },
    async () => {
      const snapshot = await provider().getTextToVideoTask(TASK_ID, { model: "gen4.5" });
      assert.equal(snapshot.status, "succeeded");
      assert.equal(snapshot.videoUrl, VIDEO_URL);
    },
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.method, "GET");
  assert.match(calls[0]!.url, /\/v1\/tasks\//);
});

await check("invalid T2V input fails before fetch", async () => {
  let fetchCalled = false;
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    fetchCalled = true;
    throw new Error("fetch should not run");
  }) as typeof fetch;
  try {
    await assert.rejects(
      () => provider().createTextToVideo({ ...BASE_REQUEST, promptText: "" }),
      (err: unknown) => {
        assert.ok(err instanceof VideoGenerationError);
        assert.equal(err.code, "invalid_input");
        return true;
      },
    );
    await assert.rejects(
      () =>
        provider().createTextToVideo({
          ...BASE_REQUEST,
          model: "gen4_turbo",
        }),
      /not a Round T catalog model|unsupported/,
    );
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = original;
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
