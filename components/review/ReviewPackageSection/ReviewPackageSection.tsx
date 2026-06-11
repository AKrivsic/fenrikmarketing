"use client";

import { useState } from "react";
import { ProjectContentCard } from "@/components/projects/ProjectContentCard/ProjectContentCard";
import { PackageVideoPanel } from "@/components/review/PackageVideoPanel/PackageVideoPanel";
import { PackageActions } from "@/components/review/PackageActions/PackageActions";
import { matchesRunFilter, type RunFilterState } from "@/components/review/reviewFilters";
import type { ReviewPackageGroup } from "@/lib/api/project-review-admin";
import styles from "./ReviewPackageSection.module.css";

interface ReviewPackageSectionProps {
  projectId: string;
  pkg: ReviewPackageGroup;
  // Run-level filter — applied ONLY to the platform-output list below, never to
  // the video panel.
  filter: RunFilterState;
  defaultOpen: boolean;
}

export function ReviewPackageSection({
  projectId,
  pkg,
  filter,
  defaultOpen,
}: ReviewPackageSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  const visibleItems = pkg.items.filter((item) =>
    matchesRunFilter(item, filter),
  );

  return (
    <div className={styles.package}>
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
          <span className={styles.title}>{pkg.title}</span>
          <span className={styles.count}>
            {visibleItems.length}
            {visibleItems.length !== pkg.items.length
              ? ` / ${pkg.items.length}`
              : ""}{" "}
            {pkg.items.length === 1 ? "položka" : "položek"}
          </span>
        </button>
      </header>

      {open ? (
        <div className={styles.body}>
          {/* Video stays at the top and is never filtered out. */}
          <PackageVideoPanel projectId={projectId} videos={pkg.videos} />

          <PackageActions
            projectId={projectId}
            packageId={pkg.packageId}
            canGenerateVariants={pkg.canGenerateVariants}
          />

          {visibleItems.length > 0 ? (
            <div className={styles.items}>
              {visibleItems.map((entry) => (
                <ProjectContentCard
                  key={entry.id}
                  projectId={projectId}
                  entry={entry}
                  showActions
                  hideVideo
                  packageActionsInHeader
                />
              ))}
            </div>
          ) : (
            <p className={styles.noMatch}>
              Žádné výstupy neodpovídají filtru tohoto runu.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
