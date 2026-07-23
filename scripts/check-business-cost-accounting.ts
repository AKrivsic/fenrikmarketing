/**
 * Business Cost Accounting P0/P1 checks — no network.
 * Usage: npm run check:business-cost-accounting
 */

import {
  estimateImageCostUsd,
  estimateTtsCostUsd,
  estimateWhisperCostUsd,
  estimateTokenCostUsd,
  packageCostFromBrief,
  videoJobCostFromOutput,
  PRICING_VERSION,
  buildGenerationTelemetryDocument,
  supersedeGenerationTelemetry,
  sumEstimatedCostUsd,
  flattenTelemetryStepsWithHistory,
} from "@/lib/ai/telemetry";
import {
  mergeRunTelemetrySteps,
  rollupPackageCost,
} from "@/lib/production-runs/aggregateRunTelemetry";
import type { PipelineTelemetryStep } from "@/lib/ai/telemetry/types";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

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

function step(
  partial: Partial<PipelineTelemetryStep> &
    Pick<PipelineTelemetryStep, "step_name" | "started_at" | "duration_ms">,
): PipelineTelemetryStep {
  return {
    provider: partial.provider ?? "claude",
    model: partial.model ?? "claude-sonnet-4-6",
    finished_at: partial.finished_at ?? partial.started_at,
    success: partial.success ?? true,
    retry_count: partial.retry_count ?? 0,
    repair: partial.repair ?? false,
    input_size_bytes: null,
    output_size_bytes: null,
    prompt_characters: null,
    completion_characters: null,
    prompt_tokens: partial.prompt_tokens ?? null,
    completion_tokens: partial.completion_tokens ?? null,
    cached_tokens: partial.cached_tokens ?? null,
    estimated_cost: partial.estimated_cost ?? null,
    pricing_version: partial.pricing_version ?? PRICING_VERSION,
    raw_usage: partial.raw_usage ?? null,
    provider_request_id: partial.provider_request_id ?? null,
    temperature: null,
    max_tokens: null,
    response_format: null,
    warnings: [],
    error_message: null,
    input_summary: null,
    output_summary: null,
    ...partial,
  };
}

await check("migration 027 adds generation_telemetry column", () => {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/027_business_cost_accounting.sql"),
    "utf8",
  );
  assert.match(sql, /generation_telemetry jsonb/);
  assert.match(sql, /add column if not exists/);
});

await check("completed package rollup sums AI + media", () => {
  const brief = {
    presentation_generation: {
      generation_telemetry: buildGenerationTelemetryDocument({
        steps: [
          step({
            step_name: "Presentation Generation",
            started_at: "2026-01-01T00:00:00Z",
            duration_ms: 1,
            estimated_cost: 0.1,
          }),
        ],
      }),
    },
  };
  const videoOutput = {
    debug: {
      generation_telemetry: {
        steps: [
          step({
            step_name: "Image generation",
            provider: "image",
            started_at: "2026-01-01T00:01:00Z",
            duration_ms: 1,
            estimated_cost: estimateImageCostUsd(4),
          }),
          step({
            step_name: "TTS",
            provider: "tts",
            started_at: "2026-01-01T00:02:00Z",
            duration_ms: 1,
            estimated_cost: estimateTtsCostUsd(2000),
          }),
          step({
            step_name: "Whisper",
            provider: "whisper",
            started_at: "2026-01-01T00:03:00Z",
            duration_ms: 1,
            estimated_cost: estimateWhisperCostUsd(30),
          }),
        ],
      },
    },
  };
  const rollup = rollupPackageCost({
    packageBrief: brief,
    videoJobOutputs: [videoOutput],
  });
  const expected =
    0.1 +
    (estimateImageCostUsd(4) ?? 0) +
    (estimateTtsCostUsd(2000) ?? 0) +
    (estimateWhisperCostUsd(30) ?? 0);
  assert.ok(Math.abs((rollup.estimatedCostUsd ?? 0) - expected) < 0.0001);
});

await check("failed package cost preserved via failure docs", () => {
  const view = mergeRunTelemetrySteps({
    productionRunId: "run-1",
    totalRunDurationMs: null,
    strategyDocs: [],
    packageDocs: [],
    videoJobDocs: [],
    failureDocs: [
      {
        strategyId: "si-1",
        generationTelemetry: {
          production_run_id: "run-1",
          steps: [
            step({
              step_name: "Creative Ideation",
              started_at: "2026-01-01T00:00:00Z",
              duration_ms: 1,
              estimated_cost: 0.25,
              success: false,
            }),
          ],
        },
      },
    ],
  });
  assert.equal(view.summary.estimatedAiCostUsd, 0.25);
  assert.equal(view.steps[0]!.source, "failure");
});

