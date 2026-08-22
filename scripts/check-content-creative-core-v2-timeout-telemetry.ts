/**
 * Creative Core v2 — timeout/retry alignment + provider telemetry regression.
 * Offline; uses node:test fake timers (no real 180s waits).
 *
 * Run: npm run check:content-creative-core-v2-timeout-telemetry
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { mock } from "node:test";
import { ClaudeProvider } from "../lib/ai/claude";
import {
  classifyGenerationThrow,
} from "../lib/ai/workflows/generationTerminal";
import {
  classifyProviderTransportError,
  runWithTelemetrySession,
  withTelemetry,
} from "../lib/ai/telemetry";
import type { TextCompletionResult } from "../lib/ai/types";
import {
  CONTENT_PACKAGE_CLAUDE_MAX_TRANSPORT_ATTEMPTS,
  CONTENT_PACKAGE_CLAUDE_TIMEOUT_MS,
} from "../lib/content-pipeline/runContentPackage";
import {
  HTTP_MAX_ATTEMPTS,
  HTTP_TIMEOUT_MS,
  HttpTimeoutError,
  fetchWithRetry,
} from "../lib/http/fetchWithRetry";
import { createCreativeCore, assembleCreativeMemory } from "../lib/content-creative-core-v2";

let passed = 0;
let failed = 0;
const root = process.cwd();

async function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  ✗ ${name}`);
    console.error(err);
  }
}

function readSrc(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

const ANTHROPIC_OK = {
  content: [{ type: "text", text: '{"ok":true}' }],
  model: "claude-sonnet-4-6",
  usage: { input_tokens: 100, output_tokens: 10 },
};

console.log("\nCreative Core v2 — timeout + telemetry regression\n");

await check("exports Content Package Claude timeout/attempt constants", () => {
  assert.equal(CONTENT_PACKAGE_CLAUDE_TIMEOUT_MS, 180_000);
  assert.equal(CONTENT_PACKAGE_CLAUDE_MAX_TRANSPORT_ATTEMPTS, 1);
});

await check("global HTTP_TIMEOUT_MS.ai remains 60_000 (unchanged)", () => {
  assert.equal(HTTP_TIMEOUT_MS.ai, 60_000);
  assert.equal(HTTP_MAX_ATTEMPTS.ai, 3);
});

await check("runPipeline passes Content Package timeout + maxTransportAttempts: 1", () => {
  const src = readSrc("lib/content-creative-core-v2/runPipeline.ts");
  assert.match(src, /CONTENT_PACKAGE_CLAUDE_TIMEOUT_MS/);
  assert.match(src, /CONTENT_PACKAGE_CLAUDE_MAX_TRANSPORT_ATTEMPTS/);
  assert.match(src, /timeoutMs:\s*CONTENT_PACKAGE_CLAUDE_TIMEOUT_MS/);
  assert.match(
    src,
    /maxTransportAttempts:\s*\n?\s*CONTENT_PACKAGE_CLAUDE_MAX_TRANSPORT_ATTEMPTS/,
  );
  assert.doesNotMatch(src, /timeoutMs:\s*60_000/);
  assert.doesNotMatch(src, /maxTransportAttempts:\s*3/);
});

await check("legacy Content Package still uses shared 180s / 1 transport attempt", () => {
  const src = readSrc("lib/content-pipeline/runContentPackage.ts");
  assert.match(src, /timeoutMs:\s*CONTENT_PACKAGE_CLAUDE_TIMEOUT_MS/);
  assert.match(
    src,
    /maxTransportAttempts:\s*CONTENT_PACKAGE_CLAUDE_MAX_TRANSPORT_ATTEMPTS/,
  );
});

await check("Strategy / Opening / Video Concept keep their own budgets", () => {
  const strategy = readSrc("lib/ai/workflows/planContentStrategy.ts");
  assert.match(strategy, /PRODUCTION_STRATEGY_CLAUDE_TIMEOUT_MS\s*=\s*180_000/);
  assert.match(strategy, /maxTransportAttempts:\s*PRODUCTION_STRATEGY_CLAUDE_MAX_TRANSPORT_ATTEMPTS/);

  const opening = readSrc("lib/content-pipeline/runOpeningImpact.ts");
  assert.match(opening, /TIMEOUT_MS\s*=\s*90_000/);
  assert.match(opening, /maxTransportAttempts:\s*1/);

  const concept = readSrc("lib/content-pipeline/runVideoConcept.ts");
  assert.match(concept, /TIMEOUT_MS\s*=\s*120_000/);
  assert.match(concept, /maxTransportAttempts:\s*1/);
});

await check(
  "Claude call with 180s budget survives 65s (not aborted at 60s)",
  async () => {
    mock.timers.enable({ apis: ["setTimeout", "Date"], now: 0 });
    const originalFetch = globalThis.fetch;
    let fetchCalls = 0;
    try {
      globalThis.fetch = (async (_url, init) => {
        fetchCalls += 1;
        const signal = init?.signal;
        return await new Promise<Response>((resolve, reject) => {
          const timer = setTimeout(() => {
            resolve(
              new Response(JSON.stringify(ANTHROPIC_OK), {
                status: 200,
                headers: {
                  "content-type": "application/json",
                  "request-id": "req_after_65s",
                },
              }),
            );
          }, 65_000);
          signal?.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
          });
        });
      }) as typeof fetch;

      process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "test-key";
      const provider = new ClaudeProvider("test-key");
      const pending = provider.complete({
        prompt: "hi",
        json: true,
        timeoutMs: CONTENT_PACKAGE_CLAUDE_TIMEOUT_MS,
        maxTransportAttempts: CONTENT_PACKAGE_CLAUDE_MAX_TRANSPORT_ATTEMPTS,
      });

      mock.timers.tick(65_000);
      const result = await pending;
      assert.equal(fetchCalls, 1);
      assert.equal(result.requestId, "req_after_65s");
      assert.match(result.text, /ok/);
    } finally {
      globalThis.fetch = originalFetch;
      mock.timers.reset();
    }
  },
);

await check(
  "timeout at 180s uses exactly one transport attempt",
  async () => {
    mock.timers.enable({ apis: ["setTimeout", "Date"], now: 0 });
    const originalFetch = globalThis.fetch;
    let fetchCalls = 0;
    try {
      globalThis.fetch = (async (_url, init) => {
        fetchCalls += 1;
        const signal = init?.signal;
        return await new Promise<Response>((_resolve, reject) => {
          signal?.addEventListener("abort", () => {
            reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
          });
        });
      }) as typeof fetch;

      const pending = fetchWithRetry(
        "https://api.anthropic.com/v1/messages",
        { method: "POST", body: "{}" },
        {
          timeoutMs: CONTENT_PACKAGE_CLAUDE_TIMEOUT_MS,
          maxAttempts: CONTENT_PACKAGE_CLAUDE_MAX_TRANSPORT_ATTEMPTS,
          label: "test:ccv2",
        },
      ).then(
        () => ({ ok: true as const }),
        (err: unknown) => ({ ok: false as const, err }),
      );

      mock.timers.tick(CONTENT_PACKAGE_CLAUDE_TIMEOUT_MS);
      // Allow microtasks / abort handlers to settle.
      await Promise.resolve();
      mock.timers.tick(0);
      const outcome = await pending;
      assert.equal(outcome.ok, false);
      assert.ok(outcome.err instanceof HttpTimeoutError);
      assert.equal(fetchCalls, 1);

      // Extra time must not spawn another attempt.
      mock.timers.tick(60_000);
      assert.equal(fetchCalls, 1);
    } finally {
      globalThis.fetch = originalFetch;
      mock.timers.reset();
    }
  },
);

await check(
  "default AI transport still allows up to 3 attempts at 60s budget",
  async () => {
    // Prove defaults unchanged via constants + a short real multi-attempt timeout
    // (no 180s wait). Fake-timer backoff nesting is brittle for this path.
    assert.equal(HTTP_TIMEOUT_MS.ai, 60_000);
    assert.equal(HTTP_MAX_ATTEMPTS.ai, 3);

    const originalFetch = globalThis.fetch;
    let fetchCalls = 0;
    try {
      globalThis.fetch = (async (_url, init) => {
        fetchCalls += 1;
        const signal = init?.signal;
        return await new Promise<Response>((_resolve, reject) => {
          signal?.addEventListener("abort", () => {
            reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
          });
        });
      }) as typeof fetch;

      let err: unknown = null;
      try {
        await fetchWithRetry(
          "https://api.anthropic.com/v1/messages",
          { method: "POST", body: "{}" },
          {
            timeoutMs: 30,
            maxAttempts: HTTP_MAX_ATTEMPTS.ai,
            label: "test:default-ai-short",
          },
        );
      } catch (e) {
        err = e;
      }
      assert.ok(err instanceof HttpTimeoutError);
      assert.equal(fetchCalls, 3);
    } finally {
      globalThis.fetch = originalFetch;
    }
  },
);

await check("timeout telemetry is safe (no prompt / Product Brain)", async () => {
  const { steps } = await runWithTelemetrySession(async () => {
    try {
      await withTelemetry(
        {
          stepName: "Creative Core v2",
          provider: "claude",
          model: "claude-sonnet-4-6",
          maxTokens: 4096,
          timeoutMs: CONTENT_PACKAGE_CLAUDE_TIMEOUT_MS,
          transportAttempt: 1,
          maxTransportAttempts: CONTENT_PACKAGE_CLAUDE_MAX_TRANSPORT_ATTEMPTS,
          inputSummary:
            "Creative Core v2 Claude call:\n- Product Brain (size only)\n- Strategy candidate\n- Creative memory",
          measureInput: {
            model: "claude-sonnet-4-6",
            max_tokens: 4096,
            // size-only stand-in — not a real prompt
            messages: [{ role: "user", content: "x".repeat(100) }],
          },
        },
        async () => {
          throw new HttpTimeoutError(
            "https://api.anthropic.com/v1/messages",
            CONTENT_PACKAGE_CLAUDE_TIMEOUT_MS,
          );
        },
      );
    } catch {
      // expected
    }
  });

  assert.equal(steps.length, 1);
  const step = steps[0]!;
  assert.equal(step.success, false);
  assert.equal(step.outcome, "timeout");
  assert.equal(step.error_type, "HttpTimeoutError");
  assert.equal(step.timeout_ms, 180_000);
  assert.equal(step.transport_attempt, 1);
  assert.equal(step.max_transport_attempts, 1);
  assert.equal(step.provider_request_id, null);
  assert.equal(step.http_status, null);
  const blob = JSON.stringify(step);
  assert.doesNotMatch(blob, /Product Brain contents|secret_api|sk-ant/i);
  assert.doesNotMatch(step.input_summary ?? "", /x{50}/);
  assert.ok((step.input_size_bytes ?? 0) > 0);
});

await check("successful call records duration, model, tokens, request id", async () => {
  const { steps } = await runWithTelemetrySession(async () => {
    return withTelemetry(
      {
        stepName: "Creative Core v2",
        provider: "claude",
        model: "claude-sonnet-4-6",
        maxTokens: 4096,
        timeoutMs: CONTENT_PACKAGE_CLAUDE_TIMEOUT_MS,
        transportAttempt: 1,
        maxTransportAttempts: CONTENT_PACKAGE_CLAUDE_MAX_TRANSPORT_ATTEMPTS,
        inputSummary: "Creative Core v2 Claude call",
        measureInput: { size_only: true },
        usageFromResult: (r: TextCompletionResult) => ({
          prompt_tokens: r.usage?.prompt_tokens ?? null,
          completion_tokens: r.usage?.completion_tokens ?? null,
          cached_tokens: r.usage?.cached_tokens ?? null,
          model: r.model,
        }),
        providerRequestIdFromResult: (r: TextCompletionResult) =>
          typeof r.requestId === "string" ? r.requestId : null,
        measureOutput: (r: TextCompletionResult) => r.text,
      },
      async (): Promise<TextCompletionResult> => ({
        text: '{"core":true}',
        model: "claude-sonnet-4-6",
        provider: "claude",
        requestId: "req_success_1",
        usage: {
          prompt_tokens: 1200,
          completion_tokens: 400,
          cached_tokens: 0,
        },
      }),
    );
  });

  assert.equal(steps.length, 1);
  const step = steps[0]!;
  assert.equal(step.success, true);
  assert.equal(step.outcome, "success");
  assert.equal(step.model, "claude-sonnet-4-6");
  assert.equal(step.prompt_tokens, 1200);
  assert.equal(step.completion_tokens, 400);
  assert.equal(step.provider_request_id, "req_success_1");
  assert.equal(step.timeout_ms, 180_000);
  assert.ok(typeof step.duration_ms === "number");
  assert.ok(step.started_at && step.finished_at);
});

await check("missing provider request id stores null", async () => {
  const { steps } = await runWithTelemetrySession(async () => {
    return withTelemetry(
      {
        stepName: "Creative Core v2",
        provider: "claude",
        providerRequestIdFromResult: (r: TextCompletionResult) =>
          typeof r.requestId === "string" ? r.requestId : null,
      },
      async (): Promise<TextCompletionResult> => ({
        text: "{}",
        model: "claude-sonnet-4-6",
        provider: "claude",
        requestId: null,
      }),
    );
  });
  assert.equal(steps[0]!.provider_request_id, null);
});

await check("HTTP error outcome classification", () => {
  const classified = classifyProviderTransportError(
    new Error("Claude request failed (529): overloaded"),
  );
  assert.equal(classified.outcome, "http_error");
  assert.equal(classified.httpStatus, 529);
});

await check("timeout maps to operational_failure with workflow attempts=1", () => {
  const terminal = classifyGenerationThrow(
    new HttpTimeoutError(
      "https://api.anthropic.com/v1/messages",
      CONTENT_PACKAGE_CLAUDE_TIMEOUT_MS,
    ),
    1,
  );
  assert.equal(terminal.error, "operational_failure");
  assert.equal(terminal.attempts, 1);
  assert.match(terminal.validationErrors[0]!.message, /timed out after 180000/);
});

await check("timeout does not create package; claim release path intact", () => {
  const gen = readSrc("lib/ai/workflows/generateContentPackage.ts");
  assert.match(gen, /releasePackageGenerationClaim/);
  assert.match(gen, /finally\s*\{/);
  assert.match(gen, /finalStatus:\s*"released"/);
  // Persist telemetry on thrown operational failures (timeout) without changing claim rules.
  assert.match(gen, /package_generation_thrown/);
  assert.match(gen, /terminalClassification:\s*"operational_failure"/);
});

await check("idempotent re-run returns existing_package without duplicate create", () => {
  const gen = readSrc("lib/ai/workflows/generateContentPackage.ts");
  assert.match(gen, /claim\.status === "existing_package"/);
  assert.match(gen, /reused:\s*true/);
  const claim = readSrc("lib/production-runtime/packageGenerationClaim.ts");
  assert.match(claim, /existing_package/);
  assert.match(claim, /claim_package_generation/);
});

await check("late aborted response cannot persist — AbortController aborts fetch", () => {
  const http = readSrc("lib/http/fetchWithRetry.ts");
  assert.match(http, /AbortController/);
  assert.match(http, /controller\.abort\(\)/);
  assert.match(http, /HttpTimeoutError/);
  // Package persist happens only after successful creative pipeline — timeout throws first.
  const pipe = readSrc("lib/content-creative-core-v2/runPipeline.ts");
  assert.match(pipe, /provider\.complete\(/);
  assert.match(pipe, /CONTENT_PACKAGE_CLAUDE_TIMEOUT_MS/);
});

await check("createCreativeCore still fails closed on provider throw (no core)", async () => {
  let threw = false;
  try {
    await createCreativeCore({
      context: {
        productBrain: { product_name: "Anon" },
        strategy: {
          topic: "t",
          angle: "a",
          pain_point: "p",
        },
        memory: assembleCreativeMemory([]),
        packageKind: "text_only",
      },
      textProvider: {
        complete: async () => {
          throw new HttpTimeoutError(
            "https://api.anthropic.com/v1/messages",
            CONTENT_PACKAGE_CLAUDE_TIMEOUT_MS,
          );
        },
      },
    });
  } catch (err) {
    threw = true;
    assert.ok(err instanceof HttpTimeoutError);
  }
  assert.equal(threw, true);
});

await check("ClaudeProvider reads request-id header when present", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify(ANTHROPIC_OK), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "request-id": "req_header_only",
        },
      })) as typeof fetch;
    const provider = new ClaudeProvider("test-key");
    const result = await provider.complete({
      prompt: "hi",
      timeoutMs: 5_000,
      maxTransportAttempts: 1,
    });
    assert.equal(result.requestId, "req_header_only");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

await check("ClaudeProvider stores null requestId when header missing", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify(ANTHROPIC_OK), {
        status: 200,
        headers: { "content-type": "application/json" },
      })) as typeof fetch;
    const provider = new ClaudeProvider("test-key");
    const result = await provider.complete({
      prompt: "hi",
      timeoutMs: 5_000,
      maxTransportAttempts: 1,
    });
    assert.equal(result.requestId, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ---------------------------------------------------------------------------
// Local dry-run: strategy item → CCv2 provider call → validate → persist gate
// ---------------------------------------------------------------------------

console.log("\nLocal dry-run simulations\n");

type DryPersist = { packages: number; claim: "held" | "released" };

async function dryRunPackagePath(args: {
  label: string;
  complete: () => Promise<TextCompletionResult>;
}): Promise<{
  terminal: ReturnType<typeof classifyGenerationThrow> | { ok: true };
  persist: DryPersist;
  steps: Awaited<ReturnType<typeof runWithTelemetrySession>>["steps"];
}> {
  const persist: DryPersist = { packages: 0, claim: "held" };
  const session = await runWithTelemetrySession(async () => {
    try {
      const result = await withTelemetry(
        {
          stepName: "Creative Core v2",
          provider: "claude",
          model: "claude-sonnet-4-6",
          maxTokens: 4096,
          timeoutMs: CONTENT_PACKAGE_CLAUDE_TIMEOUT_MS,
          transportAttempt: 1,
          maxTransportAttempts: CONTENT_PACKAGE_CLAUDE_MAX_TRANSPORT_ATTEMPTS,
          inputSummary: "dry-run Creative Core v2",
          measureInput: { dry: true },
          usageFromResult: (r: TextCompletionResult) => ({
            prompt_tokens: r.usage?.prompt_tokens ?? null,
            completion_tokens: r.usage?.completion_tokens ?? null,
            cached_tokens: r.usage?.cached_tokens ?? null,
            model: r.model,
          }),
          providerRequestIdFromResult: (r: TextCompletionResult) =>
            typeof r.requestId === "string" ? r.requestId : null,
        },
        args.complete,
      );
      // Validation gate (simplified): JSON must parse.
      JSON.parse(result.text);
      // Persistence gate only after successful provider + parse.
      persist.packages += 1;
      return { ok: true as const, result };
    } catch (err) {
      // Abort/timeout → no persist; claim released in finally of real workflow.
      return { ok: false as const, err };
    } finally {
      persist.claim = "released";
    }
  });

  if (session.result.ok) {
    return { terminal: { ok: true }, persist, steps: session.steps };
  }
  return {
    terminal: classifyGenerationThrow(session.result.err, 1),
    persist,
    steps: session.steps,
  };
}

await check("dry-run: success after >60s equivalent (65s fake) persists once", async () => {
  mock.timers.enable({ apis: ["setTimeout", "Date"], now: 0 });
  try {
    const pending = dryRunPackagePath({
      label: "success-65s",
      complete: async () => {
        await new Promise((r) => setTimeout(r, 65_000));
        return {
          text: '{"ok":true}',
          model: "claude-sonnet-4-6",
          provider: "claude",
          requestId: "dry_req_65",
          usage: {
            prompt_tokens: 50,
            completion_tokens: 5,
            cached_tokens: 0,
          },
        };
      },
    });
    mock.timers.tick(65_000);
    const out = await pending;
    assert.deepEqual(out.terminal, { ok: true });
    assert.equal(out.persist.packages, 1);
    assert.equal(out.persist.claim, "released");
    assert.equal(out.steps[0]!.outcome, "success");
    assert.equal(out.steps[0]!.provider_request_id, "dry_req_65");
  } finally {
    mock.timers.reset();
  }
});

await check("dry-run: timeout after 180s → operational_failure, no package", async () => {
  mock.timers.enable({ apis: ["setTimeout", "Date"], now: 0 });
  try {
    const pending = dryRunPackagePath({
      label: "timeout-180s",
      complete: async () => {
        await new Promise((_, reject) => {
          setTimeout(() => {
            reject(
              new HttpTimeoutError(
                "https://api.anthropic.com/v1/messages",
                CONTENT_PACKAGE_CLAUDE_TIMEOUT_MS,
              ),
            );
          }, CONTENT_PACKAGE_CLAUDE_TIMEOUT_MS);
        });
        return {
          text: "",
          model: "claude-sonnet-4-6",
          provider: "claude",
        };
      },
    });
    mock.timers.tick(CONTENT_PACKAGE_CLAUDE_TIMEOUT_MS);
    const out = await pending;
    assert.equal(out.terminal.ok, false);
    if (out.terminal.ok) return;
    assert.equal(out.terminal.error, "operational_failure");
    assert.equal(out.terminal.attempts, 1);
    assert.equal(out.persist.packages, 0);
    assert.equal(out.persist.claim, "released");
    assert.equal(out.steps[0]!.outcome, "timeout");
    assert.equal(out.steps[0]!.provider_request_id, null);
  } finally {
    mock.timers.reset();
  }
});

await check("dry-run: provider HTTP error → no package, claim released", async () => {
  const out = await dryRunPackagePath({
    label: "http-529",
    complete: async () => {
      throw new Error("Claude request failed (529): overloaded");
    },
  });
  assert.equal(out.terminal.ok, false);
  if (out.terminal.ok) return;
  assert.equal(out.terminal.error, "operational_failure");
  assert.equal(out.persist.packages, 0);
  assert.equal(out.persist.claim, "released");
  assert.equal(out.steps[0]!.outcome, "http_error");
  assert.equal(out.steps[0]!.http_status, 529);
});

await check("dry-run: missing request id stays null on success", async () => {
  const out = await dryRunPackagePath({
    label: "no-request-id",
    complete: async () => ({
      text: '{"ok":true}',
      model: "claude-sonnet-4-6",
      provider: "claude",
      requestId: null,
      usage: { prompt_tokens: 1, completion_tokens: 1, cached_tokens: null },
    }),
  });
  assert.deepEqual(out.terminal, { ok: true });
  assert.equal(out.persist.packages, 1);
  assert.equal(out.steps[0]!.provider_request_id, null);
});

await check("dry-run: idempotent second job does not double-persist", async () => {
  let existingPackage = false;
  const runOnce = async () => {
    if (existingPackage) {
      return { packagesCreated: 0, reused: true };
    }
    const out = await dryRunPackagePath({
      label: "idempotent",
      complete: async () => ({
        text: '{"ok":true}',
        model: "claude-sonnet-4-6",
        provider: "claude",
        requestId: "idem_1",
      }),
    });
    if (out.persist.packages === 1) existingPackage = true;
    return { packagesCreated: out.persist.packages, reused: false };
  };
  const first = await runOnce();
  const second = await runOnce();
  assert.equal(first.packagesCreated, 1);
  assert.equal(second.packagesCreated, 0);
  assert.equal(second.reused, true);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
