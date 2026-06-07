import { PageHeader } from "@/components/PageHeader/PageHeader";
import styles from "./loading.module.css";

export default function HistoryLoading() {
  return (
    <div className={styles.page}>
      <PageHeader title="History" description="Historie změn obsahu." />
      <div className={styles.list} aria-busy="true" aria-live="polite">
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
      </div>
    </div>
  );
}
