import type {
  ProjectWorkflowStatus,
  WorkflowStageStatus,
  WorkflowStatus,
} from "@/lib/api/project-workflow-admin";
import styles from "./WorkflowTimeline.module.css";

interface WorkflowTimelineProps {
  status: ProjectWorkflowStatus;
}

const STATUS_LABEL: Record<WorkflowStatus, string> = {
  idle: "Idle",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
};

interface Stage {
  key: keyof ProjectWorkflowStatus;
  label: string;
  unit: string;
}

const STAGES: Stage[] = [
  { key: "trendScan", label: "Trend Scan", unit: "trends" },
  { key: "weeklyStrategy", label: "Weekly Strategy", unit: "strategies" },
  { key: "contentPackages", label: "Content Packages", unit: "packages" },
  { key: "videos", label: "Videos", unit: "video jobs" },
  { key: "publishingPlanner", label: "Publishing Planner", unit: "scheduled" },
];

export function WorkflowTimeline({ status }: WorkflowTimelineProps) {
  return (
    <ol className={styles.timeline}>
      {STAGES.map((stage) => {
        const stageStatus: WorkflowStageStatus = status[stage.key];
        return (
          <li key={stage.key} className={styles.stage}>
            <span
              className={styles.dot}
              data-status={stageStatus.status}
              aria-hidden="true"
            />
            <div className={styles.body}>
              <span className={styles.label}>{stage.label}</span>
              <span className={styles.detail}>
                {STATUS_LABEL[stageStatus.status]}
                {stageStatus.count > 0
                  ? ` · ${stageStatus.count} ${stage.unit}`
                  : ""}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
