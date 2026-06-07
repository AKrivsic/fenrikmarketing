import { PageHeader } from "@/components/PageHeader/PageHeader";
import styles from "./loading.module.css";

export default function DashboardLoading() {
  return (
    <div className={styles.page}>
      <PageHeader title="Dashboard" description="Přehled stavu AI obsahu." />
      <div className={styles.sections} aria-busy="true" aria-live="polite">
        <div className={styles.grid}>
          <div className={styles.statSkeleton} />
          <div className={styles.statSkeleton} />
          <div className={styles.statSkeleton} />
          <div className={styles.statSkeleton} />
          <div className={styles.statSkeleton} />
        </div>
        <div className={styles.blockSkeleton} />
      </div>
    </div>
  );
}
