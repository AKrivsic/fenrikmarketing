"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  runGenerateContentPackages,
  runPublishingPlanner,
  runTrendScan,
  runWeeklyStrategy,
  type ActionResult,
} from "@/app/projects/[id]/actions";
import type {
  CurrentWeekStepDisplay,
  ProjectCurrentWeekStatus,
  ProjectWorkflowStatus,
  WorkflowStatus,
} from "@/lib/api/project-workflow-admin";
import styles from "./ProjectActionsPanel.module.css";

// Plain, already-formatted summary built on the server (no IDs / secrets).
export interface PrepareWeekSummary {
  platforms: string[];
  // Platform Targets V2 — weekly target output volumes.
  totalOutputs: number;
  videoOutputs: number;
  textOutputs: number;
  videoPlatforms: string[];
  textPlatforms: string[];
  publishing: string;
  languages: string[];
  weekStart: string;
  weekLabel: string;
}

interface ProjectActionsPanelProps {
  projectId: string;
  status: ProjectWorkflowStatus;
  currentWeek: ProjectCurrentWeekStatus;
  summary: PrepareWeekSummary;
}

// Per-button UI state. The trigger is fire-and-forget, so "queued" means n8n
// accepted the request — not that the workflow finished.
type RunState = "idle" | "running" | "queued" | "failed";

interface StepRunState {
  state: RunState;
  message?: string;
}

const STAGE_STATUS_LABEL: Record<WorkflowStatus, string> = {
  idle: "Not run yet",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
};

const CURRENT_WEEK_LABEL: Record<CurrentWeekStepDisplay, string> = {
  generated: "✅ Generated",
  missing_strategy: "❌ Missing Strategy",
  missing: "❌ Missing",
  waiting: "⏳ Waiting",
};

interface StepDef {
  key: string;
  index: number;
  title: string;
  explanation: string;
  run: (projectId: string) => Promise<ActionResult>;
  stageStatus: WorkflowStatus;
  stageCount: number;
  weekStatus?: CurrentWeekStepDisplay;
}

function isStepDone(step: StepDef): boolean {
  if (step.key === "trends") {
    return step.stageStatus === "completed";
  }
  if (step.weekStatus === undefined) return false;
  return step.weekStatus === "generated";
}

