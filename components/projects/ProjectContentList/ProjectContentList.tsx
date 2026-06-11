import { ProjectContentCard } from "@/components/projects/ProjectContentCard/ProjectContentCard";
import type { ProjectContentEntry } from "@/lib/api/project-content-admin";
import styles from "./ProjectContentList.module.css";

interface ProjectContentListProps {
  projectId: string;
  entries: ProjectContentEntry[];
  emptyText: string;
  // Forwarded to each card to enable the review/approval controls. Off by
  // default so read-only tabs (Approved / Scheduled) are unaffected.
  showActions?: boolean;
  // Forwarded to each card to expose ONLY the "Generate language variants"
  // action on eligible primary cards while keeping the tab otherwise read-only.
  showVariantAction?: boolean;
}

export function ProjectContentList({
  projectId,
  entries,
  emptyText,
  showActions = false,
  showVariantAction = false,
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
          showActions={showActions}
          showVariantAction={showVariantAction}
        />
      ))}
    </div>
  );
}
