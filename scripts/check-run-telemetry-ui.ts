/**
 * Run telemetry aggregation checks — no network.
 * Usage: npm run check:run-telemetry-ui
 */

import assert from "node:assert/strict";
import type { PipelineTelemetryStep } from "@/lib/ai/telemetry/types";
import {
  buildRunTelemetrySummary,
  filterStepsForProductionRun,
  isVideoPipelineStep,
  mergeRunTelemetrySteps,
  sortTelemetryStepsChronologically,
  type RunTelemetryStepView,
} from "@/lib/production-runs/aggregateRunTelemetry";

let passed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`ok — ${name}`);
  } catch (err) {
    console.error(`FAIL — ${name}`);
    throw err;
  }
}

function step(
  partial: Partial<PipelineTelemetryStep> &
    Pick<PipelineTelemetryStep, "step_name" | "started_at" | "duration_ms">,
): PipelineTelemetryStep {
  return {
    provider: partial.provider ?? "deterministic",
    model: partial.model ?? null,
    finished_at: partial.finished_at ?? partial.started_at,
    success: partial.success ?? true,
    retry_count: partial.retry_count ?? 0,
    repair: partial.repair ?? false,
    input_size_bytes: partial.input_size_bytes ?? null,
    output_size_bytes: partial.output_size_bytes ?? null,
    prompt_characters: partial.prompt_characters ?? null,
    completion_characters: partial.completion_characters ?? null,
    prompt_tokens: partial.prompt_tokens ?? null,
    completion_tokens: partial.completion_tokens ?? null,
    cached_tokens: partial.cached_tokens ?? null,
    estimated_cost: partial.estimated_cost ?? null,
    temperature: partial.temperature ?? null,
    max_tokens: partial.max_tokens ?? null,
    response_format: partial.response_format ?? null,
    warnings: partial.warnings ?? [],
    error_message: partial.error_message ?? null,
    input_summary: partial.input_summary ?? null,
    output_summary: partial.output_summary ?? null,
    ...partial,
  };
}

check("empty historical run → hasDetailedSteps false", () => {
  const view = mergeRunTelemetrySteps({
    productionRunId: "run-1",
    totalRunDurationMs: 500_000,
    strategyDocs: [],
    packageDocs: [],
    videoJobDocs: [],
  });
  assert.equal(view.summary.hasDetailedSteps, false);
  assert.equal(view.summary.stepCount, 0);
  assert.equal(view.summary.totalRunDurationMs, 500_000);
  assert.equal(view.summary.estimatedAiCostUsd, null);
});

