import { ProjectContentList } from "@/components/projects/ProjectContentList/ProjectContentList";
import { ReviewRunsList } from "@/components/review/ReviewRunsList/ReviewRunsList";
import { listProjectContentByStatus } from "@/lib/api/project-content-admin";
import { listReviewRunsForProject } from "@/lib/api/review-runs-admin";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface ReviewTabPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReviewTabPage({ params }: ReviewTabPageProps) {
  const { id } = await params;
  const [entries, runs] = await Promise.all([
    listProjectContentByStatus(id, ["draft", "in_review"]),
    listReviewRunsForProject(id),
  ]);

  return (
    <div className={styles.tab}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Production Runs</h2>
        <ReviewRunsList runs={runs} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Review Queue</h2>
        <ProjectContentList
          projectId={id}
          entries={entries}
          emptyText="Tento projekt nemá žádný obsah čekající na review."
        />
      </section>
    </div>
  );
}
