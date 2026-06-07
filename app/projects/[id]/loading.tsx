import styles from "./loading.module.css";

export default function ProjectDetailLoading() {
  return (
    <div className={styles.page} aria-busy="true" aria-live="polite">
      <div className={styles.headerSkeleton} />
      <div className={styles.tabsSkeleton} />
      <div className={styles.bodySkeleton} />
    </div>
  );
}
