import Link from "next/link";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { ProjectList } from "@/components/projects/ProjectList/ProjectList";
import { listProjectsForAdmin } from "@/lib/api/projects-admin";
import styles from "./page.module.css";

// Read live data per request: the admin-client query must not run at build time.
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await listProjectsForAdmin();

  return (
    <div className={styles.page}>
      <PageHeader title="Projects" description="Seznam projektů." />
      <div className={styles.actions}>
        <Link href="/projects/new" className={styles.newLink}>
          Nový projekt
        </Link>
      </div>
      <ProjectList projects={projects} />
    </div>
  );
}
