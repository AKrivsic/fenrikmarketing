import { ProjectContentCard } from "@/components/projects/ProjectContentCard/ProjectContentCard";
import type { ProjectContentEntry } from "@/lib/api/project-content-admin";
import styles from "./ProjectContentList.module.css";

interface ProjectContentListProps {
  projectId: string;
  entries: ProjectContentEntry[];
  emptyText: string;
}

export function ProjectContentList({
  projectId,
  entries,
  emptyText,
}: ProjectContentListProps) {
  if (entries.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyText}>{emptyText}</p>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {entries.map((entry) => (
        <ProjectContentCard
          key={entry.id}
          projectId={projectId}
          entry={entry}
        />
      ))}
    </div>
  );
}
