"use client";

import { useMemo, useState } from "react";
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

const FALLBACK_BADGE = "Subtitle fallback";

function isFailure(kind: ReviewExceptionKind): boolean {
  return FAILURE_KINDS.includes(kind);
}

function isFallback(card: ReviewExceptionCard): boolean {
  return card.badges.includes(FALLBACK_BADGE);
}

// Simple local date/time — no timezone math, mirrors the run-card formatting.
function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("cs-CZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ALL_PROJECTS = "all" as const;

export function ReviewExceptionsDashboard({
  data,
}: ReviewExceptionsDashboardProps) {
  const { summary, cards } = data;
  const [projectFilter, setProjectFilter] = useState<string>(ALL_PROJECTS);

  // One option per project referenced by the exception cards (stable order).
  const projectOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const card of cards) {
      if (!byId.has(card.projectId)) {
        byId.set(card.projectId, card.projectName ?? card.projectId);
      }
    }
    return Array.from(byId, ([id, name]) => ({ id, name }));
  }, [cards]);

  const visibleCards =
    projectFilter === ALL_PROJECTS
      ? cards
      : cards.filter((card) => card.projectId === projectFilter);

  // Three monitoring buckets: hard failures, fallbacks (graceful degradation),
  // and the remaining warnings.
  const failed = visibleCards.filter((card) => isFailure(card.kind));
  const fallbacks = visibleCards.filter(
    (card) => !isFailure(card.kind) && isFallback(card),
  );
  const warnings = visibleCards.filter(
    (card) => !isFailure(card.kind) && !isFallback(card),
  );

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

      {projectOptions.length > 0 ? (
        <div className={styles.filterBar}>
          <label className={styles.filter}>
            <span className={styles.filterLabel}>Project</span>
            <select
              className={styles.select}
              value={projectFilter}
              onChange={(event) => setProjectFilter(event.target.value)}
            >
              <option value={ALL_PROJECTS}>All Projects</option>
              {projectOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {visibleCards.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyDot} aria-hidden="true" />
          <p className={styles.emptyText}>No active issues</p>
        </div>
      ) : (
        <div className={styles.sections}>
          <Section title="Failed" tone="red" cards={failed} />
          <Section title="Warnings" tone="yellow" cards={warnings} />
          <Section title="Fallbacks" tone="yellow" cards={fallbacks} />
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  tone,
  cards,
}: {
  title: string;
  tone: Tone;
  cards: ReviewExceptionCard[];
}) {
  if (cards.length === 0) return null;
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <span className={`${styles.sectionDot} ${TONE_CLASS[tone]}`} />
        {title}
        <span className={styles.sectionCount}>{cards.length}</span>
      </h2>
      <div className={styles.cards}>
        {cards.map((card) => (
          <ExceptionCard key={card.id} card={card} />
        ))}
      </div>
    </section>
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
        <time className={styles.timestamp} dateTime={card.createdAt}>
          {formatDateTime(card.createdAt)}
        </time>
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
