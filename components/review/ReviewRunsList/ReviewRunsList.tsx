import { ReviewRunCard } from "@/components/review/ReviewRunCard/ReviewRunCard";
import type { ReviewRunCard as ReviewRunCardData } from "@/lib/api/review-runs-admin";
import styles from "./ReviewRunsList.module.css";

interface ReviewRunsListProps {
  runs: ReviewRunCardData[];
}

export function ReviewRunsList({ runs }: ReviewRunsListProps) {
  if (runs.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyText}>Zatím žádné production runs.</p>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {runs.map((run) => (
        <ReviewRunCard key={run.id} run={run} />
      ))}
    </div>
  );
}
