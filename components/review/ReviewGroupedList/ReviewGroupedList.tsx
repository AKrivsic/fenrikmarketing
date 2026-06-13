"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ReviewRunSection } from "@/components/review/ReviewRunSection/ReviewRunSection";
import type { ReviewRunGroup } from "@/lib/api/project-review-admin";
import styles from "./ReviewGroupedList.module.css";

interface ReviewGroupedListProps {
  projectId: string;
  groups: ReviewRunGroup[];
}

// Poll cadence while any translation video is still rendering. Long enough to
// avoid hammering the server, short enough to feel live.
const TRANSLATION_POLL_INTERVAL_MS = 7000;

function hasRunningTranslation(groups: ReviewRunGroup[]): boolean {
  return groups.some((group) =>
    group.packages.some(
      (pkg) => pkg.summary.translationProgress.overall === "running",
    ),
  );
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
  const router = useRouter();

  // Auto-refresh while at least one translation video job is queued/running.
  // router.refresh() re-runs the server data load (force-dynamic page), so the
  // per-language progress fills in without a manual reload. Stops automatically
  // once every target language is complete or failed (no more "running").
  const running = hasRunningTranslation(groups);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      router.refresh();
    }, TRANSLATION_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [running, router]);

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
