import { ProjectContentList } from "@/components/projects/ProjectContentList/ProjectContentList";
import { ContentFlow } from "@/components/projects/ContentFlow/ContentFlow";
import { listProjectContentByStatus } from "@/lib/api/project-content-admin";
import { getProjectContentFlow } from "@/lib/api/project-workflow-admin";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface PublishedTabPageProps {
  params: Promise<{ id: string }>;
}

// Read-only record of items the user has manually marked published (after the
// Metricool copy/paste flow). No approve / reject / regenerate / variant
// actions — ProjectContentList is rendered without showActions/showVariantAction.
export default async function PublishedTabPage({
  params,
}: PublishedTabPageProps) {
  const { id } = await params;
  const [entries, flow] = await Promise.all([
    listProjectContentByStatus(id, ["published"]),
    getProjectContentFlow(id),
  ]);

  return (
    <div className={styles.tab}>
      <ContentFlow projectId={id} counts={flow} />
      <ProjectContentList
        projectId={id}
        entries={entries}
        emptyText="Tento projekt zatím nemá žádný publikovaný obsah."
      />
    </div>
  );
}
