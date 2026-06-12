import { ReviewGroupedList } from "@/components/review/ReviewGroupedList/ReviewGroupedList";
import {
  ReviewViewTabs,
  type ReviewView,
} from "@/components/review/ReviewViewTabs/ReviewViewTabs";
import {
  APPROVED_REVIEW_STATUSES,
  listProjectReviewGroups,
} from "@/lib/api/project-review-admin";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

// The review actions (generate / regenerate language variants) run AI
// localization inline via the shared Server Actions, so raise the page-level
// Server Action budget — mirrors /review-queue.
export const maxDuration = 300;

interface ReviewTabPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}

export default async function ReviewTabPage({
  params,
  searchParams,
}: ReviewTabPageProps) {
  const { id } = await params;
  const { view: viewParam } = await searchParams;
  const view: ReviewView = viewParam === "approved" ? "approved" : "pending";

  const groups = await listProjectReviewGroups(
    id,
    view === "approved" ? APPROVED_REVIEW_STATUSES : undefined,
  );

  return (
    <div className={styles.tab}>
      <ReviewViewTabs projectId={id} active={view} />
      <ReviewGroupedList projectId={id} groups={groups} />
    </div>
  );
}
