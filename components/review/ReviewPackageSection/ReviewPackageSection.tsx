"use client";

import { useEffect, useState } from "react";
import { ProjectContentCard } from "@/components/projects/ProjectContentCard/ProjectContentCard";
import { PackageVideoPanel } from "@/components/review/PackageVideoPanel/PackageVideoPanel";
import { PackageActions } from "@/components/review/PackageActions/PackageActions";
import { PackageStatusSummary } from "@/components/review/PackageStatusSummary/PackageStatusSummary";
import { PackageIdCopy } from "@/components/common/PackageIdCopy/PackageIdCopy";
import { languageCodeLabel, languageName } from "@/components/review/languageLabels";
import {
  translationBadgeLabel,
  translationBadgeTone,
} from "@/components/review/translationProgress";
import type {
  LanguageTranslationBlock,
  ReviewPackageGroup,
} from "@/lib/api/project-review-admin";
import type { ProjectContentEntry } from "@/lib/api/project-content-admin";
import type { JobStatus } from "@/lib/supabase/types";
import styles from "./ReviewPackageSection.module.css";

const REVIEW_RENDER_DEBUG =
  process.env.NODE_ENV === "development" ||
  process.env.REVIEW_RENDER_DEBUG === "1";

interface ReviewPackageSectionProps {
  projectId: string;
  pkg: ReviewPackageGroup;
  defaultOpen: boolean;
}

const HEADER_BADGE_CLASS: Record<"green" | "yellow" | "red" | "muted", string> =
  {
    green: styles.videoBadgeGreen,
    yellow: styles.videoBadgeYellow,
    red: styles.videoBadgeRed,
    muted: styles.videoBadgeMuted,
  };

const VIDEO_STATUS_LABEL: Record<JobStatus, string> = {
  queued: "queued",
  processing: "processing",
  completed: "complete",
  failed: "failed",
};

function videoStatusClass(status: JobStatus | null): string {
  if (status === "completed") return styles.videoBadgeGreen;
  if (status === "queued" || status === "processing") {
    return styles.videoBadgeYellow;
  }
  if (status === "failed") return styles.videoBadgeRed;
  return styles.videoBadgeMuted;
}

// Review UX V2 — a single package shown whole: Primary (EN), Translations (by
// language) and Published, with the package videos (EN / DE / FR / ES / IT) in
// one pill panel so a translated video is always visibly attached to its
// package.
export function ReviewPackageSection({
  projectId,
  pkg,
  defaultOpen,
}: ReviewPackageSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  const progress = pkg.summary.translationProgress;
  const progressBadge = translationBadgeLabel(progress);

  useEffect(() => {
    if (!REVIEW_RENDER_DEBUG) return;
    console.info("[review-render] ReviewPackageSection mount", {
      packageId: pkg.packageId,
      title: pkg.title,
      open: defaultOpen,
      primaryItems: pkg.primaryItems.length,
      translationLanguages: pkg.translations.length,
      publishedItems: pkg.publishedItems.length,
      videos: pkg.videos.length,
    });
  }, [
    pkg.packageId,
    pkg.title,
    defaultOpen,
    pkg.primaryItems.length,
    pkg.translations.length,
    pkg.publishedItems.length,
    pkg.videos.length,
  ]);

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
          {progressBadge ? (
            <span
              className={`${styles.headerBadge} ${
                HEADER_BADGE_CLASS[translationBadgeTone(progress.overall)]
              }`}
            >
              {progressBadge}
            </span>
          ) : null}
        </button>
      </header>

      {open ? (
        <div className={styles.body}>
          {pkg.packageId ? <PackageIdCopy packageId={pkg.packageId} /> : null}
          <PackageStatusSummary summary={pkg.summary} />

          {/* All package videos (EN + translations) in one pill panel. */}
          <PackageVideoPanel projectId={projectId} videos={pkg.videos} />

          <PackageActions
            projectId={projectId}
            packageId={pkg.packageId}
            canGenerateVariants={pkg.canGenerateVariants}
            hasTranslations={pkg.hasTranslations}
            translationReason={pkg.translationReason}
          />

          {/* A) Primary (EN) ------------------------------------------------ */}
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Primary (EN)</h4>
            {pkg.primaryItems.length > 0 ? (
              <div className={styles.items}>
                {pkg.primaryItems.map((entry) => (
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
              <p className={styles.empty}>Žádný primary obsah k review.</p>
            )}
          </section>

          {/* B) Translations ------------------------------------------------ */}
          {pkg.translations.length > 0 ? (
            <section className={styles.section}>
              <h4 className={styles.sectionTitle}>Translations</h4>
              <div className={styles.languageBlocks}>
                {pkg.translations.map((block) => (
                  <LanguageBlock
                    key={block.language}
                    projectId={projectId}
                    block={block}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {/* C) Published --------------------------------------------------- */}
          {pkg.publishedItems.length > 0 ? (
            <PublishedSection
              projectId={projectId}
              items={pkg.publishedItems}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// One collapsible language block inside the Translations section. Shows the
// localized video render status in the header and the video-platform content
// items (TikTok / Instagram / YouTube) below.
function LanguageBlock({
  projectId,
  block,
}: {
  projectId: string;
  block: LanguageTranslationBlock;
}) {
  const [open, setOpen] = useState(false);
  const videoStatus = block.video?.status ?? null;

  return (
    <div className={styles.languageBlock}>
      <button
        type="button"
        className={styles.languageToggle}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.caret} aria-hidden="true">
          {open ? "▼" : "▶"}
        </span>
        <span className={styles.languageName}>
          {languageName(block.language)}
        </span>
        <span className={styles.languageCode}>
          {languageCodeLabel(block.language)}
        </span>
        <span
          className={`${styles.videoBadge} ${videoStatusClass(videoStatus)}`}
        >
          Video: {videoStatus ? VIDEO_STATUS_LABEL[videoStatus] : "none"}
        </span>
      </button>

      {open ? (
        <div className={styles.items}>
          {block.items.map((entry) => (
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
      ) : null}
    </div>
  );
}

// Published items inside the package, read-only, collapsed by default so they
// don't bury the active review work.
function PublishedSection({
  projectId,
  items,
}: {
  projectId: string;
  items: ProjectContentEntry[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className={styles.section}>
      <button
        type="button"
        className={styles.publishedToggle}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.caret} aria-hidden="true">
          {open ? "▼" : "▶"}
        </span>
        <span className={styles.sectionTitle}>Published</span>
        <span className={styles.publishedCount}>{items.length}</span>
      </button>

      {open ? (
        <div className={styles.items}>
          {items.map((entry) => (
            <ProjectContentCard
              key={entry.id}
              projectId={projectId}
              entry={entry}
              hideVideo
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
