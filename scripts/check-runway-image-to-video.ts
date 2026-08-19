// Mocked HTTP checks for Runway image-to-video (no real network, no paid calls).
//   npm run check:runway-image-to-video

import assert from "node:assert/strict";
import { getVideoGenerationProvider } from "@/lib/ai/index";
import {
  DEFAULT_RUNWAY_VIDEO_MODEL,
  RUNWAY_API_BASE,
  RUNWAY_API_VERSION,
  RUNWAY_GEN4_MOTION_PROMPT_MAX_UTF16,
  RunwayVideoGenerationProvider,
} from "@/lib/ai/runway";
import { VideoGenerationError } from "@/lib/ai/videoGenerationError";
import type { ImageToVideoRequest } from "@/lib/ai/videoGeneration";

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
const IMAGE_URL = "https://cdn.example.com/scene.png";
const VIDEO_URL =
  "https://dnznrvs05pmza.cloudfront.net/output.mp4?_jwt=test-token";

const BASE_REQUEST: ImageToVideoRequest = {
  imageUrl: IMAGE_URL,
  motionPrompt: "Slow push-in, clouds drifting past the product",
  duration: 5,
  ratio: "720:1280",
  seed: 42,
  pollIntervalMs: 0,
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

function assertNoSecret(value: string): void {
  assert.equal(value.includes(API_KEY), false, `secret leaked: ${value}`);
  assert.equal(/key_[0-9a-f]{8,}/i.test(value), false, `key_ pattern leaked: ${value}`);
  assert.equal(/Bearer\s+key_/i.test(value), false, `Bearer token leaked: ${value}`);
}

function assertAuthHeaders(call: FetchCall): void {
  assert.equal(call.headers["authorization"], `Bearer ${API_KEY}`);
  assert.equal(call.headers["x-runway-version"], RUNWAY_API_VERSION);
  assert.equal(call.headers["content-type"], "application/json");
}

await check("getVideoGenerationProvider is Runway only", () => {
  const routed = getVideoGenerationProvider();
  assert.equal(routed.name, "runway");
  assert.equal(typeof routed.generateImageToVideo, "function");
  assert.equal(typeof routed.createImageToVideo, "function");
  assert.equal(typeof routed.getImageToVideoTask, "function");
});

await check("missing API key fails before fetch", async () => {
  let fetchCalled = false;
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    fetchCalled = true;
    throw new Error("fetch should not run");
  }) as typeof fetch;
  try {
    const p = new RunwayVideoGenerationProvider("");
    await assert.rejects(
      () => p.createImageToVideo(BASE_REQUEST),
      (err: unknown) => {
        assert.ok(err instanceof VideoGenerationError);
        assert.equal(err.code, "missing_api_key");
        assert.match(err.message, /Missing RUNWAYML_API_SECRET/);
        assertNoSecret(err.message);
        return true;
      },
    );
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = original;
  }
});

await check("invalid inputs fail before fetch", async () => {
  const p = provider();
  let fetchCalled = false;
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    fetchCalled = true;
    throw new Error("fetch should not run");
  }) as typeof fetch;
  try {
    const cases: Array<[string, ImageToVideoRequest]> = [
      ["empty imageUrl", { ...BASE_REQUEST, imageUrl: "  " }],
      ["http imageUrl", { ...BASE_REQUEST, imageUrl: "http://cdn.example.com/scene.png" }],
      [
        "ip imageUrl",
        { ...BASE_REQUEST, imageUrl: "https://127.0.0.1/scene.png" },
      ],
      ["empty prompt", { ...BASE_REQUEST, motionPrompt: "" }],
      ["non-integer duration", { ...BASE_REQUEST, duration: 5.5 }],
      ["zero duration", { ...BASE_REQUEST, duration: 0 }],
      ["empty ratio", { ...BASE_REQUEST, ratio: "" }],
      ["empty model", { ...BASE_REQUEST, model: "  " }],
      ["bad seed", { ...BASE_REQUEST, seed: -1 }],
    ];
    for (const [label, req] of cases) {
      await assert.rejects(
        () => p.createImageToVideo(req),
        (err: unknown) => {
          assert.ok(err instanceof VideoGenerationError, label);
          assert.equal(err.code, "invalid_input", label);
          assertNoSecret(err.message);
          return true;
        },
      );
    }
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = original;
  }
});