await check("regenerate preserves historical cost in history[]", () => {
  const original = buildGenerationTelemetryDocument({
    steps: [
      step({
        step_name: "Presentation Generation",
        started_at: "2026-01-01T00:00:00Z",
        duration_ms: 1,
        estimated_cost: 0.12,
      }),
    ],
  });
  const regenerated = supersedeGenerationTelemetry({
    previous: original,
    nextSteps: [
      step({
        step_name: "Presentation Generation",
        started_at: "2026-01-02T00:00:00Z",
        duration_ms: 1,
        estimated_cost: 0.15,
      }),
    ],
    reason: "regenerate",
  });
  const lifetime = flattenTelemetryStepsWithHistory(regenerated);
  assert.equal(lifetime.length, 2);
  assert.ok(
    Math.abs((sumEstimatedCostUsd(lifetime) ?? 0) - 0.27) < 0.0001,
  );
  // Live brief current cost is only the latest session.
  assert.equal(regenerated.steps.length, 1);
  assert.equal(regenerated.steps[0]!.estimated_cost, 0.15);
});

await check("retries do not duplicate within a step; multiple jobs sum", () => {
  const view = mergeRunTelemetrySteps({
    productionRunId: "run-1",
    totalRunDurationMs: null,
    strategyDocs: [],
    packageDocs: [],
    videoJobDocs: [
      {
        videoJobId: "j1",
        packageId: "p1",
        generationTelemetry: {
          steps: [
            step({
              step_name: "TTS",
              provider: "tts",
              started_at: "2026-01-01T00:00:00Z",
              duration_ms: 1,
              estimated_cost: 0.01,
              retry_count: 2,
            }),
          ],
        },
      },
      {
        videoJobId: "j2",
        packageId: "p1",
        generationTelemetry: {
          steps: [
            step({
              step_name: "TTS",
              provider: "tts",
              started_at: "2026-01-01T00:01:00Z",
              duration_ms: 1,
              estimated_cost: 0.01,
            }),
          ],
        },
      },
    ],
  });
  assert.equal(view.summary.estimatedAiCostUsd, 0.02);
  assert.equal(view.summary.retryCount, 2);
});

await check("JSON repair recorded as separate step when collector active", async () => {
  // Structural check: repair wrapper exists and primary path does not absorb repair usage.
  const src = readFileSync(
    join(process.cwd(), "lib/ai/runWithRepair.ts"),
    "utf8",
  );
  assert.match(src, /stepName: "JSON Repair"/);
  assert.match(src, /addPrimaryUsage/);
  assert.doesNotMatch(src, /addUsage\(repaired\.usage\)/);
});

await check("worker media paths set estimatedCostFromResult", () => {
  for (const file of [
    "video-worker/services/images.ts",
    "video-worker/services/tts.ts",
    "video-worker/services/wordTimestamps.ts",
  ]) {
    const src = readFileSync(join(process.cwd(), file), "utf8");
    assert.match(src, /estimatedCostFromResult/);
    assert.match(src, /PRICING_VERSION/);
  }
});

await check("token cost stays stable when stored (historical)", () => {
  const stored = 0.045;
  // Re-reading stored estimated_cost must not reprice — rollups use stored value.
  const rollup = packageCostFromBrief({
    presentation_generation: {
      generation_telemetry: {
        steps: [
          step({
            step_name: "Presentation Generation",
            started_at: "2026-01-01T00:00:00Z",
            duration_ms: 1,
            estimated_cost: stored,
            prompt_tokens: 1_000_000,
          }),
        ],
      },
    },
  });
  assert.equal(rollup.estimatedCostUsd, stored);
});

