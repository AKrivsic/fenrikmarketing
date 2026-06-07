import { PageHeader } from "@/components/PageHeader/PageHeader";
import styles from "./loading.module.css";

export default function ProjectsLoading() {
  return (
    <div className={styles.page}>
      <PageHeader title="Projects" description="Seznam projektů." />
      <div className={styles.list} aria-busy="true" aria-live="polite">
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
      </div>
    </div>
  );
}
