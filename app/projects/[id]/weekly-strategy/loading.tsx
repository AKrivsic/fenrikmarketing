import styles from "./loading.module.css";

export default function WeeklyStrategyLoading() {
  return (
    <div className={styles.tab} aria-busy="true" aria-live="polite">
      <div className={styles.skeleton} />
    </div>
  );
}
