"use client";

import { useState } from "react";
import { ReviewRunCard } from "@/components/review/ReviewRunCard/ReviewRunCard";
import { ReviewPackageSection } from "@/components/review/ReviewPackageSection/ReviewPackageSection";
import {
  DEFAULT_RUN_FILTER,
  LANGUAGE_FILTER_OPTIONS,
  PLATFORM_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
  toggleFilterValue,
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

  function toggle<K extends keyof RunFilterState>(
    key: K,
    value: RunFilterState[K][number],
  ) {
    setFilter((prev) => ({
      ...prev,
      [key]: toggleFilterValue(
        prev[key] as RunFilterState[K][number][],
        value,
      ),
    }));
  }

  function clear<K extends keyof RunFilterState>(key: K) {
    setFilter((prev) => ({ ...prev, [key]: [] }));
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
                <ChipFilter
                  label="Platform"
                  selected={filter.platforms}
                  options={PLATFORM_FILTER_OPTIONS}
                  onToggle={(value) => toggle("platforms", value)}
                  onClear={() => clear("platforms")}
                />
                <ChipFilter
                  label="Language"
                  selected={filter.languages}
                  options={LANGUAGE_FILTER_OPTIONS}
                  onToggle={(value) => toggle("languages", value)}
                  onClear={() => clear("languages")}
                />
                <ChipFilter
                  label="Status"
                  selected={filter.statuses}
                  options={STATUS_FILTER_OPTIONS}
                  onToggle={(value) => toggle("statuses", value)}
                  onClear={() => clear("statuses")}
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

// Multi-select chip group. The "All" chip is active when nothing specific is
// selected (= no filtering); clicking it clears the dimension. Selecting one or
// more value chips filters to ANY of them.
function ChipFilter<T extends string>({
  label,
  selected,
  options,
  onToggle,
  onClear,
}: {
  label: string;
  selected: readonly T[];
  options: { value: T; label: string }[];
  onToggle: (value: T) => void;
  onClear: () => void;
}) {
  const allActive = selected.length === 0;
  return (
    <div className={styles.filter}>
      <span className={styles.filterLabel}>{label}</span>
      <div className={styles.chips} role="group" aria-label={label}>
        <button
          type="button"
          className={`${styles.chip} ${allActive ? styles.chipActive : ""}`}
          aria-pressed={allActive}
          onClick={onClear}
        >
          All
        </button>
        {options.map((option) => {
          const active = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              className={`${styles.chip} ${active ? styles.chipActive : ""}`}
              aria-pressed={active}
              onClick={() => onToggle(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
