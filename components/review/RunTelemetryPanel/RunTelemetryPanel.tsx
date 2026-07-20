"use client";

import { useCallback, useState, useTransition } from "react";
import { loadRunTelemetryAction } from "@/app/projects/[id]/review/actions";
import type {
  RunTelemetryStepView,
  RunTelemetrySummary,
  RunTelemetryView,
} from "@/lib/production-runs/aggregateRunTelemetry";
import { formatCsDateTime } from "@/lib/datetime/formatCs";
import styles from "./RunTelemetryPanel.module.css";

interface RunTelemetryPanelProps {
  projectId: string;
  productionRunId: string;
}

function formatDurationMs(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds - minutes * 60;
  return rest >= 0.05
    ? `${minutes}m ${rest.toFixed(1)}s`
    : `${minutes}m`;
}

function formatCost(usd: number | null | undefined): string {
  if (usd == null || !Number.isFinite(usd)) return "—";
  if (usd < 0.0001) return `$${usd.toFixed(6)}`;
  return `$${usd.toFixed(4)}`;
}

function formatBytes(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(1)} KB`;
}

function sourceLabel(source: RunTelemetryStepView["source"]): string {
  if (source === "strategy") return "strategy";
  if (source === "package") return "package";
  return "video job";
}

function SummaryGrid({ summary }: { summary: RunTelemetrySummary }) {
  return (
    <dl className={styles.summaryGrid}>
      <div className={styles.stat}>
        <dt>Total run duration</dt>
        <dd>{formatDurationMs(summary.totalRunDurationMs)}</dd>
      </div>
      <div className={styles.stat}>
        <dt>Recorded telemetry</dt>
        <dd>{formatDurationMs(summary.totalRecordedDurationMs)}</dd>
      </div>
      <div className={styles.stat}>
        <dt>AI duration</dt>
        <dd>{formatDurationMs(summary.aiDurationMs)}</dd>
      </div>
      <div className={styles.stat}>
        <dt>Video pipeline</dt>
        <dd>{formatDurationMs(summary.videoPipelineDurationMs)}</dd>
      </div>
      <div className={styles.stat}>
        <dt>Est. AI cost</dt>
        <dd>{formatCost(summary.estimatedAiCostUsd)}</dd>
      </div>
      <div className={styles.stat}>
        <dt>Steps</dt>
        <dd>{summary.stepCount}</dd>
      </div>
      <div className={styles.stat}>
        <dt>Failed</dt>
        <dd
          className={
            summary.failedStepCount > 0 ? styles.failValue : undefined
          }
        >
          {summary.failedStepCount}
        </dd>
      </div>
      <div className={styles.stat}>
        <dt>Retries</dt>
        <dd>{summary.retryCount}</dd>
      </div>
      <div className={styles.statWide}>
        <dt>Slowest step</dt>
        <dd>
          {summary.slowestStep
            ? `${summary.slowestStep.name} (${formatDurationMs(summary.slowestStep.durationMs)})`
            : "—"}
        </dd>
      </div>
      <div className={styles.statWide}>
        <dt>Slowest provider</dt>
        <dd>
          {summary.slowestProvider
            ? `${summary.slowestProvider.provider} (${formatDurationMs(summary.slowestProvider.durationMs)})`
            : "—"}
        </dd>
      </div>
    </dl>
  );
}

function StepDetail({ step }: { step: RunTelemetryStepView }) {
  return (
    <dl className={styles.detailGrid}>
      <div>
        <dt>Provider</dt>
        <dd>{step.provider ?? "—"}</dd>
      </div>
      <div>
        <dt>Model</dt>
        <dd className={styles.mono}>{step.model ?? "—"}</dd>
      </div>
      <div>
        <dt>Started</dt>
        <dd>{formatCsDateTime(step.started_at)}</dd>
      </div>
      <div>
        <dt>Finished</dt>
        <dd>{formatCsDateTime(step.finished_at)}</dd>
      </div>
      <div>
        <dt>Duration</dt>
        <dd>{formatDurationMs(step.duration_ms)}</dd>
      </div>
      <div>
        <dt>Success</dt>
        <dd>{step.success ? "yes" : "no"}</dd>
      </div>
      <div>
        <dt>Retry count</dt>
        <dd>{step.retry_count}</dd>
      </div>
      <div>
        <dt>Repair</dt>
        <dd>{step.repair ? "yes" : "no"}</dd>
      </div>
      <div>
        <dt>Prompt tokens</dt>
        <dd>{step.prompt_tokens ?? "—"}</dd>
      </div>
      <div>
        <dt>Completion tokens</dt>
        <dd>{step.completion_tokens ?? "—"}</dd>
      </div>
      <div>
        <dt>Cached tokens</dt>
        <dd>{step.cached_tokens ?? "—"}</dd>
      </div>
      <div>
        <dt>Est. cost</dt>
        <dd>{formatCost(step.estimated_cost)}</dd>
      </div>
      <div>
        <dt>Prompt size</dt>
        <dd>{formatBytes(step.input_size_bytes)}</dd>
      </div>
      <div>
        <dt>Output size</dt>
        <dd>{formatBytes(step.output_size_bytes)}</dd>
      </div>
      <div className={styles.detailWide}>
        <dt>Source</dt>
        <dd>
          {sourceLabel(step.source)}
          {step.packageId ? (
            <>
              {" "}
              · pkg <code className={styles.mono}>{step.packageId}</code>
            </>
          ) : null}
          {step.videoJobId ? (
            <>
              {" "}
              · job <code className={styles.mono}>{step.videoJobId}</code>
            </>
          ) : null}
          {step.strategyId ? (
            <>
              {" "}
              · strategy <code className={styles.mono}>{step.strategyId}</code>
            </>
          ) : null}
        </dd>
      </div>
      <div className={styles.detailWide}>
        <dt>Input summary</dt>
        <dd>{step.input_summary ?? "—"}</dd>
      </div>
      <div className={styles.detailWide}>
        <dt>Output summary</dt>
        <dd>{step.output_summary ?? "—"}</dd>
      </div>
      {step.warnings.length > 0 ? (
        <div className={styles.detailWide}>
          <dt>Warnings</dt>
          <dd>
            <ul className={styles.warnList}>
              {step.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </dd>
        </div>
      ) : null}
      {step.error_message ? (
        <div className={styles.detailWide}>
          <dt>Error</dt>
          <dd className={styles.errorText}>{step.error_message}</dd>
        </div>
      ) : null}
    </dl>
  );
}

function Timeline({ steps }: { steps: RunTelemetryStepView[] }) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  return (
    <ul className={styles.timeline}>
      {steps.map((step, index) => {
        const open = expanded[index] === true;
        return (
          <li key={`${step.step_name}-${step.started_at}-${index}`} className={styles.step}>
            <button
              type="button"
              className={styles.stepToggle}
              aria-expanded={open}
              onClick={() =>
                setExpanded((prev) => ({ ...prev, [index]: !open }))
              }
            >
              <span className={styles.stepCaret} aria-hidden="true">
                {open ? "▼" : "▶"}
              </span>
              <span className={styles.stepName}>{step.step_name}</span>
              <span className={styles.stepDuration}>
                {formatDurationMs(step.duration_ms)}
              </span>
              <span className={styles.stepProvider}>
                {step.provider ?? "—"}
              </span>
              <span
                className={
                  step.success ? styles.statusOk : styles.statusFail
                }
              >
                {step.success ? "ok" : "fail"}
              </span>
              {step.estimated_cost != null ? (
                <span className={styles.stepCost}>
                  {formatCost(step.estimated_cost)}
                </span>
              ) : null}
              {step.retry_count > 0 ? (
                <span className={styles.retryPill}>
                  retry ×{step.retry_count}
                </span>
              ) : null}
              {step.repair ? (
                <span className={styles.repairPill}>repair</span>
              ) : null}
            </button>
            {open ? <StepDetail step={step} /> : null}
          </li>
        );
      })}
    </ul>
  );
}

export function RunTelemetryPanel({
  projectId,
  productionRunId,
}: RunTelemetryPanelProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<RunTelemetryView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      setError(null);
      const result = await loadRunTelemetryAction(projectId, productionRunId);
      if (!result.ok) {
        setError(result.error);
        setView(null);
        return;
      }
      setView(result.data);
    });
  }, [projectId, productionRunId]);

  const onToggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !view && !pending) {
      load();
    }
  };

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        onClick={onToggle}
      >
        <span className={styles.caret} aria-hidden="true">
          {open ? "▼" : "▶"}
        </span>
        <span className={styles.title}>Telemetry</span>
        {pending ? <span className={styles.loading}>Loading…</span> : null}
      </button>

      {open ? (
        <div className={styles.body}>
          {error ? <p className={styles.errorBanner}>{error}</p> : null}

          {!error && !view && pending ? (
            <p className={styles.muted}>Loading telemetry…</p>
          ) : null}

          {view && !view.summary.hasDetailedSteps ? (
            <p className={styles.muted}>
              No detailed telemetry was recorded for this run.
            </p>
          ) : null}

          {view && view.summary.hasDetailedSteps ? (
            <>
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Summary</h3>
                <SummaryGrid summary={view.summary} />
              </section>
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Timeline</h3>
                <Timeline steps={view.steps} />
              </section>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
