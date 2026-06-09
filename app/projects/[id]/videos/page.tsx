import { ProjectVideoList } from "@/components/projects/ProjectVideoList/ProjectVideoList";
import { listProjectVideoJobs } from "@/lib/api/project-content-admin";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface VideosTabPageProps {
  params: Promise<{ id: string }>;
}

export default async function VideosTabPage({ params }: VideosTabPageProps) {
  const { id } = await params;
  const entries = await listProjectVideoJobs(id);

  return (
    <div className={styles.tab}>
      <ProjectVideoList projectId={id} entries={entries} />
    </div>
  );
}
