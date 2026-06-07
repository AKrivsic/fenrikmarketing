import { PageHeader } from "@/components/PageHeader/PageHeader";
import { ReviewQueueList } from "@/components/review/ReviewQueueList/ReviewQueueList";
import { listReviewQueueItems } from "@/lib/api/review-queue";
import styles from "./page.module.css";

// Read live data per request: the admin-client query must not run at build time.
export const dynamic = "force-dynamic";

export default async function ReviewQueuePage() {
  const items = await listReviewQueueItems();

  return (
    <div className={styles.page}>
      <PageHeader title="Review Queue" description="Obsah čekající na schválení." />
      <ReviewQueueList items={items} />
    </div>
  );
}
