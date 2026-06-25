// Fenrik ↔ component capture worker integration (mocked fetch).
//   npm run check:component-capture-integration

import assert from "node:assert/strict";
import {
  assetLibraryHasTier1ProductVisual,
  isComponentCaptureEnabled,
  parseComponentCaptureWorkerJson,
  requestComponentCapture,
  COMPONENT_CAPTURE_MAX_RESPONSE_BYTES,
} from "@/lib/knowledge/componentCaptureClient";
import { validatePublicHttpUrl } from "@/lib/knowledge/publicHttpUrl";
import type { Json } from "@/lib/supabase/types";

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
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  FAIL ${name}`);
      console.error(`       ${message}`);
    });
}

const PNG_1X1_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function withEnv(
  vars: Record<string, string | undefined>,
  fn: () => Promise<void>,
): Promise<void> {
  const prev: Record<string, string | undefined> = {};
  for (const key of Object.keys(vars)) {
    prev[key] = process.env[key];
    const value = vars[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    await fn();
  } finally {
    for (const key of Object.keys(vars)) {
      const value = prev[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

async function main(): Promise<void> {
  await check("disabled when ENABLE_COMPONENT_CAPTURE is not true", async () => {
    await withEnv({ ENABLE_COMPONENT_CAPTURE: undefined }, async () => {
      assert.equal(isComponentCaptureEnabled(), false);
      const r = await requestComponentCapture({ url: "https://example.com" });
      assert.equal(r.error, "disabled");
    });
  });

  await check("blocks localhost before fetch", async () => {
    await withEnv(
      {
        ENABLE_COMPONENT_CAPTURE: "true",
        COMPONENT_CAPTURE_WORKER_URL: "https://worker.example.com",
        COMPONENT_CAPTURE_SECRET: "secret",
      },
      async () => {
        let called = false;
        const r = await requestComponentCapture(
          { url: "http://localhost/site" },
          {
            fetchImpl: async () => {
              called = true;
              return new Response("{}");
            },
          },
        );
        assert.equal(called, false);
        assert.equal(r.error, "blocked_host");
      },
    );
  });

  await check("mock worker response is parsed", () => {
    const parsed = parseComponentCaptureWorkerJson({
      ok: true,
      screenshots: [
        {
          label: "Phone mockup",
          roleHint: "product_ui",
          width: 390,
          height: 844,
          selectorHint: "section.hero",
          imageBase64: PNG_1X1_BASE64,
        },
      ],
    });
    assert.equal(parsed.ok, true);
    assert.equal(parsed.screenshots?.length, 1);
    assert.equal(parsed.screenshots?.[0]?.label, "Phone mockup");
  });

  await check("mock fetch integration success", async () => {
    await withEnv(
      {
        ENABLE_COMPONENT_CAPTURE: "true",
        COMPONENT_CAPTURE_WORKER_URL: "https://worker.example.com",
        COMPONENT_CAPTURE_SECRET: "secret",
      },
      async () => {
        const r = await requestComponentCapture(
          { url: "https://habitoftheday.com" },
          {
            fetchImpl: async (_url, init) => {
              assert.ok(init?.headers);
              const auth = (init.headers as Record<string, string>).authorization;
              assert.equal(auth, "Bearer secret");
              return new Response(
                JSON.stringify({
                  ok: true,
                  screenshots: [
                    {
                      label: "App screen",
                      roleHint: "product_ui",
                      width: 400,
                      height: 800,
                      imageBase64: PNG_1X1_BASE64,
                    },
                  ],
                }),
                { status: 200, headers: { "content-type": "application/json" } },
              );
            },
          },
        );
        assert.equal(r.ok, true);
        assert.equal(r.screenshots?.length, 1);
      },
    );
  });

  await check("timeout / failure from fetch", async () => {
    await withEnv(
      {
        ENABLE_COMPONENT_CAPTURE: "true",
        COMPONENT_CAPTURE_WORKER_URL: "https://worker.example.com",
        COMPONENT_CAPTURE_SECRET: "secret",
      },
      async () => {
        const r = await requestComponentCapture(
          { url: "https://example.com" },
          {
            fetchImpl: async () => {
              throw new Error("network down");
            },
          },
        );
        assert.equal(r.ok, false);
        assert.equal(r.error, "network down");
      },
    );
  });

  await check("response too large is rejected", async () => {
    await withEnv(
      {
        ENABLE_COMPONENT_CAPTURE: "true",
        COMPONENT_CAPTURE_WORKER_URL: "https://worker.example.com",
        COMPONENT_CAPTURE_SECRET: "secret",
      },
      async () => {
        const r = await requestComponentCapture(
          { url: "https://example.com" },
          {
            fetchImpl: async () =>
              new Response(new Uint8Array(COMPONENT_CAPTURE_MAX_RESPONSE_BYTES + 1)),
          },
        );
        assert.equal(r.error, "response_too_large");
      },
    );
  });

  await check("tier1 library skips worker call", async () => {
    const hasTier1 = assetLibraryHasTier1ProductVisual([
      {
        metadata: {
          product_role: "product_ui",
        } as Json,
      },
    ]);
    assert.equal(hasTier1, true);
    const onlyLogo = assetLibraryHasTier1ProductVisual([
      { metadata: { product_role: "logo" } as Json },
    ]);
    assert.equal(onlyLogo, false);
  });

  await check("validatePublicHttpUrl shared with worker rules", () => {
    assert.equal(validatePublicHttpUrl("https://www.habitoftheday.com/").ok, true);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