await check("oversized motionPrompt fails before fetch", async () => {
  let fetchCalled = false;
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    fetchCalled = true;
    throw new Error("fetch should not run");
  }) as typeof fetch;
  try {
    const longPrompt = "a".repeat(RUNWAY_GEN4_MOTION_PROMPT_MAX_UTF16 + 1);
    await assert.rejects(
      () =>
        provider().createImageToVideo({
          ...BASE_REQUEST,
          motionPrompt: longPrompt,
        }),
      (err: unknown) => {
        assert.ok(err instanceof VideoGenerationError);
        assert.equal(err.code, "invalid_input");
        assert.match(err.message, /UTF-16/);
        return true;
      },
    );
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = original;
  }
});

await check("unsupported duration fails before fetch", async () => {
  let fetchCalled = false;
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    fetchCalled = true;
    throw new Error("fetch should not run");
  }) as typeof fetch;
  try {
    for (const duration of [1, 11, 30]) {
      await assert.rejects(
        () => provider().createImageToVideo({ ...BASE_REQUEST, duration }),
        (err: unknown) => {
          assert.ok(err instanceof VideoGenerationError);
          assert.equal(err.code, "invalid_input");
          assert.match(err.message, /duration/);
          return true;
        },
      );
    }
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = original;
  }
});

await check("unsupported ratio fails before fetch", async () => {
  let fetchCalled = false;
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    fetchCalled = true;
    throw new Error("fetch should not run");
  }) as typeof fetch;
  try {
    for (const ratio of ["9:16", "16:9", "1080:1920", "1:1", "bogus"]) {
      await assert.rejects(
        () => provider().createImageToVideo({ ...BASE_REQUEST, ratio }),
        (err: unknown) => {
          assert.ok(err instanceof VideoGenerationError);
          assert.equal(err.code, "invalid_input");
          assert.match(err.message, /ratio/);
          return true;
        },
      );
    }
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = original;
  }
});

await check("incompatible model fails before fetch", async () => {
  let fetchCalled = false;
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    fetchCalled = true;
    throw new Error("fetch should not run");
  }) as typeof fetch;
  try {
    await assert.rejects(
      () =>
        provider().createImageToVideo({
          ...BASE_REQUEST,
          model: "grok_imagine_1_5",
        }),
      (err: unknown) => {
        assert.ok(err instanceof VideoGenerationError);
        assert.equal(err.code, "invalid_input");
        assert.match(err.message, /not in the verified catalog/);
        return true;
      },
    );
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = original;
  }
});

await check("successful create task", async () => {
  const calls = await withMockedFetch(async (call) => {
    assert.equal(call.method, "POST");
    assert.equal(call.url, `${RUNWAY_API_BASE}/v1/image_to_video`);
    assertAuthHeaders(call);
    const body = JSON.parse(call.body ?? "{}") as Record<string, unknown>;
    assert.equal(body.model, DEFAULT_RUNWAY_VIDEO_MODEL);
    assert.equal(body.promptImage, IMAGE_URL);
    assert.equal(body.promptText, BASE_REQUEST.motionPrompt);
    assert.equal(body.duration, 5);
    assert.equal(body.ratio, "720:1280");
    assert.equal(body.seed, 42);
    return jsonResponse(200, {
      id: TASK_ID,
      estimatedCost: { credits: 12 },
    });
  }, async () => {
    const result = await provider().createImageToVideo(BASE_REQUEST);
    assert.equal(result.provider, "runway");
    assert.equal(result.providerTaskId, TASK_ID);
    assert.equal(result.status, "pending");
    assert.equal(result.model, "gen4.5");
    assert.equal(result.estimatedCostCredits, 12);
    assert.equal(result.request?.ratio, "720:1280");
    assert.equal(result.videoUrl, undefined);
  });
  assert.equal(calls.length, 1);
});

