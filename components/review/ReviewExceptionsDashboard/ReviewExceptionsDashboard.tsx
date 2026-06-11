import Link from "next/link";
import type {
  ReviewExceptionCard,
  ReviewExceptionKind,
  ReviewExceptions,
} from "@/lib/api/review-exceptions-admin";
import styles from "./ReviewExceptionsDashboard.module.css";

interface ReviewExceptionsDashboardProps {
  data: ReviewExceptions;
}

type Tone = "red" | "yellow" | "green";

const TONE_CLASS: Record<Tone, string> = {
  red: styles.toneRed,
  yellow: styles.toneYellow,
  green: styles.toneGreen,
};

const KIND_LABEL: Record<ReviewExceptionKind, string> = {
  run_failed: "Run failed",
  item_failed: "Item failed",
  job_failed: "Job failed",
  run_warning: "Run warning",
  job_warning: "Job warning",
};

const FAILURE_KINDS: ReviewExceptionKind[] = [
  "run_failed",
  "item_failed",
  "job_failed",
];

function isFailure(kind: ReviewExceptionKind): boolean {
  return FAILURE_KINDS.includes(kind);
}

export function ReviewExceptionsDashboard({
  data,
}: ReviewExceptionsDashboardProps) {
  const { summary, cards } = data;

  return (
    <div className={styles.dashboard}>
      <dl className={styles.metrics}>
        <Metric
          label="Failed Runs"
          value={summary.failedRuns}
          tone={summary.failedRuns > 0 ? "red" : "green"}
        />
        <Metric
          label="Failed Jobs"
          value={summary.failedJobs}
          tone={summary.failedJobs > 0 ? "red" : "green"}
        />
        <Metric
          label="Warning Runs"
          value={summary.warningRuns}
          tone={summary.warningRuns > 0 ? "yellow" : "green"}
        />
        <Metric
          label="Fallback Jobs"
          value={summary.fallbackJobs}
          tone={summary.fallbackJobs > 0 ? "yellow" : "green"}
        />
      </dl>

      {cards.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyDot} aria-hidden="true" />
          <p className={styles.emptyText}>No active issues</p>
        </div>
      ) : (
        <div className={styles.cards}>
          {cards.map((card) => (
            <ExceptionCard key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: Tone;
}) {
  return (
    <div className={`${styles.metric} ${TONE_CLASS[tone]}`}>
      <dt className={styles.metricLabel}>{label}</dt>
      <dd className={styles.metricValue}>{value}</dd>
    </div>
  );
}

function ExceptionCard({ card }: { card: ReviewExceptionCard }) {
  const failure = isFailure(card.kind);
  return (
    <article
      className={`${styles.card} ${failure ? styles.cardFailure : styles.cardWarning}`}
    >
      <header className={styles.cardHeader}>
        <span
          className={`${styles.kind} ${failure ? styles.kindFailure : styles.kindWarning}`}
        >
          {KIND_LABEL[card.kind]}
        </span>
        <span className={styles.project}>
          {card.projectName ?? card.projectId}
        </span>
      </header>

      <h3 className={styles.title}>{card.title}</h3>
      {card.detail ? <p className={styles.detail}>{card.detail}</p> : null}

      {card.badges.length > 0 ? (
        <ul className={styles.badges}>
          {card.badges.map((badge) => (
            <li key={badge} className={styles.badge}>
              {badge}
            </li>
          ))}
        </ul>
      ) : null}

      <footer className={styles.cardFooter}>
        <Link
          href={`/projects/${card.projectId}/review`}
          className={styles.openLink}
        >
          Open in Project
        </Link>
      </footer>
    </article>
  );
}
