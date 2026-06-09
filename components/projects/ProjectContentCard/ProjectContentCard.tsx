import { VideoPreview } from "@/components/review/VideoPreview/VideoPreview";
import { VideoDownloads } from "@/components/projects/VideoDownloads/VideoDownloads";
import type { ProjectContentEntry } from "@/lib/api/project-content-admin";
import styles from "./ProjectContentCard.module.css";

interface ProjectContentCardProps {
  projectId: string;
  entry: ProjectContentEntry;
}

const EMPTY = "—";

export function ProjectContentCard({
  projectId,
  entry,
}: ProjectContentCardProps) {
  const hasHashtags = entry.hashtags.length > 0;
  const languageBadge = `${entry.isLanguageVariant ? "Variant" : "Primary"} · ${entry.language}`;

  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <div className={styles.meta}>
          <span className={styles.tag}>{entry.platform}</span>
          <span className={styles.tag}>{entry.format}</span>
          <span className={styles.tag}>{languageBadge}</span>
        </div>
        <div className={styles.statuses}>
          <span className={styles.workflowStatus}>Workflow: {entry.status}</span>
          {entry.videoStatus ? (
            <span className={styles.videoStatus}>
              Video: {entry.videoStatus}
            </span>
          ) : (
            <span className={styles.videoStatusMuted}>Video: none</span>
          )}
        </div>
      </header>

      {entry.title ? <h3 className={styles.title}>{entry.title}</h3> : null}

      <VideoPreview
        videoUrl={entry.videoUrl}
        thumbnailUrl={entry.thumbnailUrl}
      />

      <div className={styles.field}>
        <span className={styles.label}>Caption</span>
        <p className={styles.value}>{entry.caption ?? EMPTY}</p>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Hashtags</span>
        {hasHashtags ? (
          <ul className={styles.hashtags}>
            {entry.hashtags.map((tag) => (
              <li key={tag} className={styles.hashtag}>
                {tag.startsWith("#") ? tag : `#${tag}`}
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.value}>{EMPTY}</p>
        )}
      </div>

      <div className={styles.field}>
        <span className={styles.label}>CTA</span>
        <p className={styles.value}>{entry.cta ?? EMPTY}</p>
      </div>

      <VideoDownloads
        projectId={projectId}
        jobId={entry.videoJobId}
        hasMp4={entry.videoUrl !== null}
        hasSubtitle={entry.subtitleUrl !== null}
        hasThumbnail={entry.thumbnailUrl !== null}
      />
    </article>
  );
}
