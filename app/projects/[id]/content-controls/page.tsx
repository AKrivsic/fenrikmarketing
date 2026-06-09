import { notFound } from "next/navigation";
import { ContentControlsForm } from "@/components/projects/ContentControlsForm/ContentControlsForm";
import { GenerationPlan } from "@/components/projects/GenerationPlan/GenerationPlan";
import { getProjectForAdmin } from "@/lib/api/projects-admin";
import {
  computeGenerationPlan,
  parseContentControls,
} from "@/lib/projects/contentControls";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface ContentControlsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ContentControlsPage({
  params,
}: ContentControlsPageProps) {
  const { id } = await params;
  const project = await getProjectForAdmin(id);

  if (!project) {
    notFound();
  }

  const controls = parseContentControls(project.publishing_rules);
  const plan = computeGenerationPlan(
    controls,
    project.platforms,
    project.enabled_languages,
  );

  return (
    <div className={styles.tab}>
      <GenerationPlan plan={plan} />
      <ContentControlsForm
        projectId={project.id}
        primaryLanguage={project.language}
        platforms={project.platforms}
        enabledLanguages={project.enabled_languages}
        controls={controls}
      />
    </div>
  );
}
