/**
 * Pipeline telemetry unit checks — no network.
 * Usage: npm run check:pipeline-telemetry
 */

import assert from "node:assert/strict";
import {
  buildGenerationTelemetryDocument,
  estimateTokenCostUsd,
  extractProviderUsage,
  formatAiCostTable,
  formatExecutionTimeTable,
  formatPackageGenerationBreakdown,
  formatTechnicalAuditTelemetrySection,
  PIPELINE_TELEMETRY_VERSION,
  readTelemetrySteps,
  runWithTelemetrySession,
  withTelemetry,
  withTelemetrySync,
  type PipelineTelemetryStep,
} from "@/lib/ai/telemetry";

let passed = 0;
function check(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed += 1;
      console.log(`ok — ${name}`);
    })
    .catch((err) => {
      console.error(`FAIL — ${name}`);
      throw err;
    });
}

await check("withTelemetry is passthrough without collector", async () => {
  const result = await withTelemetry(
    { stepName: "x", provider: "deterministic" },
    async () => 42,
  );
  assert.equal(result, 42);
});

await check("withTelemetry records success + duration", async () => {
  const { result, steps } = await runWithTelemetrySession(async () => {
    return withTelemetry(
      {
        stepName: "Creative Candidates",
        provider: "deterministic",
        inputSummary: "inputs",
        outputSummary: (n: number) => `n=${n}`,
        measureInput: "abc",
        measureOutput: (n) => ({ n }),
      },
      async () => {
        await new Promise((r) => setTimeout(r, 5));
        return 7;
      },
    );
  });
  assert.equal(result, 7);
  assert.equal(steps.length, 1);
  assert.equal(steps[0]!.step_name, "Creative Candidates");
  assert.equal(steps[0]!.success, true);
  assert.ok(steps[0]!.duration_ms >= 5);
  assert.equal(steps[0]!.input_summary, "inputs");
  assert.equal(steps[0]!.output_summary, "n=7");
  assert.ok((steps[0]!.input_size_bytes ?? 0) > 0);
});

await check("withTelemetry records failure and rethrows", async () => {
  let threw = false;
  const { steps } = await runWithTelemetrySession(async () => {
    try {
      await withTelemetry(
        { stepName: "Boom", provider: "claude" },
        async () => {
          throw new Error("nope");
        },
      );
    } catch (e) {
      threw = true;
      assert.equal((e as Error).message, "nope");
    }
  });
  assert.equal(threw, true);
  assert.equal(steps.length, 1);
  assert.equal(steps[0]!.success, false);
  assert.equal(steps[0]!.error_message, "nope");
});

await check("withTelemetrySync works for deterministic steps", async () => {
  const { steps } = await runWithTelemetrySession(async () => {
    return withTelemetrySync(
      { stepName: "Narrative Beats", provider: "deterministic" },
      () => ["HOOK", "SETUP"],
    );
  });
  assert.equal(steps[0]!.step_name, "Narrative Beats");
  assert.deepEqual(
    // measureOutput not set — still success
    steps[0]!.success,
    true,
  );
});

await check("soft failure via successFromResult", async () => {
  const { steps } = await runWithTelemetrySession(async () => {
    return withTelemetry(
      {
        stepName: "Presentation Generation",
        provider: "claude",
        successFromResult: (r: { ok: boolean }) => r.ok,
        errorMessageFromResult: (r: { ok: boolean }) =>
          r.ok ? null : "generation_failed",
      },
      async () => ({ ok: false as const }),
    );
  });
  assert.equal(steps[0]!.success, false);
  assert.equal(steps[0]!.error_message, "generation_failed");
});

await check("extractProviderUsage anthropic + openai", () => {
  const a = extractProviderUsage({
    model: "claude-sonnet-4-6",
    usage: {
      input_tokens: 100,
      output_tokens: 50,
      cache_read_input_tokens: 10,
    },
  });
  assert.equal(a.prompt_tokens, 100);
  assert.equal(a.completion_tokens, 50);
  assert.equal(a.cached_tokens, 10);

  const o = extractProviderUsage({
    model: "gpt-4o-mini",
    usage: {
      prompt_tokens: 20,
      completion_tokens: 5,
      prompt_tokens_details: { cached_tokens: 2 },
    },
  });
  assert.equal(o.prompt_tokens, 20);
  assert.equal(o.cached_tokens, 2);
});

await check("estimateTokenCostUsd returns number for known models", () => {
  const cost = estimateTokenCostUsd({
    provider: "claude",
    model: "claude-sonnet-4-6",
    promptTokens: 1_000_000,
    completionTokens: 0,
  });
  assert.equal(cost, 3);
});

await check("buildGenerationTelemetryDocument preserves legacy phases", () => {
  const doc = buildGenerationTelemetryDocument({
    legacy: {
      phases: [{ phase: "fidelity_repair", latency_ms: 12 }],
      full_package_generations: 1,
    },
    steps: [],
  });
  assert.equal(doc.version, PIPELINE_TELEMETRY_VERSION);
  assert.equal(doc.full_package_generations, 1);
  assert.equal(doc.phases.length, 1);
  assert.deepEqual(doc.steps, []);
});

await check("audit formatters render nested breakdown", () => {
  const steps: PipelineTelemetryStep[] = [
    {
      step_name: "Creative Candidates",
      provider: "deterministic",
      model: null,
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
      duration_ms: 11800,
      success: true,
      retry_count: 0,
      repair: false,
      input_size_bytes: 100,
      output_size_bytes: 50,
      prompt_characters: 100,
      completion_characters: 50,
      prompt_tokens: null,
      completion_tokens: null,
      cached_tokens: null,
      estimated_cost: null,
      temperature: null,
      max_tokens: null,
      response_format: null,
      warnings: [],
      error_message: null,
      input_summary: "x",
      output_summary: "y",
    },
    {
      step_name: "Presentation Generation",
      provider: "claude",
      model: "claude-sonnet-4-6",
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
      duration_ms: 24600,
      success: true,
      retry_count: 0,
      repair: false,
      input_size_bytes: 20480,
      output_size_bytes: 8192,
      prompt_characters: 20000,
      completion_characters: 8000,
      prompt_tokens: 5000,
      completion_tokens: 2000,
      cached_tokens: 0,
      estimated_cost: 0.045,
      temperature: 0.7,
      max_tokens: 8192,
      response_format: "json",
      warnings: [],
      error_message: null,
      input_summary: "in",
      output_summary: "out",
    },
  ];
  const breakdown = formatPackageGenerationBreakdown({
    totalDurationMs: 132000,
    steps,
  });
  assert.match(breakdown, /Package generation/);
  assert.match(breakdown, /Creative Candidates/);
  assert.match(breakdown, /Presentation Generation/);
  assert.match(formatExecutionTimeTable(steps), /Duration/);
  assert.match(formatAiCostTable(steps), /Estimated/);
  assert.match(
    formatTechnicalAuditTelemetrySection({
      totalDurationMs: 132000,
      steps,
    }),
    /Providers/,
  );
  assert.equal(readTelemetrySteps({ steps }).length, 2);
  assert.equal(readTelemetrySteps(null).length, 0);
});

await check("nested sessions reuse outer collector", async () => {
  const { steps } = await runWithTelemetrySession(async () => {
    await withTelemetry({ stepName: "A" }, async () => 1);
    await runWithTelemetrySession(async () => {
      await withTelemetry({ stepName: "B" }, async () => 2);
    });
  });
  assert.deepEqual(
    steps.map((s) => s.step_name),
    ["A", "B"],
  );
});

console.log(`\n${passed} checks passed`);
