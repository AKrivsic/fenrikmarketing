import type { HistoryEntry as HistoryEntryModel } from "@/lib/api/history-admin";
import { HistoryEntry } from "@/components/history/HistoryEntry/HistoryEntry";
import styles from "./HistoryList.module.css";

interface HistoryListProps {
  entries: HistoryEntryModel[];
}

export function HistoryList({ entries }: HistoryListProps) {
  if (entries.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyText}>Zatím tu není žádná historie změn.</p>
      </div>
    );
  }

  return (
    <ul className={styles.list}>
      {entries.map((entry) => (
        <HistoryEntry key={entry.id} entry={entry} />
      ))}
    </ul>
  );
}
