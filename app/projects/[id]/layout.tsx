import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { ProjectTabs } from "@/components/projects/ProjectTabs/ProjectTabs";
import { getProjectForAdmin } from "@/lib/api/projects-admin";
import styles from "./layout.module.css";

// Live data per request (admin client).
export const dynamic = "force-dynamic";

interface ProjectDetailLayoutProps {
  children: ReactNode;
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailLayout({
  children,
  params,
}: ProjectDetailLayoutProps) {
  const { id } = await params;
  const project = await getProjectForAdmin(id);

  if (!project) {
    notFound();
  }

  return (
    <div className={styles.page}>
      <PageHeader title={project.name} description="Detail projektu." />
      <ProjectTabs projectId={id} />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