check("chronological ordering across sources", () => {
  const view = mergeRunTelemetrySteps({
    productionRunId: "run-1",
    totalRunDurationMs: null,
    strategyDocs: [
      {
        strategyId: "s1",
        generationTelemetry: {
          production_run_id: "run-1",
          steps: [
            step({
              step_name: "Weekly Strategy",
              provider: "claude",
              started_at: "2026-07-20T18:05:40.000Z",
              duration_ms: 18200,
              estimated_cost: 0.01,
              prompt_tokens: 1000,
              completion_tokens: 200,
            }),
          ],
        },
      },
    ],
    packageDocs: [
      {
        packageId: "p1",
        generationTelemetry: {
          production_run_id: "run-1",
          steps: [
            step({
              step_name: "Creative Candidates",
              provider: "deterministic",
              started_at: "2026-07-20T18:05:50.000Z",
              duration_ms: 11800,
            }),
            step({
              step_name: "Concept Fidelity Repair",
              provider: "claude",
              started_at: "2026-07-20T18:06:20.000Z",
              duration_ms: 5000,
              repair: true,
              retry_count: 1,
              success: true,
              estimated_cost: 0.02,
            }),
            step({
              step_name: "Presentation Generation",
              provider: "claude",
              started_at: "2026-07-20T18:06:00.000Z",
              duration_ms: 24600,
              estimated_cost: 0.05,
            }),
          ],
        },
      },
      {
        packageId: "p2",
        generationTelemetry: {
          production_run_id: "run-1",
          steps: [
            step({
              step_name: "Creative Candidates",
              provider: "deterministic",
              started_at: "2026-07-20T18:07:00.000Z",
              duration_ms: 9000,
            }),
          ],
        },
      },
    ],
    videoJobDocs: [
      {
        videoJobId: "vj1",
        packageId: "p1",
        generationTelemetry: {
          production_run_id: "run-1",
          steps: [
            step({
              step_name: "TTS",
              provider: "tts",
              started_at: "2026-07-20T18:08:10.000Z",
              duration_ms: 6400,
            }),
            step({
              step_name: "Image generation",
              provider: "image",
              started_at: "2026-07-20T18:08:20.000Z",
              duration_ms: 71500,
              success: false,
              error_message: "moderation",
            }),
            step({
              step_name: "Video rendering",
              provider: "video",
              started_at: "2026-07-20T18:09:40.000Z",
              duration_ms: 390600,
            }),
          ],
        },
      },
    ],
  });

  assert.equal(view.steps.length, 8);
  assert.deepEqual(
    view.steps.map((s) => s.step_name),
    [
      "Weekly Strategy",
      "Creative Candidates",
      "Presentation Generation",
      "Concept Fidelity Repair",
      "Creative Candidates",
      "TTS",
      "Image generation",
      "Video rendering",
    ],
  );

  assert.equal(view.summary.failedStepCount, 1);
  assert.equal(view.summary.retryCount, 1);
  assert.ok(view.steps.some((s) => s.repair));
  assert.equal(view.summary.slowestStep?.name, "Video rendering");
  assert.equal(view.summary.slowestProvider?.provider, "video");
  assert.ok((view.summary.estimatedAiCostUsd ?? 0) > 0.07);
  assert.ok(view.summary.videoPipelineDurationMs >= 390600);
  assert.ok(view.summary.aiDurationMs >= 18200 + 11800);
  assert.equal(view.steps.filter((s) => s.packageId === "p2").length, 1);
  assert.equal(view.steps.filter((s) => s.source === "video_job").length, 3);
});

check("filter drops mismatched production_run_id", () => {
  const kept = filterStepsForProductionRun(
    [step({ step_name: "X", started_at: "2026-01-01T00:00:00Z", duration_ms: 1 })],
    {
      productionRunId: "run-a",
      generationTelemetry: { production_run_id: "run-b", steps: [] },
      relationshipScoped: true,
    },
  );
  assert.equal(kept.length, 0);
});

check("video pipeline classification", () => {
  assert.equal(
    isVideoPipelineStep(
      { step_name: "Video rendering", provider: "video" },
      "video_job",
    ),
    true,
  );
  assert.equal(
    isVideoPipelineStep(
      { step_name: "Weekly Strategy", provider: "claude" },
      "strategy",
    ),
    false,
  );
});

check("sortTelemetryStepsChronologically stable", () => {
  const rows: RunTelemetryStepView[] = [
    {
      ...step({
        step_name: "B",
        started_at: "2026-07-20T18:06:00Z",
        duration_ms: 1,
      }),
      source: "package",
      packageId: "p",
      videoJobId: null,
      strategyId: null,
    },
    {
      ...step({
        step_name: "A",
        started_at: "2026-07-20T18:05:00Z",
        duration_ms: 1,
      }),
      source: "strategy",
      packageId: null,
      videoJobId: null,
      strategyId: "s",
    },
  ];
  const sorted = sortTelemetryStepsChronologically(rows);
  assert.equal(sorted[0]!.step_name, "A");
});

check("summary totals from empty cost stay null", () => {
  const summary = buildRunTelemetrySummary(
    [
      {
        ...step({
          step_name: "Hook Enforcement",
          started_at: "2026-07-20T18:06:00Z",
          duration_ms: 10,
          provider: "deterministic",
        }),
        source: "package",
        packageId: "p",
        videoJobId: null,
        strategyId: null,
      },
    ],
    1000,
  );
  assert.equal(summary.estimatedAiCostUsd, null);
  assert.equal(summary.totalRecordedDurationMs, 10);
});

console.log(`\n${passed} checks passed`);
