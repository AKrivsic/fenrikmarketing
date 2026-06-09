"use client";

import { useMemo, useState, useTransition } from "react";
import {
  runGenerateContentPackages,
  runPublishingPlanner,
  runTrendScan,
  runWeeklyStrategy,
  type ActionResult,
} from "@/app/projects/[id]/actions";
import type {
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
}

interface ProjectActionsPanelProps {
  projectId: string;
  status: ProjectWorkflowStatus;
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

interface StepDef {
  key: string;
  index: number;
  title: string;
  explanation: string;
  run: (projectId: string) => Promise<ActionResult>;
  stageStatus: WorkflowStatus;
  stageCount: number;
}

function isCompleted(s: WorkflowStatus): boolean {
  return s === "completed";
}

export function ProjectActionsPanel({
  projectId,
  status,
  summary,
}: ProjectActionsPanelProps) {
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
        stageCount: status.weeklyStrategy.count,
      },
      {
        key: "packages",
        index: 3,
        title: "Generate content packages",
        explanation:
          "Spustí generování balíčků v n8n podle týdenní strategie. Nemusí vygenerovat všechny chybějící balíčky najednou — výsledek ověřte v záložce Content Packages.",
        run: runGenerateContentPackages,
        stageStatus: status.contentPackages.status,
        stageCount: status.contentPackages.count,
      },
      {
        key: "publishing",
        index: 4,
        title: "Plan publishing",
        explanation:
          "Naplánuje schválený obsah do publikačního kalendáře pro tento týden.",
        run: runPublishingPlanner,
        stageStatus: status.publishingPlanner.status,
        stageCount: status.publishingPlanner.count,
      },
    ],
    [status],
  );

  // A step is runnable when its predecessor is completed (step 1 always is).
  function isRunnable(stepIdx: number): boolean {
    if (stepIdx === 0) return true;
    return isCompleted(steps[stepIdx - 1].stageStatus);
  }

  // First step that is not yet completed — the one "Prepare this week" advances.
  const nextStepIdx = steps.findIndex((s) => !isCompleted(s.stageStatus));
  const allDone = nextStepIdx === -1;

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
    });
  }

  const nextStep = allDone ? null : steps[nextStepIdx];

  return (
    <div className={styles.workflow}>
      {/* Primary: prepare content for this project */}
      <div className={styles.primaryCard}>
        <div className={styles.primaryHead}>
          <div>
            <h3 className={styles.primaryTitle}>
              Prepare content for this project
            </h3>
            <p className={styles.weekLabel}>Current week: {summary.weekStart}</p>
          </div>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => nextStep && handleRun(nextStep)}
            disabled={allDone || isPending}
          >
            {allDone
              ? "Vše připraveno"
              : nextStep && runStates[nextStep.key]?.state === "running"
                ? "Spouštím…"
                : "Prepare this week"}
          </button>
        </div>

        {nextStep ? (
          <p className={styles.primaryHint}>
            Spustí další krok:{" "}
            <strong>
              {nextStep.index}. {nextStep.title}
            </strong>
            . n8n krok zpracuje a nahlásí výsledek; poté pokračujte dalším
            krokem.
          </p>
        ) : (
          <p className={styles.primaryHint}>
            Všechny kroky pro tento týden proběhly. Stav najdete níže a v
            záložkách obsahu.
          </p>
        )}

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
      </div>

      {/* Guided sequence */}
      <ol className={styles.steps}>
        {steps.map((step, idx) => {
          const run = runStates[step.key] ?? { state: "idle" };
          const runnable = isRunnable(idx);
          return (
            <li key={step.key} className={styles.step}>
              <div className={styles.stepIndex}>{step.index}</div>
              <div className={styles.stepBody}>
                <div className={styles.stepHead}>
                  <span className={styles.stepTitle}>{step.title}</span>
                  <span
                    className={styles.badge}
                    data-status={step.stageStatus}
                  >
                    {STAGE_STATUS_LABEL[step.stageStatus]}
                    {step.stageCount > 0 ? ` (${step.stageCount})` : ""}
                  </span>
                </div>
                <p className={styles.stepExplanation}>{step.explanation}</p>

                <div className={styles.stepFooter}>
                  <button
                    type="button"
                    className={styles.button}
                    onClick={() => handleRun(step)}
                    disabled={!runnable || (isPending && run.state === "running")}
                  >
                    {run.state === "running" ? "Spouštím…" : "Spustit"}
                  </button>
                  {!runnable ? (
                    <span className={styles.gate}>
                      Nejdřív dokončete krok {step.index - 1}.
                    </span>
                  ) : null}
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
