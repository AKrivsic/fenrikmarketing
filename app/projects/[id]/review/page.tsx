import { ProjectContentList } from "@/components/projects/ProjectContentList/ProjectContentList";
import { listProjectContentByStatus } from "@/lib/api/project-content-admin";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface ReviewTabPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReviewTabPage({ params }: ReviewTabPageProps) {
  const { id } = await params;
  const entries = await listProjectContentByStatus(id, ["draft", "in_review"]);

  return (
    <div className={styles.tab}>
      <ProjectContentList
        projectId={id}
        entries={entries}
        emptyText="Tento projekt nemá žádný obsah čekající na review."
      />
    </div>
  );
}
