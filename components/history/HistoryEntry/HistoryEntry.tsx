import type { HistoryEntry as HistoryEntryModel } from "@/lib/api/history-admin";
import styles from "./HistoryEntry.module.css";

interface HistoryEntryProps {
  entry: HistoryEntryModel;
}

const EMPTY = "—";

export function HistoryEntry({ entry }: HistoryEntryProps) {
  const createdAt = new Date(entry.createdAt).toLocaleString();
  const target = entry.itemTitle ?? entry.packageTitle ?? EMPTY;

  return (
    <li className={styles.entry}>
      <div className={styles.meta}>
        <span className={styles.time}>{createdAt}</span>
        <span className={styles.tag}>{entry.projectName ?? EMPTY}</span>
        <span className={styles.version}>v{entry.versionNo}</span>
      </div>

      <p className={styles.target}>{target}</p>
      <p className={styles.note}>{entry.changeNote ?? EMPTY}</p>
    </li>
  );
}
