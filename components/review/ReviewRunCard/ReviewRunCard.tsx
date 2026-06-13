import type { ReviewRunCard as ReviewRunCardData } from "@/lib/api/review-runs-admin";
import { formatCsDateTime } from "@/lib/datetime/formatCs";
import styles from "./ReviewRunCard.module.css";

interface ReviewRunCardProps {
  run: ReviewRunCardData;
}

const EMPTY = "—";

function formatDateTime(value: string | null): string {
  return formatCsDateTime(value, EMPTY);
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return EMPTY;
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest > 0 ? `${minutes}m ${rest}s` : `${minutes}m`;
}

// Maps the run health to a status badge class (green / yellow / red).
const HEALTH_CLASS = {
  green: styles.healthGreen,
  yellow: styles.healthYellow,
  red: styles.healthRed,
} as const;

export function ReviewRunCard({ run }: ReviewRunCardProps) {
  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <div className={styles.idBlock}>
          <span className={styles.label}>Run ID</span>
          <code className={styles.runId}>{run.id}</code>
        </div>
        <span className={`${styles.badge} ${HEALTH_CLASS[run.health]}`}>
          {run.status}
        </span>
      </header>

      <dl className={styles.stats}>
        <div className={styles.stat}>
          <dt className={styles.label}>Created</dt>
          <dd className={styles.value}>{formatDateTime(run.createdAt)}</dd>
        </div>
        <div className={styles.stat}>
          <dt className={styles.label}>Completed</dt>
          <dd className={styles.value}>{formatDateTime(run.completedAt)}</dd>
        </div>
        <div className={styles.stat}>
          <dt className={styles.label}>Duration</dt>
          <dd className={styles.value}>{formatDuration(run.durationSeconds)}</dd>
        </div>
        <div className={styles.stat}>
          <dt className={styles.label}>Packages</dt>
          <dd className={styles.value}>{run.packageCount}</dd>
        </div>
        <div className={styles.stat}>
          <dt className={styles.label}>Generated</dt>
          <dd className={styles.value}>{run.generated}</dd>
        </div>
        <div className={styles.stat}>
          <dt className={styles.label}>Failed</dt>
          <dd className={styles.value}>{run.failed}</dd>
        </div>
        <div className={styles.stat}>
          <dt className={styles.label}>Warnings</dt>
          <dd
            className={`${styles.value} ${run.warningsCount > 0 ? styles.warnValue : ""}`}
          >
            {run.warningsCount}
          </dd>
        </div>
      </dl>

      <footer className={styles.footer}>
        <a
          className={styles.export}
          href={`/api/production-runs/${run.id}/export`}
        >
          Export JSON
        </a>
      </footer>
    </article>
  );
}
