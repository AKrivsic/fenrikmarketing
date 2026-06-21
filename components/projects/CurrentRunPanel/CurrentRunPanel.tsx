"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getProjectActionRunStatus } from "@/app/projects/[id]/actions";
import {
  ACTION_RUN_STATUS_LABEL,
  ACTION_STEP_LABEL,
  actionRunStatusMessage,
  isActionRunActive,
  type ProjectActionRunView,
} from "@/lib/api/project-action-runs";
import { formatCurrentWeekLabel } from "@/lib/datetime/week";
import { formatCsDateTime } from "@/lib/datetime/formatCs";
import styles from "./CurrentRunPanel.module.css";

const POLL_INTERVAL_MS = 7000;

interface CurrentRunPanelProps {
  projectId: string;
  weekStart: string;
  initialRun: ProjectActionRunView | null;
}

function displayStatus(run: ProjectActionRunView | null): string {
  if (!run) return "Waiting";
  return ACTION_RUN_STATUS_LABEL[run.status];
}

export function CurrentRunPanel({
  projectId,
  weekStart,
  initialRun,
}: CurrentRunPanelProps) {
  const router = useRouter();
  const [run, setRun] = useState<ProjectActionRunView | null>(initialRun);

  useEffect(() => {
    setRun(initialRun);
  }, [initialRun]);

  const active = isActionRunActive(run);

  useEffect(() => {
    if (!active) return;

    const poll = async () => {
      const latest = await getProjectActionRunStatus(projectId);
      setRun(latest);
      if (!isActionRunActive(latest)) {
        router.refresh();
      }
    };

    const timer = setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [active, projectId, router]);

  const stepLabel = run ? ACTION_STEP_LABEL[run.step] : "—";
  const statusLabel = displayStatus(run);
  const detail = run
    ? actionRunStatusMessage(run)
    : "No Prepare-this-week step has been triggered yet.";

  return (
    <section className={styles.panel} aria-labelledby="current-run-title">
      <h3 id="current-run-title" className={styles.title}>
        Current run
      </h3>
      <p className={styles.week}>{formatCurrentWeekLabel(weekStart)}</p>
      <p className={styles.weekHint}>Week starts Monday (UTC)</p>

      <dl className={styles.grid}>
        <div>
          <dt>Last triggered step</dt>
          <dd>{stepLabel}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            <span className={styles.status} data-status={statusLabel.toLowerCase()}>
              {statusLabel}
            </span>
          </dd>
        </div>
        <div>
          <dt>Started</dt>
          <dd>{run ? formatCsDateTime(run.startedAt) : "—"}</dd>
        </div>
        <div>
          <dt>Finished</dt>
          <dd>{run?.finishedAt ? formatCsDateTime(run.finishedAt) : "—"}</dd>
        </div>
      </dl>

      <p className={styles.message}>{detail}</p>
      {run?.error ? <p className={styles.error}>{run.error}</p> : null}
      {active ? (
        <p className={styles.polling}>Auto-refreshing while the step runs…</p>
      ) : null}
    </section>
  );
}
