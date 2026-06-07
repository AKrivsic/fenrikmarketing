import { ReviewCard } from "@/components/review/ReviewCard/ReviewCard";
import type { ReviewQueueItem } from "@/lib/api/review-queue";
import styles from "./ReviewQueueList.module.css";

interface ReviewQueueListProps {
  items: ReviewQueueItem[];
}

export function ReviewQueueList({ items }: ReviewQueueListProps) {
  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyText}>Žádné položky k review.</p>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {items.map((item) => (
        <ReviewCard key={item.id} item={item} />
      ))}
    </div>
  );
}
