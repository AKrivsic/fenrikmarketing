import styles from "./loading.module.css";

export default function PublishingPlanLoading() {
  return (
    <div className={styles.list} aria-busy="true" aria-live="polite">
      <div className={styles.skeleton} />
      <div className={styles.skeleton} />
      <div className={styles.skeleton} />
    </div>
  );
}
