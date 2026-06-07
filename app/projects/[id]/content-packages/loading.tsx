import styles from "./loading.module.css";

export default function ContentPackagesLoading() {
  return (
    <div className={styles.list} aria-busy="true" aria-live="polite">
      <div className={styles.skeleton} />
      <div className={styles.skeleton} />
      <div className={styles.skeleton} />
    </div>
  );
}
