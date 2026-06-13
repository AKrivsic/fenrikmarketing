"use client";

import { useState } from "react";
import { ReviewRunCard } from "@/components/review/ReviewRunCard/ReviewRunCard";
import { ReviewPackageSection } from "@/components/review/ReviewPackageSection/ReviewPackageSection";
import { formatCsDateTime } from "@/lib/datetime/formatCs";
import type { ReviewRunGroup } from "@/lib/api/project-review-admin";
import styles from "./ReviewRunSection.module.css";

interface ReviewRunSectionProps {
  projectId: string;
  group: ReviewRunGroup;
  defaultOpen: boolean;
}

const HEALTH_CLASS = {
  green: styles.healthGreen,
  yellow: styles.healthYellow,
  red: styles.healthRed,
} as const;

function formatRunLabel(createdAt: string | null): string {
  if (!createdAt) return "Run";
  const formatted = formatCsDateTime(createdAt, "");
  if (!formatted) return "Run";
  return `Run · ${formatted}`;
}

// Review UX V2 — a production run header that expands into its packages. The
// per-run platform / language / status filters are gone: the package now shows
// its Primary / Translations / Published sections directly, so the user always
// thinks Run → Package → Language → Platform instead of status → filter.
export function ReviewRunSection({
  projectId,
  group,
  defaultOpen,
}: ReviewRunSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  const run = group.run;
  const packagesWithItems = group.packages.filter(
    (pkg) =>
      pkg.primaryItems.length > 0 ||
      pkg.translations.length > 0 ||
      pkg.publishedItems.length > 0,
  );

  return (
    <section className={styles.runGroup}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span className={styles.caret} aria-hidden="true">
            {open ? "▼" : "▶"}
          </span>
          <span className={styles.label}>
            {run ? formatRunLabel(run.createdAt) : "Bez production runu"}
          </span>
          {run ? (
            <span className={`${styles.badge} ${HEALTH_CLASS[run.health]}`}>
              {run.status}
            </span>
          ) : null}
          {run && run.warningsCount > 0 ? (
            <span className={styles.warnPill}>{run.warningsCount} warn</span>
          ) : null}
          {run && run.failed > 0 ? (
            <span className={styles.failPill}>{run.failed} failed</span>
          ) : null}
        </button>
      </header>

      {open ? (
        <div className={styles.body}>
          {run ? <ReviewRunCard run={run} /> : null}

          {packagesWithItems.length > 0 ? (
            <div className={styles.packages}>
              {packagesWithItems.map((pkg, index) => (
                <ReviewPackageSection
                  key={pkg.packageId ?? `no-package-${index}`}
                  projectId={projectId}
                  pkg={pkg}
                  defaultOpen={index === 0}
                />
              ))}
            </div>
          ) : (
            <p className={styles.runEmpty}>
              Žádný obsah k review v tomto runu.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
