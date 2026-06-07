import type { ProjectPublishingPlanEntry } from "@/lib/api/projects-admin";
import styles from "./PublishingScheduleItem.module.css";

interface PublishingScheduleItemProps {
  entry: ProjectPublishingPlanEntry;
}

const EMPTY = "—";

export function PublishingScheduleItem({ entry }: PublishingScheduleItemProps) {
  const scheduledAt = new Date(entry.scheduledAt).toLocaleString();

  return (
    <li className={styles.item}>
      <div className={styles.meta}>
        <span className={styles.time}>{scheduledAt}</span>
        <span className={styles.tag}>{entry.platform}</span>
        <span className={styles.tag}>{entry.status}</span>
        {entry.itemFormat ? (
          <span className={styles.tag}>{entry.itemFormat}</span>
        ) : null}
      </div>

      <p className={styles.title}>{entry.itemTitle ?? EMPTY}</p>
    </li>
  );
}
