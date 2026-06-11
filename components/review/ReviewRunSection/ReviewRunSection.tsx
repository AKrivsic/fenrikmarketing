"use client";

import { useState } from "react";
import { ReviewRunCard } from "@/components/review/ReviewRunCard/ReviewRunCard";
import { ReviewPackageSection } from "@/components/review/ReviewPackageSection/ReviewPackageSection";
import {
  DEFAULT_RUN_FILTER,
  LANGUAGE_FILTER_OPTIONS,
  PLATFORM_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
  ALL,
  type RunFilterState,
} from "@/components/review/reviewFilters";
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
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "Run";
  return `Run · ${date.toLocaleString("cs-CZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function ReviewRunSection({
  projectId,
  group,
  defaultOpen,
}: ReviewRunSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [filter, setFilter] = useState<RunFilterState>(DEFAULT_RUN_FILTER);

  const run = group.run;
  const packagesWithItems = group.packages.filter(
    (pkg) => pkg.items.length > 0,
  );

  function update<K extends keyof RunFilterState>(
    key: K,
    value: RunFilterState[K],
  ) {
    setFilter((prev) => ({ ...prev, [key]: value }));
  }

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
            <>
              <div className={styles.filters}>
                <Filter
                  label="Platform"
                  value={filter.platform}
                  options={PLATFORM_FILTER_OPTIONS}
                  onChange={(value) =>
                    update("platform", value as RunFilterState["platform"])
                  }
                />
                <Filter
                  label="Language"
                  value={filter.language}
                  options={LANGUAGE_FILTER_OPTIONS}
                  onChange={(value) =>
                    update("language", value as RunFilterState["language"])
                  }
                />
                <Filter
                  label="Status"
                  value={filter.status}
                  options={STATUS_FILTER_OPTIONS}
                  onChange={(value) =>
                    update("status", value as RunFilterState["status"])
                  }
                />
              </div>

              <div className={styles.packages}>
                {packagesWithItems.map((pkg, index) => (
                  <ReviewPackageSection
                    key={pkg.packageId ?? `no-package-${index}`}
                    projectId={projectId}
                    pkg={pkg}
                    filter={filter}
                    defaultOpen={index === 0}
                  />
                ))}
              </div>
            </>
          ) : (
            <p className={styles.runEmpty}>
              Žádný obsah čekající na review v tomto runu.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}

function Filter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className={styles.filter}>
      <span className={styles.filterLabel}>{label}</span>
      <select
        className={styles.select}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value={ALL}>All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