await check("historical immutability: rollups ignore current rate tables", () => {
  // Package A was priced under an old (or arbitrary) rate — stored forever.
  const packageAStored = 1.234567;
  const briefA = {
    presentation_generation: {
      generation_telemetry: {
        pricing_version: "list-price@ancient",
        steps: [
          step({
            step_name: "Presentation Generation",
            started_at: "2026-01-01T00:00:00Z",
            duration_ms: 1,
            estimated_cost: packageAStored,
            prompt_tokens: 1_000_000,
            pricing_version: "list-price@ancient",
          }),
        ],
      },
    },
  };
  const videoA = {
    debug: {
      generation_telemetry: {
        steps: [
          step({
            step_name: "Image generation",
            provider: "image",
            started_at: "2026-01-01T00:01:00Z",
            duration_ms: 1,
            estimated_cost: 0.5,
            pricing_version: "list-price@ancient",
          }),
        ],
      },
    },
  };

  const beforePkg = packageCostFromBrief(briefA).estimatedCostUsd;
  const beforeVideo = videoJobCostFromOutput(videoA).estimatedCostUsd;
  const beforeRun = mergeRunTelemetrySteps({
    productionRunId: "run-hist",
    totalRunDurationMs: null,
    strategyDocs: [],
    packageDocs: [
      {
        packageId: "pkg-a",
        generationTelemetry: briefA.presentation_generation.generation_telemetry,
      },
    ],
    videoJobDocs: [
      {
        videoJobId: "vj-a",
        packageId: "pkg-a",
        generationTelemetry: videoA.debug.generation_telemetry,
      },
    ],
  }).summary.estimatedAiCostUsd;

  // "Change pricing" for newly written content — current helpers use today's rates.
  const packageBWriteTime = estimateTokenCostUsd({
    provider: "claude",
    model: "claude-sonnet-4-6",
    promptTokens: 1_000_000,
    completionTokens: 0,
  });
  assert.equal(packageBWriteTime, 3); // current table
  assert.notEqual(packageBWriteTime, packageAStored);

  // Historical reports after the rate-table world has moved on:
  assert.equal(packageCostFromBrief(briefA).estimatedCostUsd, beforePkg);
  assert.equal(videoJobCostFromOutput(videoA).estimatedCostUsd, beforeVideo);
  assert.equal(
    mergeRunTelemetrySteps({
      productionRunId: "run-hist",
      totalRunDurationMs: null,
      strategyDocs: [],
      packageDocs: [
        {
          packageId: "pkg-a",
          generationTelemetry:
            briefA.presentation_generation.generation_telemetry,
        },
      ],
      videoJobDocs: [
        {
          videoJobId: "vj-a",
          packageId: "pkg-a",
          generationTelemetry: videoA.debug.generation_telemetry,
        },
      ],
    }).summary.estimatedAiCostUsd,
    beforeRun,
  );
  assert.equal(beforePkg, packageAStored);
  assert.equal(beforeVideo, 0.5);
  assert.ok(Math.abs((beforeRun ?? 0) - (packageAStored + 0.5)) < 0.000001);
});

await check("rollup modules never import estimate* helpers", () => {
  for (const file of [
    "lib/ai/telemetry/costRollup.ts",
    "lib/production-runs/aggregateRunTelemetry.ts",
    "lib/api/run-telemetry-admin.ts",
    "lib/ai/telemetry/formatAudit.ts",
  ]) {
    const src = readFileSync(join(process.cwd(), file), "utf8");
    // Comments may mention helpers; enforce no executable imports/calls.
    assert.doesNotMatch(
      src,
      /import\s*\{[^}]*estimate(Token|Image|Tts|Whisper)CostUsd/,
    );
    assert.doesNotMatch(src, /estimate(Token|Image|Tts|Whisper)CostUsd\s*\(/);
    assert.doesNotMatch(
      src,
      /import\s*\{[^}]*(IMAGE_USD_PER_STILL|TTS_USD_PER_1K_CHARS|WHISPER_USD_PER_MIN)/,
    );
  }
  // costRollup may import PRICING_VERSION for NEW supersede writes only —
  // that must not be used to reprice stored estimated_cost on read.
  const rollupSrc = readFileSync(
    join(process.cwd(), "lib/ai/telemetry/costRollup.ts"),
    "utf8",
  );
  assert.match(rollupSrc, /stored estimated_cost/);
  assert.match(rollupSrc, /PRICING_VERSION/);
});

await check("offline cost-trace does not reprice null media with list rates", () => {
  const src = readFileSync(
    join(process.cwd(), "scripts/generate-cost-trace-c8dd3caf.ts"),
    "utf8",
  );
  assert.doesNotMatch(src, /IMAGE_USD_PER_STILL/);
  assert.match(src, /do not reprice/);
});

console.log(`\n${passed} checks passed`);
