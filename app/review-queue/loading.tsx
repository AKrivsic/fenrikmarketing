import { PageHeader } from "@/components/PageHeader/PageHeader";
import styles from "./loading.module.css";

export default function ReviewQueueLoading() {
  return (
    <div className={styles.page}>
      <PageHeader title="Review Queue" description="Obsah čekající na schválení." />
      <div className={styles.list} aria-busy="true" aria-live="polite">
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
      </div>
    </div>
  );
}