await check("task in running state", async () => {
  await withMockedFetch(async (call) => {
    assert.equal(call.method, "GET");
    assert.equal(call.url, `${RUNWAY_API_BASE}/v1/tasks/${TASK_ID}`);
    assertAuthHeaders(call);
    return jsonResponse(200, {
      id: TASK_ID,
      status: "RUNNING",
      createdAt: "2024-06-27T19:49:32.335Z",
      progress: 0.4,
      estimatedCost: { credits: 12 },
    });
  }, async () => {
    const result = await provider().getImageToVideoTask(TASK_ID, {
      model: "gen4.5",
      maxTransportAttempts: 1,
    });
    assert.equal(result.status, "running");
    assert.equal(result.progress, 0.4);
    assert.equal(result.videoUrl, undefined);
    assert.equal(result.providerTaskId, TASK_ID);
  });
});

await check("successful completion with video URL", async () => {
  let step = 0;
  await withMockedFetch(async (call) => {
    if (step === 0) {
      step += 1;
      assert.equal(call.url, `${RUNWAY_API_BASE}/v1/image_to_video`);
      return jsonResponse(200, { id: TASK_ID, estimatedCost: { credits: 12 } });
    }
    assert.equal(call.url, `${RUNWAY_API_BASE}/v1/tasks/${TASK_ID}`);
    return jsonResponse(200, {
      id: TASK_ID,
      status: "SUCCEEDED",
      createdAt: "2024-06-27T19:49:32.335Z",
      output: [VIDEO_URL],
      cost: { credits: 10 },
    });
  }, async () => {
    const result = await provider().generateImageToVideo({
      ...BASE_REQUEST,
      pollTimeoutMs: 1_000,
    });
    assert.equal(result.status, "succeeded");
    assert.equal(result.videoUrl, VIDEO_URL);
    assert.equal(result.providerTaskId, TASK_ID);
    assert.equal(result.request?.model, "gen4.5");
    assert.equal(typeof result.generationMs, "number");
    assert.ok((result.generationMs ?? 0) >= 0);
  });
});

await check("succeeded with non-HTTPS video URL is unexpected_response", async () => {
  await withMockedFetch(async () => {
    return jsonResponse(200, {
      id: TASK_ID,
      status: "SUCCEEDED",
      createdAt: "2024-06-27T19:49:32.335Z",
      output: ["http://cdn.example.com/output.mp4"],
      cost: { credits: 10 },
    });
  }, async () => {
    await assert.rejects(
      () => provider().getImageToVideoTask(TASK_ID, { maxTransportAttempts: 1 }),
      (err: unknown) => {
        assert.ok(err instanceof VideoGenerationError);
        assert.equal(err.code, "unexpected_response");
        assert.match(err.message, /non-HTTPS/);
        return true;
      },
    );
  });
});

await check("succeeded with invalid video URL is unexpected_response", async () => {
  await withMockedFetch(async () => {
    return jsonResponse(200, {
      id: TASK_ID,
      status: "SUCCEEDED",
      createdAt: "2024-06-27T19:49:32.335Z",
      output: ["not a url"],
      cost: { credits: 10 },
    });
  }, async () => {
    await assert.rejects(
      () => provider().getImageToVideoTask(TASK_ID, { maxTransportAttempts: 1 }),
      (err: unknown) => {
        assert.ok(err instanceof VideoGenerationError);
        assert.equal(err.code, "unexpected_response");
        assert.match(err.message, /invalid video URL/);
        return true;
      },
    );
  });
});

await check("failed task", async () => {
  let step = 0;
  await withMockedFetch(async () => {
    if (step === 0) {
      step += 1;
      return jsonResponse(200, { id: TASK_ID, estimatedCost: { credits: 12 } });
    }
    return jsonResponse(200, {
      id: TASK_ID,
      status: "FAILED",
      createdAt: "2024-06-27T19:49:32.335Z",
      failure: "Input rejected by safety systems",
      failureCode: "SAFETY.INPUT.TEXT",
      cost: { credits: 12 },
    });
  }, async () => {
    const result = await provider().generateImageToVideo({
      ...BASE_REQUEST,
      pollTimeoutMs: 1_000,
    });
    assert.equal(result.status, "failed");
    assert.equal(result.videoUrl, undefined);
    assert.equal(result.error?.code, "SAFETY.INPUT.TEXT");
    assert.match(result.error?.message ?? "", /Input rejected/);
    assertNoSecret(result.error?.message ?? "");
  });
});

