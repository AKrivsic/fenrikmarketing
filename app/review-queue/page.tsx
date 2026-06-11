import { PageHeader } from "@/components/PageHeader/PageHeader";
import { ReviewExceptionsDashboard } from "@/components/review/ReviewExceptionsDashboard/ReviewExceptionsDashboard";
import { listReviewExceptions } from "@/lib/api/review-exceptions-admin";
import styles from "./page.module.css";

// Read live data per request: the admin-client query must not run at build time.
export const dynamic = "force-dynamic";

// Cross-project EXCEPTIONS dashboard. Review/approval happens in PROJECT context
// (/projects/[id]/review); this page is monitoring only — it surfaces failures
// and warnings across all projects and links each one back into its project.
// No workflow actions live here anymore.
export default async function ReviewQueuePage() {
  const data = await listReviewExceptions();

  return (
    <div className={styles.page}>
      <PageHeader
        title="Review Queue"
        description="Cross-project monitoring — failures a warnings napříč projekty."
      />
      <ReviewExceptionsDashboard data={data} />
    </div>
  );
}
