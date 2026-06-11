import { ReviewGroupedList } from "@/components/review/ReviewGroupedList/ReviewGroupedList";
import { listProjectReviewGroups } from "@/lib/api/project-review-admin";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

// The review actions (generate / regenerate language variants) run AI
// localization inline via the shared Server Actions, so raise the page-level
// Server Action budget — mirrors /review-queue.
export const maxDuration = 300;

interface ReviewTabPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReviewTabPage({ params }: ReviewTabPageProps) {
  const { id } = await params;
  const groups = await listProjectReviewGroups(id);

  return (
    <div className={styles.tab}>
      <ReviewGroupedList projectId={id} groups={groups} />
    </div>
  );
}
