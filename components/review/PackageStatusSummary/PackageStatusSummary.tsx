import type { PackageStatusSummary as Summary } from "@/lib/api/project-review-admin";
import { languageCodeLabel } from "@/components/review/languageLabels";
import {
  VIDEO_STATE_LABEL,
  translationBadgeLabel,
  translationBadgeTone,
  videoStateTone,
} from "@/components/review/translationProgress";
import type { ApprovalStatus, JobStatus } from "@/lib/supabase/types";
import styles from "./PackageStatusSummary.module.css";

interface PackageStatusSummaryProps {
  summary: Summary;
}

type Tone = "green" | "yellow" | "red" | "muted";

const TONE_CLASS: Record<Tone, string> = {
  green: styles.toneGreen,
  yellow: styles.toneYellow,
  red: styles.toneRed,
  muted: styles.toneMuted,
};

const STATUS_LABEL: Record<ApprovalStatus, string> = {
  draft: "draft",
  in_review: "in review",
  approved: "approved",
  scheduled: "scheduled",
  published: "published",
  rejected: "rejected",
};

function statusTone(status: ApprovalStatus): Tone {
  if (status === "approved" || status === "published") return "green";
  if (status === "in_review" || status === "scheduled") return "yellow";
  if (status === "rejected") return "red";
  return "muted";
}

const VIDEO_LABEL: Record<JobStatus, string> = {
  queued: "queued",
  processing: "processing",
  completed: "complete",
  failed: "failed",
};

function videoTone(status: JobStatus | null): Tone {
  if (status === "completed") return "green";
  if (status === "queued" || status === "processing") return "yellow";
  if (status === "failed") return "red";
  return "muted";
}

// Compact, badge-only package status summary (no charts). Shows primary
// approval progress, per-language translation status, per-language video render
// status and the published count at a glance.
export function PackageStatusSummary({ summary }: PackageStatusSummaryProps) {
  const progress = summary.translationProgress;
  const progressBadge = translationBadgeLabel(progress);

  return (
    <div className={styles.root}>
    <div className={styles.summary}>
      <div className={styles.group}>
        <span className={styles.label}>Primary</span>
        <div className={styles.value}>
          <span
            className={`${styles.badge} ${
              summary.primaryTotal > 0 &&
              summary.primaryApproved === summary.primaryTotal
                ? TONE_CLASS.green
                : TONE_CLASS.muted
            }`}
          >
            {summary.primaryApproved}/{summary.primaryTotal} approved
          </span>
        </div>
      </div>

      {summary.translations.length > 0 ? (
        <div className={styles.group}>
          <span className={styles.label}>Translations</span>
          <div className={styles.value}>
            {summary.translations.map((t) => (
              <span
                key={t.language}
                className={`${styles.badge} ${TONE_CLASS[statusTone(t.status)]}`}
              >
                {languageCodeLabel(t.language)} {STATUS_LABEL[t.status]}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {summary.videos.length > 0 ? (
        <div className={styles.group}>
          <span className={styles.label}>Videos</span>
          <div className={styles.value}>
            {summary.videos.map((v) => (
              <span
                key={v.language}
                className={`${styles.badge} ${TONE_CLASS[videoTone(v.status)]}`}
              >
                {languageCodeLabel(v.language)}{" "}
                {v.status ? VIDEO_LABEL[v.status] : "none"}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {summary.publishedCount > 0 ? (
        <div className={styles.group}>
          <span className={styles.label}>Published</span>
          <div className={styles.value}>
            <span className={`${styles.badge} ${TONE_CLASS.green}`}>
              {summary.publishedCount} items
            </span>
          </div>
        </div>
      ) : null}
    </div>

      {/* Translation Progress — per target language: text coverage + video
          render state. Video platforms only (LinkedIn / X are excluded by the
          data layer). Hidden when the package has nothing to translate. */}
      {progressBadge && progress.languages.length > 0 ? (
        <div className={styles.progress}>
          <div className={styles.progressHead}>
            <span className={styles.label}>Translation Progress</span>
            <span
              className={`${styles.badge} ${
                TONE_CLASS[translationBadgeTone(progress.overall)]
              }`}
            >
              {progressBadge}
            </span>
          </div>
          <ul className={styles.progressList}>
            {progress.languages.map((lang) => (
              <li key={lang.language} className={styles.progressRow}>
                <span className={styles.progressLang}>
                  {languageCodeLabel(lang.language)}
                </span>
                <span className={styles.progressText}>
                  Text {lang.textDone}/{lang.textExpected}
                </span>
                <span
                  className={`${styles.badge} ${
                    TONE_CLASS[videoStateTone(lang.video)]
                  }`}
                >
                  Video {VIDEO_STATE_LABEL[lang.video]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
