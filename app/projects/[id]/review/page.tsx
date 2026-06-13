import { ReviewGroupedListClient } from "@/components/review/ReviewGroupedListClient/ReviewGroupedListClient";
import { listProjectReviewGroups } from "@/lib/api/project-review-admin";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

// The review actions (generate / regenerate translations) run AI localization
// inline via the shared Server Actions, so raise the page-level Server Action
// budget.
export const maxDuration = 300;

interface ReviewTabPageProps {
  params: Promise<{ id: string }>;
}

// Review UX V2 — the single content workspace. One page shows every production
// run grouped as Run → Package, and inside each package the Primary (EN),
// Translations (by language) and Published sections live together. No more
// Pending / Approved status views: a package is always shown whole.
export default async function ReviewTabPage({ params }: ReviewTabPageProps) {
  const { id } = await params;
  const groups = await listProjectReviewGroups(id);

  return (
    <div className={styles.tab}>
      <ReviewGroupedListClient projectId={id} groups={groups} />
    </div>
  );
}
