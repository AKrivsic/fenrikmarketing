import { ProjectContentList } from "@/components/projects/ProjectContentList/ProjectContentList";
import { listProjectContentByStatus } from "@/lib/api/project-content-admin";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface ScheduledTabPageProps {
  params: Promise<{ id: string }>;
}

export default async function ScheduledTabPage({
  params,
}: ScheduledTabPageProps) {
  const { id } = await params;
  const entries = await listProjectContentByStatus(id, [
    "scheduled",
    "published",
  ]);

  return (
    <div className={styles.tab}>
      <ProjectContentList
        projectId={id}
        entries={entries}
        emptyText="Tento projekt zatím nemá žádný naplánovaný obsah."
      />
    </div>
  );
}
