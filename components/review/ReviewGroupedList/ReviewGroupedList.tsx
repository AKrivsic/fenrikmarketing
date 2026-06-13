"use client";

import { ReviewRunSection } from "@/components/review/ReviewRunSection/ReviewRunSection";
import type { ReviewRunGroup } from "@/lib/api/project-review-admin";
import styles from "./ReviewGroupedList.module.css";

interface ReviewGroupedListProps {
  projectId: string;
  groups: ReviewRunGroup[];
}

// Renders the project review tab as collapsible Production Run → Package →
// Content item (project review V2). Each run and package collapses; the newest
// run is open by default, the rest closed, so the page scales to 100+ runs.
// Per-run filters, the package-level video panel and package actions live in the
// child sections — no card UI or workflow action is rewritten here.
export function ReviewGroupedList({
  projectId,
  groups,
}: ReviewGroupedListProps) {
  if (groups.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyText}>
          Tento projekt zatím nemá žádné production runs.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.groups}>
      {groups.map((group, index) => {
        const key = group.run?.id ?? `no-run-${index}`;
        return (
          <ReviewRunSection
            key={key}
            projectId={projectId}
            group={group}
            defaultOpen={index === 0}
          />
        );
      })}
    </div>
  );
}
