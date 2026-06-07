import { notFound } from "next/navigation";
import { ProjectBrain } from "@/components/projects/ProjectBrain/ProjectBrain";
import { ProjectBrainPanel } from "@/components/projects/ProjectBrainPanel/ProjectBrainPanel";
import { getProjectForAdmin } from "@/lib/api/projects-admin";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface ProjectBrainPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectBrainPage({
  params,
}: ProjectBrainPageProps) {
  const { id } = await params;
  const project = await getProjectForAdmin(id);

  if (!project) {
    notFound();
  }

  return (
    <div className={styles.tab}>
      <ProjectBrainPanel
        project={project}
        readView={<ProjectBrain project={project} />}
      />
    </div>
  );
}
