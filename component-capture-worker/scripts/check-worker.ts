// HTTP + auth checks for component capture worker (no Playwright).
//   npm run check:component-capture-worker

import assert from "node:assert/strict";
import http from "node:http";
import { validatePublicHttpUrl } from "../lib/urlSafety.ts";
import { roleHintFromText } from "../lib/capturePageComponents.ts";
import { isCaptureWorkerAuthorized } from "../lib/auth.ts";
import { createComponentCaptureApp } from "../lib/app.ts";

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve(fn())
    .then(() => {
      passed++;
      console.log(`  ok  ${name}`);
    })
    .catch((err) => {
      failed++;
      console.error(`  FAIL ${name}`, err);
    });
}

function postJson(
  port: number,
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<{ status: number; json: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(payload),
          ...headers,
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let json: Record<string, unknown> = {};
          try {
            json = JSON.parse(text) as Record<string, unknown>;
          } catch {
            json = { raw: text };
          }
          resolve({ status: res.statusCode ?? 0, json });
        });
      },
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

async function withTestServer(
  fn: (port: number) => Promise<void>,
): Promise<void> {
  const prevSecret = process.env.COMPONENT_CAPTURE_SECRET;
  process.env.COMPONENT_CAPTURE_SECRET = "test-secret-token";
  const app = createComponentCaptureApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("no port");
  try {
    await fn(addr.port);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
    if (prevSecret === undefined) delete process.env.COMPONENT_CAPTURE_SECRET;
    else process.env.COMPONENT_CAPTURE_SECRET = prevSecret;
  }
}

async function main(): Promise<void> {
  await check("blocks localhost", () => {
    assert.equal(validatePublicHttpUrl("http://localhost/page").ok, false);
  });

  await check("blocks private IP", () => {
    assert.equal(validatePublicHttpUrl("http://192.168.1.10/").ok, false);
  });

  await check("allows https public URL", () => {
    const r = validatePublicHttpUrl("https://example.com/app");
    assert.equal(r.ok, true);
  });

  await check("role hint phone mockup", () => {
    assert.equal(roleHintFromText("Phone mockup section"), "mobile_app");
  });

  await check("auth rejects missing bearer", () => {
    assert.equal(isCaptureWorkerAuthorized(undefined), false);
  });

  await check("auth accepts matching bearer", () => {
    process.env.COMPONENT_CAPTURE_SECRET = "test-secret-token";
    assert.equal(
      isCaptureWorkerAuthorized("Bearer test-secret-token"),
      true,
    );
  });

  await check("POST /capture-components returns 401 without auth", async () => {
    await withTestServer(async (port) => {
      const res = await postJson(port, "/capture-components", {
        url: "https://example.com",
      });
      assert.equal(res.status, 401);
    });
  });

  await check("POST /capture-components rejects invalid URL", async () => {
    await withTestServer(async (port) => {
      const res = await postJson(
        port,
        "/capture-components",
        { url: "http://127.0.0.1" },
        { authorization: "Bearer test-secret-token" },
      );
      assert.equal(res.status, 400);
      assert.equal(res.json.error, "blocked_host");
    });
  });

  await check("POST /capture-components accepts body and returns ok shape", async () => {
    await withTestServer(async (port) => {
      const res = await postJson(
        port,
        "/capture-components",
        { url: "https://example.com" },
        { authorization: "Bearer test-secret-token" },
      );
      assert.equal(res.status, 200);
      assert.equal(res.json.ok, true);
      assert.ok(Array.isArray(res.json.screenshots));
    });
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
