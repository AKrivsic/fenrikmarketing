import Link from "next/link";
import type { ContentFlowCounts } from "@/lib/api/project-workflow-admin";
import styles from "./ContentFlow.module.css";

interface ContentFlowProps {
  projectId: string;
  counts: ContentFlowCounts;
}

interface Stage {
  label: string;
  count: number;
  // Tab segment this stage links to ("" = none, "published" has no tab).
  segment: string | null;
}

// Makes the content lifecycle explicit so Approved is never a dead end:
// Review → Approved → Scheduled → Published. Each stage links to its tab where
// one exists (Published has no dedicated tab; it is shown under Scheduled).
export function ContentFlow({ projectId, counts }: ContentFlowProps) {
  const stages: Stage[] = [
    { label: "Review", count: counts.review, segment: "review" },
    { label: "Approved", count: counts.approved, segment: "approved" },
    { label: "Scheduled", count: counts.scheduled, segment: "scheduled" },
    { label: "Published", count: counts.published, segment: "scheduled" },
  ];

  return (
    <div className={styles.flow}>
      {stages.map((stage, index) => (
        <div key={stage.label} className={styles.step}>
          {stage.segment ? (
            <Link
              href={`/projects/${projectId}/${stage.segment}`}
              className={styles.card}
            >
              <span className={styles.count}>{stage.count}</span>
              <span className={styles.label}>{stage.label}</span>
            </Link>
          ) : (
            <div className={styles.card}>
              <span className={styles.count}>{stage.count}</span>
              <span className={styles.label}>{stage.label}</span>
            </div>
          )}
          {index < stages.length - 1 ? (
            <span className={styles.arrow} aria-hidden="true">
              →
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
