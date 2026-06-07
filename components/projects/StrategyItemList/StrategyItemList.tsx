import type { ProjectWeeklyStrategyItem } from "@/lib/api/projects-admin";
import styles from "./StrategyItemList.module.css";

interface StrategyItemListProps {
  items: ProjectWeeklyStrategyItem[];
}

const EMPTY = "—";

// Read-only list of content_strategy_items for the selected strategy.
export function StrategyItemList({ items }: StrategyItemListProps) {
  if (items.length === 0) {
    return <p className={styles.empty}>Strategie zatím nemá žádné položky.</p>;
  }

  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <li key={item.id} className={styles.item}>
          <div className={styles.meta}>
            <span className={styles.tag}>{item.platform}</span>
            <span className={styles.tag}>{item.format}</span>
            {item.funnelStage ? (
              <span className={styles.tag}>
                {item.funnelStage.replace(/_/g, " ")}
              </span>
            ) : null}
            <span className={styles.priority}>Priorita: {item.priority}</span>
          </div>

          <p className={styles.topic}>{item.topic ?? EMPTY}</p>

          {item.angle ? (
            <p className={styles.angle}>{item.angle}</p>
          ) : null}

          {item.day ? <span className={styles.day}>{item.day}</span> : null}
        </li>
      ))}
    </ul>
  );
}
