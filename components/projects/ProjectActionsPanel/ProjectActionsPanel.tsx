"use client";

import { useState, useTransition } from "react";
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

interface ProjectActionsPanelProps {
  projectId: string;
  status: ProjectWorkflowStatus;
}

// UI-only run state per button (the trigger itself is fire-and-forget).
type RunState = "idle" | "running" | "queued" | "failed";

interface ActionDef {
  key: string;
  label: string;
  description: string;
  run: (projectId: string) => Promise<ActionResult>;
  // Derived backend status for this workflow (from existing data).
  stageStatus: WorkflowStatus;
  stageCount: number;
}

const STAGE_STATUS_LABEL: Record<WorkflowStatus, string> = {
  idle: "Not run yet",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
};

export function ProjectActionsPanel({
  projectId,
  status,
}: ProjectActionsPanelProps) {
  const [runStates, setRunStates] = useState<Record<string, RunState>>({});
  const [isPending, startTransition] = useTransition();

  const actions: ActionDef[] = [
    {
      key: "trend_scan",
      label: "Run Trend Scan",
      description: "Najde aktuální trendy pro tento projekt.",
      run: runTrendScan,
      stageStatus: status.trendScan.status,
      stageCount: status.trendScan.count,
    },
    {
      key: "weekly_strategy",
      label: "Generate Weekly Strategy",
      description: "Vytvoří týdenní obsahovou strategii.",
      run: runWeeklyStrategy,
      stageStatus: status.weeklyStrategy.status,
      stageCount: status.weeklyStrategy.count,
    },
    {
      key: "content_packages",
      label: "Generate Content Packages",
      description: "Vygeneruje obsahové balíčky podle strategie.",
      run: runGenerateContentPackages,
      stageStatus: status.contentPackages.status,
      stageCount: status.contentPackages.count,
    },
    {
      key: "publishing_planner",
      label: "Run Publishing Planner",
      description: "Naplánuje schválený obsah do publikačního kalendáře.",
      run: runPublishingPlanner,
      stageStatus: status.publishingPlanner.status,
      stageCount: status.publishingPlanner.count,
    },
  ];

  function handleRun(action: ActionDef) {
    setRunStates((prev) => ({ ...prev, [action.key]: "running" }));
    startTransition(async () => {
      const result = await action.run(projectId);
      setRunStates((prev) => ({
        ...prev,
        [action.key]: result.ok ? "queued" : "failed",
      }));
    });
  }

  return (
    <div className={styles.grid}>
      {actions.map((action) => {
        const runState = runStates[action.key] ?? "idle";
        return (
          <div key={action.key} className={styles.card}>
            <div className={styles.head}>
              <span className={styles.title}>{action.label}</span>
              <span
                className={styles.badge}
                data-status={action.stageStatus}
              >
                {STAGE_STATUS_LABEL[action.stageStatus]}
                {action.stageCount > 0 ? ` (${action.stageCount})` : ""}
              </span>
            </div>
            <p className={styles.description}>{action.description}</p>

            <div className={styles.footer}>
              <button
                type="button"
                className={styles.button}
                onClick={() => handleRun(action)}
                disabled={isPending && runState === "running"}
              >
                {runState === "running" ? "Spouštím…" : "Spustit"}
              </button>
              {runState === "queued" ? (
                <span className={styles.queued}>Zařazeno do fronty.</span>
              ) : null}
              {runState === "failed" ? (
                <span className={styles.failed}>Spuštění selhalo.</span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
