import { ProjectContentList } from "@/components/projects/ProjectContentList/ProjectContentList";
import { ContentFlow } from "@/components/projects/ContentFlow/ContentFlow";
import { listProjectContentByStatus } from "@/lib/api/project-content-admin";
import { getProjectContentFlow } from "@/lib/api/project-workflow-admin";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface ApprovedTabPageProps {
  params: Promise<{ id: string }>;
}

export default async function ApprovedTabPage({
  params,
}: ApprovedTabPageProps) {
  const { id } = await params;
  const [entries, flow] = await Promise.all([
    listProjectContentByStatus(id, ["approved"]),
    getProjectContentFlow(id),
  ]);

  return (
    <div className={styles.tab}>
      <ContentFlow projectId={id} counts={flow} />
      <ProjectContentList
        projectId={id}
        entries={entries}
        emptyText="Tento projekt zatím nemá žádný schválený obsah."
      />
    </div>
  );
}
