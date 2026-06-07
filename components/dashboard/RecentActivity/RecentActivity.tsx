import type { HistoryEntry } from "@/lib/api/history-admin";
import styles from "./RecentActivity.module.css";

interface RecentActivityProps {
  entries: HistoryEntry[];
}

const EMPTY = "—";

export function RecentActivity({ entries }: RecentActivityProps) {
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Poslední aktivita</h2>

      {entries.length === 0 ? (
        <p className={styles.empty}>Zatím tu není žádná aktivita.</p>
      ) : (
        <ul className={styles.list}>
          {entries.map((entry) => {
            const createdAt = new Date(entry.createdAt).toLocaleString();
            const target = entry.itemTitle ?? entry.packageTitle ?? EMPTY;
            return (
              <li key={entry.id} className={styles.item}>
                <span className={styles.time}>{createdAt}</span>
                <span className={styles.project}>
                  {entry.projectName ?? EMPTY}
                </span>
                <span className={styles.target}>{target}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
