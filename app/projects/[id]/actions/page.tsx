import { ProjectActionsPanel } from "@/components/projects/ProjectActionsPanel/ProjectActionsPanel";
import { WorkflowTimeline } from "@/components/projects/WorkflowTimeline/WorkflowTimeline";
import { ContentFlow } from "@/components/projects/ContentFlow/ContentFlow";
import {
  getProjectContentFlow,
  getProjectWorkflowStatus,
} from "@/lib/api/project-workflow-admin";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface ActionsTabPageProps {
  params: Promise<{ id: string }>;
}

export default async function ActionsTabPage({ params }: ActionsTabPageProps) {
  const { id } = await params;
  const [status, flow] = await Promise.all([
    getProjectWorkflowStatus(id),
    getProjectContentFlow(id),
  ]);

  return (
    <div className={styles.tab}>
      <section className={styles.block}>
        <h2 className={styles.title}>Project Actions</h2>
        <p className={styles.note}>
          Ruční spuštění existujících workflow. Spuštění je asynchronní —
          potvrzujeme zařazení do fronty, výsledek se projeví v datech níže.
        </p>
        <ProjectActionsPanel projectId={id} status={status} />
      </section>

      <section className={styles.block}>
        <h2 className={styles.title}>Workflow Timeline</h2>
        <p className={styles.note}>
          Stav odvozený z existujících dat. Mezistavy „running“/„failed“ jsou
          dostupné jen u videí; ostatní fáze hlásí „completed“ podle existence
          výstupů.
        </p>
        <WorkflowTimeline status={status} />
      </section>

      <section className={styles.block}>
        <h2 className={styles.title}>Content Flow</h2>
        <p className={styles.note}>
          Kde se obsah nachází. Klikněte na fázi pro zobrazení obsahu.
        </p>
        <ContentFlow projectId={id} counts={flow} />
      </section>
    </div>
  );
}
