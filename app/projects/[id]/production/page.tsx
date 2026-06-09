import { notFound } from "next/navigation";
import { ContentProductionPanel } from "@/components/projects/ContentProductionPanel/ContentProductionPanel";
import { getProjectForAdmin } from "@/lib/api/projects-admin";
import { getLatestProductionRunView } from "@/lib/api/production-run-admin";
import { parseContentControls } from "@/lib/projects/contentControls";
import { buildDefaultProductionConfig } from "@/lib/projects/productionRun";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface ProductionTabPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductionTabPage({
  params,
}: ProductionTabPageProps) {
  const { id } = await params;

  const project = await getProjectForAdmin(id);
  if (!project) {
    notFound();
  }

  const controls = parseContentControls(project.publishing_rules);
  const initialConfig = buildDefaultProductionConfig(
    controls,
    project.platforms,
  );
  const initialRun = await getLatestProductionRunView(id);

  return (
    <div className={styles.tab}>
      <section className={styles.block}>
        <h2 className={styles.title}>Content Production</h2>
        <p className={styles.note}>
          Nastavte počet packages (= témat = videí), vyberte platformy a jejich
          multipliery, a klikněte na GENERATE CONTENT. 1 package = 1 video,
          které se použije napříč vybranými platformami. Níže uvidíte, kolik
          videí a výstupů bylo požadováno a kolik už vzniklo.
        </p>
        <ContentProductionPanel
          projectId={id}
          initialConfig={initialConfig}
          initialRun={initialRun}
        />
      </section>
    </div>
  );
}