await check("HTTP 429", async () => {
  const calls = await withMockedFetch(async () => {
    return jsonResponse(429, { error: `rate limited for ${API_KEY}` });
  }, async () => {
    await assert.rejects(
      () => provider().createImageToVideo(BASE_REQUEST),
      (err: unknown) => {
        assert.ok(err instanceof VideoGenerationError);
        assert.equal(err.httpStatus, 429);
        assert.match(err.message, /429/);
        assertNoSecret(err.message);
        return true;
      },
    );
  });
  assert.equal(calls.length, 1, "create POST must not retry on 429 by default");
});

await check("HTTP 5xx", async () => {
  const calls = await withMockedFetch(async () => {
    return jsonResponse(503, { error: `upstream unavailable ${API_KEY}` });
  }, async () => {
    await assert.rejects(
      () => provider().createImageToVideo(BASE_REQUEST),
      (err: unknown) => {
        assert.ok(err instanceof VideoGenerationError);
        assert.equal(err.httpStatus, 503);
        assert.match(err.message, /503/);
        assertNoSecret(err.message);
        return true;
      },
    );
  });
  assert.equal(calls.length, 1, "create POST must not retry on 5xx by default");
});

await check("create timeout uses a single POST", async () => {
  const calls = await withMockedFetch(async (_call, init) => {
    return await new Promise<Response>((_resolve, reject) => {
      const signal = init.signal;
      if (!signal) {
        reject(new Error("expected abort signal"));
        return;
      }
      const onAbort = () => {
        const err = new Error("This operation was aborted");
        err.name = "AbortError";
        reject(err);
      };
      if (signal.aborted) onAbort();
      else signal.addEventListener("abort", onAbort, { once: true });
    });
  }, async () => {
    await assert.rejects(
      () =>
        provider().createImageToVideo({
          ...BASE_REQUEST,
          timeoutMs: 20,
        }),
      (err: unknown) => {
        assert.ok(err instanceof VideoGenerationError);
        assert.equal(err.code, "timeout");
        assertNoSecret(err.message);
        return true;
      },
    );
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.method, "POST");
  assert.equal(calls[0]?.url, `${RUNWAY_API_BASE}/v1/image_to_video`);
});

await check("generateImageToVideo strips dangerous create retries", async () => {
  const calls = await withMockedFetch(async (_call, init) => {
    return await new Promise<Response>((_resolve, reject) => {
      const signal = init.signal;
      if (!signal) {
        reject(new Error("expected abort signal"));
        return;
      }
      const onAbort = () => {
        const err = new Error("This operation was aborted");
        err.name = "AbortError";
        reject(err);
      };
      if (signal.aborted) onAbort();
      else signal.addEventListener("abort", onAbort, { once: true });
    });
  }, async () => {
    await assert.rejects(
      () =>
        provider().generateImageToVideo({
          ...BASE_REQUEST,
          timeoutMs: 20,
          // Even if a caller sets this, generateImageToVideo must ignore it.
          dangerousCreateMaxTransportAttempts: 3,
        }),
      (err: unknown) => {
        assert.ok(err instanceof VideoGenerationError);
        assert.equal(err.code, "timeout");
        return true;
      },
    );
  });
  assert.equal(calls.length, 1);
});

await check("poll timeout while running", async () => {
  let step = 0;
  await withMockedFetch(async () => {
    if (step === 0) {
      step += 1;
      return jsonResponse(200, { id: TASK_ID, estimatedCost: { credits: 12 } });
    }
    return jsonResponse(200, {
      id: TASK_ID,
      status: "RUNNING",
      createdAt: "2024-06-27T19:49:32.335Z",
      progress: 0.1,
      estimatedCost: { credits: 12 },
    });
  }, async () => {
    await assert.rejects(
      () =>
        provider().generateImageToVideo({
          ...BASE_REQUEST,
          pollTimeoutMs: 0,
        }),
      (err: unknown) => {
        assert.ok(err instanceof VideoGenerationError);
        assert.equal(err.code, "timeout");
        assert.equal(err.providerTaskId, TASK_ID);
        assertNoSecret(err.message);
        return true;
      },
    );
  });
});

await check("API key is not present in error messages", async () => {
  await withMockedFetch(async () => {
    return jsonResponse(401, {
      error: `Unauthorized bearer ${API_KEY}`,
    });
  }, async () => {
    await assert.rejects(
      () => provider().createImageToVideo(BASE_REQUEST),
      (err: unknown) => {
        assert.ok(err instanceof VideoGenerationError);
        assert.equal(err.httpStatus, 401);
        assertNoSecret(err.message);
        assert.equal(JSON.stringify(err).includes(API_KEY), false);
        return true;
      },
    );
  });
});

await check("veo3.1_fast uses audio field and duration enum", async () => {
  const calls = await withMockedFetch(async (call) => {
    const body = JSON.parse(call.body ?? "{}") as Record<string, unknown>;
    assert.equal(body.model, "veo3.1_fast");
    assert.equal(body.audio, true);
    assert.equal(body.duration, 4);
    assert.equal(body.ratio, "720:1280");
    assert.equal(body.promptImage, IMAGE_URL);
    assert.equal(body.seed, undefined);
    return jsonResponse(200, { id: TASK_ID, estimatedCost: { credits: 60 } });
  }, async () => {
    const result = await provider().createImageToVideo({
      imageUrl: IMAGE_URL,
      motionPrompt: BASE_REQUEST.motionPrompt,
      model: "veo3.1_fast",
      duration: 4,
      ratio: "720:1280",
      generateAudio: true,
    });
    assert.equal(result.model, "veo3.1_fast");
    assert.equal(result.request?.generateAudio, true);
  });
  assert.equal(calls.length, 1);
});

await check("veo3.1_fast rejects duration 5 before fetch", async () => {
  let fetchCalled = false;
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    fetchCalled = true;
    throw new Error("fetch should not run");
  }) as typeof fetch;
  try {
    await assert.rejects(
      () =>
        provider().createImageToVideo({
          imageUrl: IMAGE_URL,
          motionPrompt: BASE_REQUEST.motionPrompt,
          model: "veo3.1_fast",
          duration: 5,
          ratio: "720:1280",
        }),
      (err: unknown) => {
        assert.ok(err instanceof VideoGenerationError);
        assert.equal(err.code, "invalid_input");
        assert.match(err.message, /duration/);
        return true;
      },
    );
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = original;
  }
});

