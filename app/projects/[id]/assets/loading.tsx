import styles from "./loading.module.css";

export default function ProjectAssetsLoading() {
  return (
    <div className={styles.grid} aria-busy="true" aria-live="polite">
      <div className={styles.skeleton} />
      <div className={styles.skeleton} />
      <div className={styles.skeleton} />
      <div className={styles.skeleton} />
    </div>
  );
}
