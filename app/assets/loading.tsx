import { PageHeader } from "@/components/PageHeader/PageHeader";
import styles from "./loading.module.css";

export default function AssetsLoading() {
  return (
    <div className={styles.page}>
      <PageHeader title="Assets" description="Knihovna podkladů a výstupů." />
      <div className={styles.grid} aria-busy="true" aria-live="polite">
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
      </div>
    </div>
  );
}
