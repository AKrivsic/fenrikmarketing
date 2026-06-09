import { VideoPreview } from "@/components/review/VideoPreview/VideoPreview";
import { VideoDownloads } from "@/components/projects/VideoDownloads/VideoDownloads";
import type { ProjectVideoEntry } from "@/lib/api/project-content-admin";
import styles from "./ProjectVideoList.module.css";

interface ProjectVideoListProps {
  projectId: string;
  entries: ProjectVideoEntry[];
}

const EMPTY = "—";

export function ProjectVideoList({
  projectId,
  entries,
}: ProjectVideoListProps) {
  if (entries.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyText}>
          Tento projekt zatím nemá žádná videa.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {entries.map((entry) => (
        <article key={entry.id} className={styles.card}>
          <header className={styles.header}>
            <div className={styles.meta}>
              {entry.platform ? (
                <span className={styles.tag}>{entry.platform}</span>
              ) : null}
              {entry.format ? (
                <span className={styles.tag}>{entry.format}</span>
              ) : null}
              <span className={styles.tag}>{entry.provider}</span>
            </div>
            <span
              className={styles.status}
              data-status={entry.status}
            >
              {entry.status}
            </span>
          </header>

          <p className={styles.title}>{entry.itemTitle ?? EMPTY}</p>

          <VideoPreview
            videoUrl={entry.videoUrl}
            thumbnailUrl={entry.thumbnailUrl}
          />

          {entry.status === "failed" && entry.errorMessage ? (
            <p className={styles.error}>{entry.errorMessage}</p>
          ) : null}

          <VideoDownloads
            projectId={projectId}
            jobId={entry.id}
            hasMp4={entry.hasMp4}
            hasSubtitle={entry.hasSubtitle}
            hasThumbnail={entry.hasThumbnail}
          />
        </article>
      ))}
    </div>
  );
}
