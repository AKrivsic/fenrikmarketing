import type { PackageStatusSummary as Summary } from "@/lib/api/project-review-admin";
import { languageCodeLabel } from "@/components/review/languageLabels";
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
  return (
    <dl className={styles.summary}>
      <div className={styles.group}>
        <dt className={styles.label}>Primary</dt>
        <dd className={styles.value}>
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
        </dd>
      </div>

      {summary.translations.length > 0 ? (
        <div className={styles.group}>
          <dt className={styles.label}>Translations</dt>
          <dd className={styles.value}>
            {summary.translations.map((t) => (
              <span
                key={t.language}
                className={`${styles.badge} ${TONE_CLASS[statusTone(t.status)]}`}
              >
                {languageCodeLabel(t.language)} {STATUS_LABEL[t.status]}
              </span>
            ))}
          </dd>
        </div>
      ) : null}

      {summary.videos.length > 0 ? (
        <div className={styles.group}>
          <dt className={styles.label}>Videos</dt>
          <dd className={styles.value}>
            {summary.videos.map((v) => (
              <span
                key={v.language}
                className={`${styles.badge} ${TONE_CLASS[videoTone(v.status)]}`}
              >
                {languageCodeLabel(v.language)}{" "}
                {v.status ? VIDEO_LABEL[v.status] : "none"}
              </span>
            ))}
          </dd>
        </div>
      ) : null}

      {summary.publishedCount > 0 ? (
        <div className={styles.group}>
          <dt className={styles.label}>Published</dt>
          <dd className={styles.value}>
            <span className={`${styles.badge} ${TONE_CLASS.green}`}>
              {summary.publishedCount} items
            </span>
          </dd>
        </div>
      ) : null}
    </dl>
  );
}