export function ProjectActionsPanel({
  projectId,
  status,
  currentWeek,
  summary,
}: ProjectActionsPanelProps) {
  const router = useRouter();
  const [runStates, setRunStates] = useState<Record<string, StepRunState>>({});
  const [isPending, startTransition] = useTransition();

  const steps: StepDef[] = useMemo(
    () => [
      {
        key: "trends",
        index: 1,
        title: "Scan trends",
        explanation:
          "Najde aktuální trendy pro tento projekt. Bezpečné spustit kdykoli.",
        run: runTrendScan,
        stageStatus: status.trendScan.status,
        stageCount: status.trendScan.count,
      },
      {
        key: "strategy",
        index: 2,
        title: "Generate weekly strategy",
        explanation:
          "Vytvoří týdenní obsahovou strategii. Nejlepší výsledky po naskenování trendů.",
        run: runWeeklyStrategy,
        stageStatus: status.weeklyStrategy.status,
        stageCount: currentWeek.strategyItemCount,
        weekStatus: currentWeek.strategy,
      },
      {
        key: "packages",
        index: 3,
        title: "Generate content packages",
        explanation:
          "Spustí generování balíčků v n8n podle týdenní strategie pro aktuální týden. Bez strategie pro tento týden API vrátí chybu missing_weekly_strategy.",
        run: runGenerateContentPackages,
        stageStatus: status.contentPackages.status,
        stageCount: currentWeek.packageCount,
        weekStatus: currentWeek.packages,
      },
      {
        key: "publishing",
        index: 4,
        title: "Plan publishing",
        explanation:
          "Naplánuje obsah do publikačního kalendáře pro tento týden. Vyžaduje strategii s period_start = aktuální týden.",
        run: runPublishingPlanner,
        stageStatus: status.publishingPlanner.status,
        stageCount: currentWeek.scheduledCount,
        weekStatus: currentWeek.publishing,
      },
    ],
    [status, currentWeek],
  );

  const nextStepIdx = steps.findIndex((s) => !isStepDone(s));
  const allDone = nextStepIdx === -1;
  const primaryStep = allDone ? steps[0] : steps[nextStepIdx];

  function handleRun(step: StepDef) {
    setRunStates((prev) => ({
      ...prev,
      [step.key]: { state: "running" },
    }));
    startTransition(async () => {
      const result = await step.run(projectId);
      setRunStates((prev) => ({
        ...prev,
        [step.key]: result.ok
          ? {
              state: "queued",
              message: "n8n přijal požadavek (workflow accepted).",
            }
          : { state: "failed", message: result.error },
      }));
      if (result.ok) {
        router.refresh();
      }
    });
  }

  const primaryRun = runStates[primaryStep.key] ?? { state: "idle" };

  return (
    <div className={styles.workflow}>
      {/* Primary: prepare content for this project */}
      <div className={styles.primaryCard}>
        <div className={styles.primaryHead}>
          <div>
            <h3 className={styles.primaryTitle}>
              Prepare content for this project
            </h3>
            <p className={styles.weekLabel}>{summary.weekLabel}</p>
            <p className={styles.weekHint}>Week starts Monday (UTC)</p>
          </div>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => handleRun(primaryStep)}
            disabled={isPending && primaryRun.state === "running"}
          >
            {primaryRun.state === "running" ? "Spouštím…" : "Prepare this week"}
          </button>
        </div>

        <p className={styles.primaryHint}>
          {allDone ? (
            <>
              Spustí znovu od kroku{" "}
              <strong>
                {primaryStep.index}. {primaryStep.title}
              </strong>
              . Kroky lze spouštět i jednotlivě — stav „Current Week“ níže
              vztahuje jen k týdnu {summary.weekLabel}.
            </>
          ) : (
            <>
              Spustí další krok:{" "}
              <strong>
                {primaryStep.index}. {primaryStep.title}
              </strong>
              . n8n krok zpracuje asynchronně; stejný krok můžete spustit znovu
              kdykoli.
            </>
          )}
        </p>

        <dl className={styles.summary}>
          <div className={styles.summaryItem}>
            <dt>Platforms</dt>
            <dd>
              {summary.platforms.length > 0
                ? summary.platforms.join(", ")
                : "—"}
            </dd>
          </div>
          <div className={styles.summaryItem}>
            <dt>Weekly target outputs</dt>
            <dd>{summary.totalOutputs} total (target)</dd>
          </div>
          <div className={styles.summaryItem}>
            <dt>Video / Text</dt>
            <dd>
              {summary.videoPlatforms.length > 0
                ? `Video: ${summary.videoPlatforms.join(", ")}`
                : "Video: —"}
              {" · "}
              {summary.textPlatforms.length > 0
                ? `Text: ${summary.textPlatforms.join(", ")}`
                : "Text: —"}
            </dd>
          </div>
          <div className={styles.summaryItem}>
            <dt>Publishing</dt>
            <dd>{summary.publishing}</dd>
          </div>
          <div className={styles.summaryItem}>
            <dt>Languages</dt>
            <dd>
              {summary.languages.length > 0
                ? summary.languages.join(", ")
                : "Pouze primární jazyk"}
            </dd>
          </div>
          <div className={styles.summaryItem}>
            <dt>Expected output (target)</dt>
            <dd>
              {summary.totalOutputs} outputs · {summary.videoOutputs} video ·{" "}
              {summary.textOutputs} text
            </dd>
          </div>
        </dl>

        <div className={styles.weekStatus}>
          <h4 className={styles.weekStatusTitle}>Current Week Status</h4>
          <ul className={styles.weekStatusList}>
            <li>
              <span className={styles.weekStatusKey}>Strategy</span>
              <span>{CURRENT_WEEK_LABEL[currentWeek.strategy]}</span>
            </li>
            <li>
              <span className={styles.weekStatusKey}>Packages</span>
              <span>{CURRENT_WEEK_LABEL[currentWeek.packages]}</span>
            </li>
            <li>
              <span className={styles.weekStatusKey}>Publishing</span>
              <span>{CURRENT_WEEK_LABEL[currentWeek.publishing]}</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Guided sequence */}
      <ol className={styles.steps}>
        {steps.map((step) => {
          const run = runStates[step.key] ?? { state: "idle" };
          return (
            <li key={step.key} className={styles.step}>
              <div className={styles.stepIndex}>{step.index}</div>
              <div className={styles.stepBody}>
                <div className={styles.stepHead}>
                  <span className={styles.stepTitle}>{step.title}</span>
                  {step.weekStatus ? (
                    <span className={styles.weekBadge}>
                      {CURRENT_WEEK_LABEL[step.weekStatus]}
                      {step.stageCount > 0 ? ` (${step.stageCount})` : ""}
                    </span>
                  ) : (
                    <span
                      className={styles.badge}
                      data-status={step.stageStatus}
                    >
                      {STAGE_STATUS_LABEL[step.stageStatus]}
                      {step.stageCount > 0 ? ` (${step.stageCount})` : ""}
                    </span>
                  )}
                </div>
                <p className={styles.stepExplanation}>{step.explanation}</p>

                <div className={styles.stepFooter}>
                  <button
                    type="button"
                    className={styles.button}
                    onClick={() => handleRun(step)}
                    disabled={isPending && run.state === "running"}
                  >
                    {run.state === "running" ? "Spouštím…" : "Spustit"}
                  </button>
                  {run.state === "queued" ? (
                    <span className={styles.queued}>{run.message}</span>
                  ) : null}
                  {run.state === "failed" ? (
                    <span className={styles.failed}>{run.message}</span>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Advanced / Debug — raw triggers, no prerequisite gating */}
      <details className={styles.advanced}>
        <summary className={styles.advancedSummary}>
          Advanced / Debug actions
        </summary>
        <p className={styles.advancedNote}>
          Přímé spuštění jednotlivých workflow bez kontroly pořadí. Pro ladění.
        </p>
        <div className={styles.advancedGrid}>
          {steps.map((step) => {
            const run = runStates[step.key] ?? { state: "idle" };
            return (
              <div key={`adv-${step.key}`} className={styles.advancedItem}>
                <button
                  type="button"
                  className={styles.advancedButton}
                  onClick={() => handleRun(step)}
                  disabled={isPending && run.state === "running"}
                >
                  {run.state === "running"
                    ? "Spouštím…"
                    : `Run: ${step.title}`}
                </button>
                {run.state === "queued" ? (
                  <span className={styles.queued}>{run.message}</span>
                ) : null}
                {run.state === "failed" ? (
                  <span className={styles.failed}>{run.message}</span>
                ) : null}
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
}
