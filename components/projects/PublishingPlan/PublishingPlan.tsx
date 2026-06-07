import type { ProjectPublishingPlanEntry } from "@/lib/api/projects-admin";
import { PublishingScheduleItem } from "@/components/projects/PublishingScheduleItem/PublishingScheduleItem";
import styles from "./PublishingPlan.module.css";

interface PublishingPlanProps {
  entries: ProjectPublishingPlanEntry[];
}

export function PublishingPlan({ entries }: PublishingPlanProps) {
  if (entries.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyText}>
          Tento projekt zatím nemá žádný publikační plán.
        </p>
      </div>
    );
  }

  return (
    <ul className={styles.list}>
      {entries.map((entry) => (
        <PublishingScheduleItem key={entry.id} entry={entry} />
      ))}
    </ul>
  );
}
