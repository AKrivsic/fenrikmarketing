import { PageHeader } from "@/components/PageHeader/PageHeader";
import { ReviewQueueList } from "@/components/review/ReviewQueueList/ReviewQueueList";
import { listReviewQueueItems } from "@/lib/api/review-queue";
import styles from "./page.module.css";

// Read live data per request: the admin-client query must not run at build time.
export const dynamic = "force-dynamic";

// Task 1 — the language-variant Server Actions (generate / regenerate) run AI
// localization inline; raise the page-level Server Action budget accordingly.
export const maxDuration = 300;

// Production Runs are reviewed in PROJECT context (/projects/[id]/review): QA and
// approval are project-scoped, so a cross-project run list here would only cause
// confusion. This global page stays focused on the cross-project review queue.
export default async function ReviewQueuePage() {
  const items = await listReviewQueueItems();

  return (
    <div className={styles.page}>
      <PageHeader title="Review Queue" description="Obsah čekající na schválení." />
      <ReviewQueueList items={items} />
    </div>
  );
}