await check("seedance2_fast sends first-frame promptImage and audio", async () => {
  const calls = await withMockedFetch(async (call) => {
    const body = JSON.parse(call.body ?? "{}") as Record<string, unknown>;
    assert.equal(body.model, "seedance2_fast");
    assert.equal(body.audio, true);
    assert.equal(body.duration, 5);
    assert.equal(body.ratio, "720:1280");
    assert.deepEqual(body.promptImage, [{ uri: IMAGE_URL, position: "first" }]);
    return jsonResponse(200, { id: TASK_ID, estimatedCost: { credits: 145 } });
  }, async () => {
    const result = await provider().createImageToVideo({
      imageUrl: IMAGE_URL,
      motionPrompt: BASE_REQUEST.motionPrompt,
      model: "seedance2_fast",
      duration: 5,
      ratio: "720:1280",
    });
    assert.equal(result.model, "seedance2_fast");
  });
  assert.equal(calls.length, 1);
});

await check("unsupported catalog model fails before fetch", async () => {
  let fetchCalled = false;
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    fetchCalled = true;
    throw new Error("fetch should not run");
  }) as typeof fetch;
  try {
    await assert.rejects(
      () =>
        provider().createImageToVideo({
          ...BASE_REQUEST,
          model: "gemini_omni_flash",
        }),
      (err: unknown) => {
        assert.ok(err instanceof VideoGenerationError);
        assert.equal(err.code, "invalid_input");
        assert.match(err.message, /unsupported/);
        return true;
      },
    );
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = original;
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
